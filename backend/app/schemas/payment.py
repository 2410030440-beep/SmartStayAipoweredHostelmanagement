from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.payment import PaymentMethod, PaymentStatus


class PaymentCreate(BaseModel):
    student_id: int = Field(gt=0)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    payment_date: date
    method: PaymentMethod
    reference: str | None = Field(default=None, max_length=120)
    remarks: str | None = Field(default=None, max_length=500)


class FeeConfigurationCreate(BaseModel):
    academic_period: str = Field(min_length=1, max_length=40)
    total_fee: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    due_date: date | None = None


class FeeConfigurationResponse(FeeConfigurationCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int


class DemoPaymentCreate(BaseModel):
    academic_year: str = Field(min_length=1, max_length=40)
    study_year: str = Field(min_length=1, max_length=30)
    semester: str = Field(min_length=1, max_length=30)
    payment_for: str = Field(min_length=1, max_length=30)
    email: str = Field(min_length=3, max_length=255)
    contact_number: str = Field(min_length=7, max_length=30)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    method: str = Field(min_length=1, max_length=30)
    order_id: str = Field(min_length=8, max_length=80)


class DemoPaymentResponse(DemoPaymentCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    transaction_id: str
    status: str
    created_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    amount: Decimal
    payment_date: date | None
    method: PaymentMethod | None
    reference: str | None
    remarks: str | None
    status: PaymentStatus
    due_date: date | None
    created_at: datetime
    updated_at: datetime
