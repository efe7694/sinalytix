"""Messaging endpoints.

GET  /api/v1/messaging/conversations                          — list conversations
GET  /api/v1/messaging/conversations/{id}/messages            — list messages
POST /api/v1/messaging/conversations/{id}/messages            — send message
POST /api/v1/messaging/conversations/{id}/read               — mark as read
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser
from app.schemas.messaging import ConversationOut, MessageOut, SendMessageIn
from app.services import messaging_service

router = APIRouter(prefix="/api/v1/messaging", tags=["messaging"])


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> list[ConversationOut]:
    return await messaging_service.list_conversations(user, db)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(
    conversation_id: str, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> list[MessageOut]:
    try:
        return await messaging_service.list_messages(user, conversation_id, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: str,
    data: SendMessageIn,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> MessageOut:
    try:
        return await messaging_service.send_message(user, conversation_id, data, db)
    except ValueError as exc:
        msg = str(exc)
        if msg == "not_found":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
        if msg == "conversation_archived":
            raise HTTPException(status.HTTP_409_CONFLICT, "Conversation is archived.")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, msg)


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    conversation_id: str, user: CurrentUser, db: AsyncSession = Depends(get_db)
) -> None:
    try:
        await messaging_service.mark_conversation_read(user, conversation_id, db)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
