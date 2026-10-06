from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class FeeConfiguration(Base):
    __tablename__ = "fee_configurations"
    __table_args__ = (UniqueConstraint("academic_period", name="uq_fee_config_academic_period"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    academic_period: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    total_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
