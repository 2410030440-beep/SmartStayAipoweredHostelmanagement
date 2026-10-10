from datetime import date

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.attendance import Attendance, AttendanceStatus
from app.schemas.attendance import AttendanceBulkCreate, AttendanceCreate, AttendanceUpdate


def get_attendance(db: Session, attendance_id: int, for_update: bool = False) -> Attendance | None:
    query = select(Attendance).where(Attendance.id == attendance_id)
    if for_update:
        query = query.with_for_update()
    return db.scalar(query)


def get_attendance_by_student_and_date(
    db: Session,
    student_id: int,
    attendance_date: date,
) -> Attendance | None:
    return db.scalar(
        select(Attendance).where(
            Attendance.student_id == student_id,
            Attendance.attendance_date == attendance_date,
        )
    )


def list_attendance(
    db: Session,
    *,
    student_id: int | None = None,
    attendance_date: date | None = None,
    status: AttendanceStatus | None = None,
    month_start: date | None = None,
    next_month_start: date | None = None,
) -> list[Attendance]:
    query: Select[tuple[Attendance]] = select(Attendance).order_by(
        Attendance.attendance_date.desc(), Attendance.id.desc()
    )
    if student_id is not None:
        query = query.where(Attendance.student_id == student_id)
    if attendance_date is not None:
        query = query.where(Attendance.attendance_date == attendance_date)
    if status is not None:
        query = query.where(Attendance.status == status)
    if month_start is not None and next_month_start is not None:
        query = query.where(
            Attendance.attendance_date >= month_start,
            Attendance.attendance_date < next_month_start,
        )
    return list(db.scalars(query).all())


def create_attendance(db: Session, attendance_data: AttendanceCreate) -> Attendance:
    attendance = Attendance(
        student_id=attendance_data.student_id,
        attendance_date=attendance_data.attendance_date,
        status=attendance_data.status,
    )
    db.add(attendance)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(attendance)
    return attendance


def update_attendance(
    db: Session,
    attendance: Attendance,
    attendance_data: AttendanceUpdate,
) -> Attendance:
    for field, value in attendance_data.model_dump(exclude_unset=True).items():
        setattr(attendance, field, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    db.refresh(attendance)
    return attendance


def upsert_attendance_bulk(db: Session, attendance_data: AttendanceBulkCreate) -> list[Attendance]:
    student_ids = [record.student_id for record in attendance_data.records]
    existing_records = {
        record.student_id: record
        for record in db.scalars(
            select(Attendance).where(
                Attendance.attendance_date == attendance_data.attendance_date,
                Attendance.student_id.in_(student_ids),
            ).with_for_update()
        ).all()
    }
    attendance_records: list[Attendance] = []
    for record_data in attendance_data.records:
        record = existing_records.get(record_data.student_id)
        if record is None:
            record = Attendance(
                student_id=record_data.student_id,
                attendance_date=attendance_data.attendance_date,
                status=record_data.status,
            )
            db.add(record)
        else:
            record.status = record_data.status
        attendance_records.append(record)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise
    for record in attendance_records:
        db.refresh(record)
    return attendance_records


def attendance_summary(records: list[Attendance]) -> dict[str, int | float]:
    total_days = len(records)
    present_days = sum(record.status == AttendanceStatus.PRESENT for record in records)
    absent_days = total_days - present_days
    attendance_percentage = round((present_days / total_days) * 100, 2) if total_days else 0.0
    return {
        "total_days": total_days,
        "present_days": present_days,
        "absent_days": absent_days,
        "attendance_percentage": attendance_percentage,
    }
