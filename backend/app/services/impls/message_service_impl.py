from dto.message.request.reset_unread_request import ResetUnreadRequest
from dto.message.response.conversation_response import ConversationResponse
from dto.message.response.reset_unread_response import ResetUnreadResponse
from repositories.conversation_repository import ConversationRepository
from services.interfaces.message_service_interface import IMessageService
from repositories.message_repository import MessageRepository
from models.message_model import Message
from repositories.account_repository import AccountRepository
from fastapi import HTTPException, status
from typing import List
from websocket.connection_manager import manager


class MessageServiceImpl(IMessageService):
    async def send_message(
        self, sender_email: str, receiver_email: str, content: str
    ) -> Message:
        # Kiểm tra tài khoản nhận có tồn tại
        receiver = await AccountRepository.find_by_email(receiver_email)
        if not receiver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receiver not found",
            )

        # Tạo conversation_id duy nhất
        conversation_id = "_".join(sorted([sender_email, receiver_email]))

        msg = await MessageRepository.insert_message(
            Message(
                sender_email=sender_email,
                receiver_email=receiver_email,
                conversation_id=conversation_id,
                content=content.strip(),
            )
        )

        # ⭐ Push real-time
        await manager.send_personal_message(msg)

         # ⭐ Gửi conversation_update cho receiver
        conv_resp = await ConversationRepository.get_conversation_response(
            user_email=receiver_email,
            other_email=sender_email
        )
        if conv_resp:
            payload = conv_resp.dict()
            payload["type"] = "conversation_update"
            await manager.send_json(payload, receiver_email)

        return msg

    async def get_conversation(
    self, user_a: str, user_b: str, skip: int = 0, limit: int = 50
    ) -> List[Message]:
        conversation_id = "_".join(sorted([user_a, user_b]))
        msgs = await MessageRepository.get_conversation(conversation_id, skip, limit)
        return sorted(msgs, key=lambda m: m.created_at)
    
    async def get_conversations(self, email: str) -> List[ConversationResponse]:
        rows = await MessageRepository.get_conversations_with_unread(email)
        return [ConversationResponse(**r) for r in rows]