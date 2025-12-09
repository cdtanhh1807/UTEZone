from abc import ABC, abstractmethod
from dto.comment.request.add_comment_request import AddCommentRequest
from dto.comment.response.add_comment_response import AddCommentResponse
from models.post_model import CommentReact
from typing import Optional

class ICommentService(ABC):
    @abstractmethod
    async def add(self, post_req: AddCommentRequest, user_id: str) -> AddCommentResponse:
        pass

    @abstractmethod
    async def update_react(self, post_id: str, comment_id: str, react: CommentReact) -> Optional[dict]:
        pass

    @abstractmethod
    async def find_by_id(self, post_id: str) -> Optional[dict]:
        pass
