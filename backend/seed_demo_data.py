from __future__ import annotations

from dataclasses import dataclass
from string import ascii_uppercase

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database.base import Base
from app.database.connection import SessionLocal, engine
from app.models import attendance, room, student, user
from app.models.room import Room, RoomStatus
from app.models.student import Student, StudentStatus
from app.services.room_service import status_for_occupancy

DEMO_STUDENT_PREFIX = "DEMO-STU-"
DEMO_EMAIL_DOMAIN = "smartstay-demo.example.com"
STUDENT_COUNT = 400

FIRST_NAMES = [
    "Aarav", "Aanya", "Aditya", "Anika", "Arjun", "Avni", "Dev", "Diya",
    "Eshan", "Ira", "Kabir", "Kavya", "Krish", "Meera", "Nikhil", "Nisha",
    "Pranav", "Riya", "Rohan", "Saanvi", "Sahil", "Sakshi", "Tara", "Vihaan",
]
LAST_NAMES = [
    "Bose", "Chandra", "Das", "Iyer", "Jain", "Joshi", "Kapoor", "Khan",
    "Malhotra", "Menon", "Mishra", "Nair", "Patel", "Rao", "Reddy", "Shah",
    "Sharma", "Singh", "Verma", "Mehta",
]
COURSES = [
    "Computer Science",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Business Administration",
    "Architecture",
    "Data Science",
    "Biotechnology",
]
YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
GENDERS = ["Female", "Male", "Non-binary"]


def demo_email(student_id: str) -> str:
    suffix = student_id.removeprefix(DEMO_STUDENT_PREFIX)
    return f"student{suffix}@{DEMO_EMAIL_DOMAIN}"


@dataclass(frozen=True)
class RoomPlan:
    room_number: str
    block: str
    floor: int
    room_type: str
    capacity: int
    status: RoomStatus
    occupancy: int


