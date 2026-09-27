from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.room import RoomStatus


class RoomCreate(BaseModel):
    room_number: str = Field(min_length=1, max_length=30)
    block: str = Field(min_length=1, max_length=50)
    floor: int = Field(ge=0)
    room_type: str = Field(min_length=1, max_length=50)
    capacity: int = Field(gt=0)
    occupied_beds: int = Field(default=0, ge=0)
    status: RoomStatus = RoomStatus.AVAILABLE

    @model_validator(mode="after")
    def validate_occupancy(self) -> "RoomCreate":
        if self.occupied_beds > self.capacity:
            raise ValueError("occupied_beds cannot exceed capacity")
        return self


class RoomUpdate(BaseModel):
    block: str | None = Field(default=None, min_length=1, max_length=50)
    floor: int | None = Field(default=None, ge=0)
    room_type: str | None = Field(default=None, min_length=1, max_length=50)
    capacity: int | None = Field(default=None, gt=0)
    occupied_beds: int | None = Field(default=None, ge=0)
    status: RoomStatus | None = None


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_number: str
    block: str
    floor: int
    room_type: str
    capacity: int
    occupied_beds: int
    available_beds: int
    status: RoomStatus
    created_at: datetime
    updated_at: datetime
