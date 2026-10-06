from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.room import Room, RoomStatus
from app.models.notification import NotificationType
from app.models.student import Student
from app.models.user import User
from app.schemas.room import RoomCreate, RoomResponse, RoomUpdate
from app.services.room_service import (
    allocate_student,
    create_room,
    deallocate_student,
    delete_room,
    get_room,
    list_rooms,
    update_room,
)
from app.services.notification_service import emit_notifications, student_user_id

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])


def room_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")


def map_service_error(error: Exception) -> HTTPException:
    messages = {
        LookupError: (status.HTTP_404_NOT_FOUND, str(error)),
        PermissionError: (status.HTTP_409_CONFLICT, str(error)),
        OverflowError: (status.HTTP_409_CONFLICT, str(error)),
        FileExistsError: (status.HTTP_409_CONFLICT, str(error)),
        ValueError: (status.HTTP_409_CONFLICT, str(error)),
    }
    error_status, message = messages[type(error)]
    return HTTPException(status_code=error_status, detail=message)


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room_record(
    room_data: RoomCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Room:
    if get_room(db, room_data.room_number) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room number already exists")
    try:
        return create_room(db, room_data)
    except IntegrityError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room number already exists") from error


@router.get("", response_model=list[RoomResponse])
def get_rooms(
    search: str | None = Query(default=None, max_length=100),
    room_status: RoomStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Room]:
    return list_rooms(db, search, room_status)


@router.get("/{room_number}", response_model=RoomResponse)
def get_room_record(
    room_number: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Room:
    room = get_room(db, room_number)
    if room is None:
        raise room_not_found()
    return room


@router.put("/{room_number}", response_model=RoomResponse)
def update_room_record(
    room_number: str,
    room_data: RoomUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Room:
    room = get_room(db, room_number, for_update=True)
    if room is None:
        raise room_not_found()
    try:
        return update_room(db, room, room_data)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except IntegrityError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Room update violates a database constraint") from error


@router.delete("/{room_number}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room_record(
    room_number: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> None:
    room = get_room(db, room_number, for_update=True)
    if room is None:
        raise room_not_found()
    try:
        delete_room(db, room)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.post("/{room_number}/allocate/{student_id}", response_model=RoomResponse)
def allocate_room_bed(
    room_number: str,
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Room:
    try:
        room = allocate_student(db, room_number, student_id)
        student = db.scalar(select(Student).where(Student.student_id == student_id))
        if student is not None:
            recipient = student_user_id(db, student.id)
            if recipient is not None:
                emit_notifications(
                    db,
                    recipient_user_ids=[recipient],
                    title="Room allocation updated",
                    message=f"You have been allocated to room {room.room_number}.",
                    notification_type=NotificationType.ROOM,
                    event_key=f"room:allocated:{student.id}:{room.room_number}",
                    related_record_id=room.id,
                )
        return room
    except (LookupError, PermissionError, OverflowError, FileExistsError, ValueError) as error:
        db.rollback()
        raise map_service_error(error) from error


@router.post("/{room_number}/deallocate/{student_id}", response_model=RoomResponse)
def deallocate_room_bed(
    room_number: str,
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> Room:
    try:
        room = deallocate_student(db, room_number, student_id)
        student = db.scalar(select(Student).where(Student.student_id == student_id))
        if student is not None:
            recipient = student_user_id(db, student.id)
            if recipient is not None:
                emit_notifications(
                    db,
                    recipient_user_ids=[recipient],
                    title="Room allocation updated",
                    message=f"Your room allocation for {room.room_number} has been removed.",
                    notification_type=NotificationType.ROOM,
                    event_key=f"room:deallocated:{student.id}:{room.room_number}",
                    related_record_id=room.id,
                )
        return room
    except (LookupError, PermissionError, OverflowError, FileExistsError, ValueError) as error:
        db.rollback()
        raise map_service_error(error) from error
