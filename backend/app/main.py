from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database.base import Base
from app.database.connection import engine
from app.models import announcement, attendance, complaint, demo_payment, fee_configuration, leave, maintenance, mess, mess_feedback, payment, payment_audit, room, student, user, visitor
from app.routers.announcements import router as announcements_router
from app.routers.attendance import router as attendance_router
from app.routers.auth import router as auth_router
from app.routers.complaints import router as complaints_router
from app.routers.leaves import router as leaves_router
from app.routers.maintenance import router as maintenance_router
from app.routers.mess import router as mess_router
from app.routers.mess_feedback import router as mess_feedback_router
from app.routers.students import router as students_router
from app.routers.rooms import router as rooms_router
from app.routers.visitors import router as visitors_router
from app.routers.payments import router as payments_router
from app.core.config import settings


def ensure_mess_feedback_columns() -> None:
    statements = (
        "ALTER TABLE mess_feedback ADD COLUMN IF NOT EXISTS meal VARCHAR(20)",
        "ALTER TABLE mess_feedback ADD COLUMN IF NOT EXISTS comment TEXT",
        "ALTER TABLE mess_feedback ADD COLUMN IF NOT EXISTS feedback_date DATE DEFAULT CURRENT_DATE",
        "ALTER TABLE mess_feedback ADD COLUMN IF NOT EXISTS reviewed BOOLEAN DEFAULT FALSE",
        "ALTER TABLE mess_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE demo_payments ADD COLUMN IF NOT EXISTS study_year VARCHAR(30)",
        "ALTER TABLE demo_payments ADD COLUMN IF NOT EXISTS payment_for VARCHAR(30)",
        "UPDATE demo_payments SET study_year = 'Not specified' WHERE study_year IS NULL",
        "UPDATE demo_payments SET payment_for = 'Hostel Fee' WHERE payment_for IS NULL",
        "UPDATE mess_feedback SET meal = 'BREAKFAST' WHERE meal IS NULL",
        "UPDATE mess_feedback SET feedback_date = CURRENT_DATE WHERE feedback_date IS NULL",
        "UPDATE mess_feedback SET reviewed = FALSE WHERE reviewed IS NULL",
        "UPDATE mess_feedback SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL",
    )
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_mess_feedback_columns()
    yield


app = FastAPI(
    title="SmartStay Backend",
    description="Phase 1 authentication foundation for the SmartStay hostel platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(rooms_router)
app.include_router(attendance_router)
app.include_router(complaints_router)
app.include_router(mess_feedback_router)
app.include_router(leaves_router)
app.include_router(maintenance_router)
app.include_router(mess_router)
app.include_router(visitors_router)
app.include_router(payments_router)
app.include_router(announcements_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "SmartStay Backend is running"}


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
