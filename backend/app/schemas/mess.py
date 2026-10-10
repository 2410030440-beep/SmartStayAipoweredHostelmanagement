from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.mess import MealType, MessMenuStatus


class MessMenuCreate(BaseModel):
    menu_date: date
    meal_type: MealType
    items: str = Field(min_length=1)
    special_note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_items(self) -> "MessMenuCreate":
        if not self.items.strip():
            raise ValueError("items must not be empty")
        return self


class MessMenuUpdate(BaseModel):
    menu_date: date | None = None
    meal_type: MealType | None = None
    items: str | None = Field(default=None, min_length=1)
    special_note: str | None = Field(default=None, max_length=500)


class MessMenuResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    menu_date: date
    meal_type: MealType
    items: str
    special_note: str | None
    status: MessMenuStatus
    created_by: int
    created_at: datetime
    updated_at: datetime


class MessFeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    feedback: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def validate_feedback(self) -> "MessFeedbackCreate":
        if not self.feedback.strip():
            raise ValueError("feedback must not be empty")
        return self


class MessFeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    rating: int
    feedback: str
    created_at: datetime
