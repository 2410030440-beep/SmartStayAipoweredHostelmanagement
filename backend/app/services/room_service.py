from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.room import Room, RoomStatus
from app.models.student import Student
from app.schemas.room import RoomCreate, RoomUpdate


def get_room(db: Session, room_number: str, for_update: bool = False) -> Room | None:
    query = select(Room).where(Room.room_number == room_number.strip())
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def list_rooms(db: Session, search: str | None = None, status: RoomStatus | None = None) -> list[Room]:
    query = select(Room).order_by(Room.room_number)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Room.room_number.ilike(search_term),
                Room.block.ilike(search_term),
                Room.room_type.ilike(search_term),
            )
        )
    if status is not None:
        query = query.where(Room.status == status)
    return list(db.scalars(query).all())


def status_for_occupancy(occupied_beds: int, capacity: int) -> RoomStatus:
    if occupied_beds == 0:
        return RoomStatus.AVAILABLE
    if occupied_beds == capacity:
        return RoomStatus.FULL
    return RoomStatus.PARTIALLY_OCCUPIED


def refresh_room_status(room: Room) -> None:
    if room.status != RoomStatus.MAINTENANCE:
        room.status = status_for_occupancy(room.occupied_beds, room.capacity)


def create_room(db: Session, room_data: RoomCreate) -> Room:
    room = Room(
        room_number=room_data.room_number.strip(),
        block=room_data.block.strip(),
        floor=room_data.floor,
        room_type=room_data.room_type.strip(),
        capacity=room_data.capacity,
        occupied_beds=room_data.occupied_beds,
        status=room_data.status,
    )
    if room.status != RoomStatus.MAINTENANCE:
        room.status = status_for_occupancy(room.occupied_beds, room.capacity)
    db.add(room)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(room)
    return room


def update_room(db: Session, room: Room, room_data: RoomUpdate) -> Room:
    updates = room_data.model_dump(exclude_unset=True)
    for field in ("block", "room_type"):
        if field in updates and updates[field] is not None:
            updates[field] = updates[field].strip()
    for field, value in updates.items():
        setattr(room, field, value)

    if room.occupied_beds > room.capacity:
        raise ValueError("occupied_beds cannot exceed capacity")
    if room.status != RoomStatus.MAINTENANCE:
        room.status = status_for_occupancy(room.occupied_beds, room.capacity)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(room)
    return room


def allocate_student(db: Session, room_number: str, student_id: str) -> Room:
    room = get_room(db, room_number, for_update=True)
    if room is None:
        raise LookupError("Room not found")
    student = db.scalar(
        select(Student).where(Student.student_id == student_id).with_for_update()
    )
    if student is None:
        raise LookupError("Student not found")
    if room.status == RoomStatus.MAINTENANCE:
        raise PermissionError("Room is under maintenance")
    if room.occupied_beds >= room.capacity:
        raise OverflowError("Room is full")
    if student.room_number is not None:
        raise FileExistsError("Student is already assigned to a room")

    student.room_number = room.room_number
    room.occupied_beds += 1
    refresh_room_status(room)
    db.commit()
    db.refresh(room)
    return room


def deallocate_student(db: Session, room_number: str, student_id: str) -> Room:
    room = get_room(db, room_number, for_update=True)
    if room is None:
        raise LookupError("Room not found")
    student = db.scalar(
        select(Student).where(Student.student_id == student_id).with_for_update()
    )
    if student is None:
        raise LookupError("Student not found")
    if student.room_number != room.room_number:
        raise ValueError("Student is not assigned to this room")

    student.room_number = None
    room.occupied_beds -= 1
    refresh_room_status(room)
    db.commit()
    db.refresh(room)
    return room


def delete_room(db: Session, room: Room) -> None:
    assigned_student = db.scalar(
        select(Student).where(Student.room_number == room.room_number).limit(1)
    )
    if assigned_student is not None:
        raise ValueError("Cannot delete a room with assigned students")
    db.delete(room)
    db.commit()