def room_plans() -> list[RoomPlan]:
    plans: list[RoomPlan] = []
    room_index = 0
    maintenance_rooms = {("A", 12), ("C", 12), ("F", 12), ("H", 16)}

    for block_index, block in enumerate(ascii_uppercase[:8]):
        room_count = 12 if block != "H" else 16
        for room_number_suffix in range(101, 101 + room_count):
            room_index += 1
            room_number = f"{block}-{room_number_suffix}"
            floor = ((room_number_suffix - 101) // 4) + 1
            if room_index % 19 == 0:
                capacity = 2
            elif room_index % 13 == 0:
                capacity = 3
            else:
                capacity = 4
            room_type = {2: "Twin sharing", 3: "Triple sharing", 4: "Quad sharing"}[capacity]
            if (block, room_number_suffix - 100) in maintenance_rooms:
                plans.append(RoomPlan(room_number, f"Block {block}", floor, room_type, capacity, RoomStatus.MAINTENANCE, 0))
                continue
            plans.append(RoomPlan(room_number, f"Block {block}", floor, room_type, capacity, RoomStatus.AVAILABLE, 0))

    available_plans = [plan for plan in plans if plan.status != RoomStatus.MAINTENANCE]
    empty_count = 8
    partial_count = 16
    for position, plan in enumerate(available_plans):
        if position < empty_count:
            occupancy = 0
        elif position < empty_count + partial_count:
            occupancy = max(1, plan.capacity - 1)
        else:
            occupancy = plan.capacity
        plans[plans.index(plan)] = RoomPlan(
            plan.room_number,
            plan.block,
            plan.floor,
            plan.room_type,
            plan.capacity,
            RoomStatus.MAINTENANCE if plan.status == RoomStatus.MAINTENANCE else status_for_occupancy(occupancy, plan.capacity),
            occupancy,
        )
    return plans


def build_students(room_numbers: list[str]) -> list[Student]:
    records: list[Student] = []
    allocation_index = 0
    room_slots: list[str] = []
    plans_by_room = {plan.room_number: plan for plan in room_plans()}
    for room_number in room_numbers:
        room_slots.extend([room_number] * plans_by_room[room_number].occupancy)

    for index in range(1, STUDENT_COUNT + 1):
        first_name = FIRST_NAMES[(index - 1) % len(FIRST_NAMES)]
        last_name = LAST_NAMES[((index - 1) // len(FIRST_NAMES)) % len(LAST_NAMES)]
        full_name = f"{first_name} {last_name}"
        if index % 37 == 0:
            student_status = StudentStatus.INACTIVE
        elif index % 41 == 0:
            student_status = StudentStatus.ON_LEAVE
        else:
            student_status = StudentStatus.ACTIVE

        room_number = None
        if student_status == StudentStatus.ACTIVE and allocation_index < len(room_slots):
            room_number = room_slots[allocation_index]
            allocation_index += 1

        records.append(Student(
            student_id=f"{DEMO_STUDENT_PREFIX}{index:04d}",
            full_name=full_name,
            email=demo_email(f"{DEMO_STUDENT_PREFIX}{index:04d}"),
            phone=f"+1-202-555-{index:04d}",
            course=COURSES[(index - 1) % len(COURSES)],
            year=YEARS[(index - 1) % len(YEARS)],
            gender=GENDERS[(index - 1) % len(GENDERS)],
            room_number=room_number,
            status=student_status,
        ))
    return records


def create_demo_data() -> dict[str, int]:
    # Import every model before using the same metadata setup as application startup.
    _ = (attendance, room, student, user)
    Base.metadata.create_all(bind=engine)
    plans = room_plans()

    db = SessionLocal()
    try:
        existing_room_numbers = set(db.scalars(select(Room.room_number)).all())
        new_room_plans = [plan for plan in plans if plan.room_number not in existing_room_numbers]
        new_room_numbers = [plan.room_number for plan in new_room_plans]
        new_rooms = [
            Room(
                room_number=plan.room_number,
                block=plan.block,
                floor=plan.floor,
                room_type=plan.room_type,
                capacity=plan.capacity,
                occupied_beds=plan.occupancy,
                status=plan.status,
            )
            for plan in new_room_plans
        ]
        existing_student_ids = set(
            db.scalars(
                select(Student.student_id).where(Student.student_id.like(f"{DEMO_STUDENT_PREFIX}%"))
            ).all()
        )
        existing_demo_students = db.scalars(
            select(Student).where(Student.student_id.like(f"{DEMO_STUDENT_PREFIX}%"))
        ).all()
        existing_emails = set(db.scalars(select(Student.email)).all())
        repaired_emails = 0
        for existing_student in existing_demo_students:
            expected_email = demo_email(existing_student.student_id)
            if existing_student.email == expected_email:
                continue
            if expected_email in existing_emails:
                raise SystemExit(
                    f"Demo seed stopped: target email already belongs to another student: {expected_email}"
                )
            existing_emails.discard(existing_student.email)
            existing_emails.add(expected_email)
            existing_student.email = expected_email
            repaired_emails += 1

        db.add_all(new_rooms)
        candidate_students = build_students(new_room_numbers)
        new_students = [record for record in candidate_students if record.student_id not in existing_student_ids]
        db.add_all(new_students)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise SystemExit("Demo seed stopped: a unique database value conflicted. No partial changes were committed.")

        allocated_count = sum(record.room_number is not None for record in new_students)
        empty_rooms = sum(
            plan.status != RoomStatus.MAINTENANCE and plan.occupancy == 0
            for plan in new_room_plans
        )
        partial_rooms = sum(0 < plan.occupancy < plan.capacity for plan in new_room_plans)
        full_rooms = sum(plan.occupancy == plan.capacity for plan in new_room_plans)
        maintenance_rooms = sum(plan.status == RoomStatus.MAINTENANCE for plan in new_room_plans)
        return {
            "rooms_created": len(new_rooms),
            "students_created": len(new_students),
            "student_emails_repaired": repaired_emails,
            "students_allocated": allocated_count,
            "empty_rooms": empty_rooms,
            "partial_rooms": partial_rooms,
            "full_rooms": full_rooms,
            "maintenance_rooms": maintenance_rooms,
        }
    finally:
        db.close()


def main() -> None:
    summary = create_demo_data()
    print("Demo seed complete.")
    print(f"Rooms created: {summary['rooms_created']}")
    print(f"Students created: {summary['students_created']}")
    print(f"Student emails repaired: {summary['student_emails_repaired']}")
    print(f"Students allocated: {summary['students_allocated']}")
    print(f"Empty rooms: {summary['empty_rooms']}")
    print(f"Partially occupied rooms: {summary['partial_rooms']}")
    print(f"Full rooms: {summary['full_rooms']}")
    print(f"Maintenance rooms: {summary['maintenance_rooms']}")
    print("Attendance seed skipped; existing attendance data was not modified.")


if __name__ == "__main__":
    main()


