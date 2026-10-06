from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.core.notification_manager import notification_manager
from app.core.security import decode_access_token, get_current_user
from app.database.connection import SessionLocal, get_db
from app.models.user import User
from app.schemas.notification import NotificationResponse, NotificationUnreadCount
from app.services.notification_service import list_notifications, mark_all_read, mark_read, unread_count

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list:
    return list_notifications(db, current_user.id, limit)


@router.get("/unread-count", response_model=NotificationUnreadCount)
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict[str, int]:
    return {"unread_count": unread_count(db, current_user.id)}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> NotificationResponse:
    notification = mark_read(db, current_user.id, notification_id)
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.post("/read-all")
def read_all_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict[str, int]:
    return {"updated": mark_all_read(db, current_user.id)}


@router.websocket("/ws")
async def notification_websocket(websocket: WebSocket) -> None:
    origin = websocket.headers.get("origin")
    allowed_origins = {"http://localhost:5173", "http://127.0.0.1:5173"}
    try:
        from app.core.config import settings
        allowed_origins.add(settings.frontend_url)
    except Exception:
        pass
    if origin and origin not in allowed_origins:
        await websocket.close(code=1008)
        return
    protocols = [value.strip() for value in websocket.headers.get("sec-websocket-protocol", "").split(",") if value.strip()]
    token_protocol = next((value for value in protocols if value.startswith("smartstay-token.")), None)
    token = token_protocol.removeprefix("smartstay-token.") if token_protocol else None
    if not token:
        await websocket.close(code=1008)
        return
    db = SessionLocal()
    user: User | None = None
    try:
        try:
            email = decode_access_token(token)
        except ValueError:
            await websocket.close(code=1008)
            return
        user = db.query(User).filter(User.email == email.lower()).first()
        if user is None:
            await websocket.close(code=1008)
            return
        await notification_manager.connect(user.id, websocket, "smartstay" if "smartstay" in protocols else None)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if user is not None:
            notification_manager.disconnect(user.id, websocket)
        db.close()
