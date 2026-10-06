from datetime import date
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.database.connection import get_db
from app.models.demo_payment import DemoPayment
from app.models.fee_configuration import FeeConfiguration
from app.models.payment import Payment, PaymentStatus
from app.models.payment_audit import PaymentAudit
from app.models.notification import NotificationType
from app.models.student import Student
from app.models.user import User
from app.schemas.payment import (
    DemoPaymentCreate,
    DemoPaymentResponse,
    FeeConfigurationCreate,
    FeeConfigurationResponse,
    PaymentCreate,
    PaymentResponse,
)
from app.services.notification_service import emit_notifications, student_user_id

router = APIRouter(prefix="/api/payments", tags=["Payments"])


def student_for_user(db: Session, user: User) -> Student:
    student = db.scalar(select(Student).where(Student.email == user.email.lower()))
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student record not found")
    return student


def active_fee(db: Session) -> FeeConfiguration | None:
    return db.scalar(select(FeeConfiguration).order_by(FeeConfiguration.updated_at.desc(), FeeConfiguration.id.desc()))


def verified_total(db: Session, student_id: int) -> Decimal:
    return db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(
            Payment.student_id == student_id,
            Payment.status == PaymentStatus.PAID,
        )
    ) or Decimal("0")


@router.get("/my/summary")
def get_my_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    student = student_for_user(db, current_user)
    fee = active_fee(db)
    verified = list(db.scalars(select(Payment).where(Payment.student_id == student.id).order_by(Payment.created_at.desc())).all())
    demos = list(db.scalars(select(DemoPayment).where(DemoPayment.student_id == student.id).order_by(DemoPayment.created_at.desc())).all())
    paid = verified_total(db, student.id)
    total = fee.total_fee if fee else None
    balance = max(total - paid, Decimal("0")) if total is not None else None
    return {
        "total_fee": total,
        "verified_paid": paid,
        "outstanding": balance,
        "due_date": fee.due_date if fee else None,
        "payment_status": "NOT_CONFIGURED" if fee is None else ("PAID" if balance == 0 else "DUE"),
        "payments": verified,
        "demo_payments": demos,
    }


@router.get("/my", response_model=list[PaymentResponse])
def get_my_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[Payment]:
    student = student_for_user(db, current_user)
    return list(db.scalars(select(Payment).where(Payment.student_id == student.id).order_by(Payment.created_at.desc())).all())


@router.post("/demo", response_model=DemoPaymentResponse, status_code=status.HTTP_201_CREATED)
def create_demo_payment(data: DemoPaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> DemoPayment:
    student = student_for_user(db, current_user)
    existing = db.scalar(select(DemoPayment).where(DemoPayment.order_id == data.order_id))
    if existing is not None:
        if existing.student_id != student.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Demo order ID already exists")
        return existing
    fee = active_fee(db)
    if fee is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Hostel fee is not configured yet")
    outstanding = max(fee.total_fee - verified_total(db, student.id), Decimal("0"))
    if data.amount > outstanding:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Demo amount cannot exceed the current outstanding balance")
    demo = DemoPayment(
        **data.model_dump(),
        student_id=student.id,
        transaction_id=f"DEMO-TXN-{uuid4().hex[:12].upper()}",
        status="DEMO_UNVERIFIED",
    )
    db.add(demo)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Demo order ID already exists") from error
    db.refresh(demo)
    return demo


@router.get("/config", response_model=FeeConfigurationResponse | None)
def get_fee_configuration(db: Session = Depends(get_db), _: User = Depends(require_admin)) -> FeeConfiguration | None:
    return active_fee(db)


@router.put("/config", response_model=FeeConfigurationResponse)
def set_fee_configuration(data: FeeConfigurationCreate, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> FeeConfiguration:
    fee = db.scalar(select(FeeConfiguration).where(FeeConfiguration.academic_period == data.academic_period))
    if fee is None:
        fee = FeeConfiguration(**data.model_dump())
        db.add(fee)
    else:
        for field, value in data.model_dump().items():
            setattr(fee, field, value)
    db.commit()
    db.refresh(fee)
    return fee


@router.get("", response_model=list[PaymentResponse])
def get_payments(
    payment_status: PaymentStatus | None = Query(default=None, alias="status"),
    student_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[Payment]:
    query = select(Payment).order_by(Payment.created_at.desc())
    if payment_status is not None:
        query = query.where(Payment.status == payment_status)
    if student_id is not None:
        query = query.where(Payment.student_id == student_id)
    return list(db.scalars(query).all())


@router.get("/students/{student_id}/summary")
def get_student_summary(student_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)) -> dict:
    student = db.get(Student, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    fee = active_fee(db)
    paid = verified_total(db, student.id)
    total = fee.total_fee if fee else None
    return {"student_id": student.id, "total_fee": total, "verified_paid": paid, "outstanding": max(total - paid, Decimal("0")) if total is not None else None, "due_date": fee.due_date if fee else None}


@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(data: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)) -> Payment:
    if db.get(Student, data.student_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    fee = active_fee(db)
    if fee is not None and data.amount > max(fee.total_fee - verified_total(db, data.student_id), Decimal("0")):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Verified payment cannot exceed the outstanding balance")
    payment = Payment(**data.model_dump(), status=PaymentStatus.PAID)
    db.add(payment)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment reference already exists") from error
    db.refresh(payment)
    db.add(PaymentAudit(payment_id=payment.id, recorded_by=current_user.id))
    db.commit()
    recipient = student_user_id(db, payment.student_id)
    if recipient is not None:
        emit_notifications(
            db,
            recipient_user_ids=[recipient],
            title="Payment status updated",
            message=f"Your verified payment of {payment.amount} has been recorded.",
            notification_type=NotificationType.PAYMENT,
            event_key=f"payment:verified:{payment.id}",
            related_record_id=payment.id,
        )
    return payment
