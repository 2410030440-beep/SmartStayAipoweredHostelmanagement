from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class DemoPayment(Base):
    __tablename__ = "demo_payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True, nullable=False)
    order_id: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    academic_year: Mapped[str] = mapped_column(String(40), nullable=False)
    study_year: Mapped[str] = mapped_column(String(30), nullable=False)
    semester: Mapped[str] = mapped_column(String(30), nullable=False)
    payment_for: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="DEMO_UNVERIFIED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
