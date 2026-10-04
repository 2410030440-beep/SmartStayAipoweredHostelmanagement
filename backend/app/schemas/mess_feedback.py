from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.mess_feedback import MessMeal


class MessFeedbackCreate(BaseModel):
    meal: MessMeal
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class MessFeedbackUpdate(BaseModel):
    reviewed: bool | None = None


class MessFeedbackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    meal: MessMeal
    rating: int
    comment: str | None
    feedback_date: date
    reviewed: bool
    created_at: datetime
    updated_at: datetime
