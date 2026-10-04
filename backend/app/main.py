from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.base import Base
from app.database.connection import engine
from app.models import attendance, complaint, room, student, user
from app.routers.attendance import router as attendance_router
from app.routers.auth import router as auth_router
from app.routers.complaints import router as complaints_router
from app.routers.students import router as students_router
from app.routers.rooms import router as rooms_router
from app.core.config import settings


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SmartStay Backend",
    description="Phase 1 authentication foundation for the SmartStay hostel platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(rooms_router)
app.include_router(attendance_router)
app.include_router(complaints_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "SmartStay Backend is running"}


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
