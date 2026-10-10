from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.maintenance import MaintenanceCategory, MaintenancePriority, MaintenanceStatus, MaintenanceTicket
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.maintenance import MaintenanceCreate, MaintenanceResponse, MaintenanceUpdate
from app.services.maintenance_service import (
    create_ticket,
    get_student_for_user,
    get_ticket,
    list_my_tickets,
    list_tickets,
    update_ticket,
)

router = APIRouter(prefix="/api/maintenance", tags=["Maintenance"])


def ticket_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance ticket not found")


def student_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")


def require_student_record(db: Session, user: User) -> Student:
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student access is required")
    student = get_student_for_user(db, user)
    if student is None:
        raise student_not_found()
    return student


@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def create_maintenance_ticket(
    ticket_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MaintenanceTicket:
    student = require_student_record(db, current_user)
    return create_ticket(db, student, ticket_data)


@router.get("/my", response_model=list[MaintenanceResponse])
def get_my_maintenance_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MaintenanceTicket]:
    student = require_student_record(db, current_user)
    return list_my_tickets(db, student.id)


@router.get("", response_model=list[MaintenanceResponse])
def get_all_maintenance_tickets(
    status_filter: MaintenanceStatus | None = Query(default=None, alias="status"),
    category: MaintenanceCategory | None = None,
    priority: MaintenancePriority | None = None,
    room_number: str | None = None,
    student_id: int | None = Query(default=None, gt=0),
    search: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[MaintenanceTicket]:
    return list_tickets(
        db,
        status=status_filter,
        category=category,
        priority=priority,
        room_number=room_number,
        student_id=student_id,
        search=search,
    )


@router.get("/{ticket_id}", response_model=MaintenanceResponse)
def get_maintenance_ticket_detail(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MaintenanceTicket:
    ticket = get_ticket(db, ticket_id)
    if ticket is None:
        raise ticket_not_found()
    if current_user.role != UserRole.ADMIN:
        student = require_student_record(db, current_user)
        if ticket.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only view your own maintenance tickets")
    return ticket


@router.patch("/{ticket_id}", response_model=MaintenanceResponse)
def update_maintenance_ticket_record(
    ticket_id: int,
    update_data: MaintenanceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> MaintenanceTicket:
    ticket = get_ticket(db, ticket_id, for_update=True)
    if ticket is None:
        raise ticket_not_found()
    try:
        return update_ticket(db, ticket, update_data)
    except ValueError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

