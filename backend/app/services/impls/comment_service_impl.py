from datetime import datetime, timezone
from dto.comment.request.add_comment_request import AddCommentRequest
from dto.comment.response.add_comment_response import AddCommentResponse
from models.account_model import Account
from models.announce_model import Announce
from repositories.account_repository import AccountRepository
from repositories.announce_repository import AnnounceRepository
from repositories.post_repository import PostRepository
from services.interfaces.comment_service_interface import ICommentService
from repositories.comment_repository import CommentRepository
from models.post_model import CommentReact, Post
from typing import Optional
from models.base_model import bson_to_dict

class CommentServiceImpl(ICommentService):

    async def add(self, post_req: AddCommentRequest, user_id: str) -> AddCommentResponse:
        new_comment = await CommentRepository.add_comment(
            post_id=post_req.postId,
            user_id=user_id,
            comment_data=post_req.model_dump()
        )

        # if new_comment:
        #     return AddCommentResponse(
        #         success=True,
        #         message="Comment added successfully.",
        #         comment=new_comment
        #     )
        if new_comment:
            dic_post = await PostRepository.find_by_id(post_req.postId)
            post: Post = Post(**bson_to_dict(dic_post))
            dic_acc = await AccountRepository.find_by_email(post.createdBy)
            acc: Account = Account(**bson_to_dict(dic_acc))
            dic_acc_tp = await AccountRepository.find_by_email(user_id)
            acc_tp: Account = Account(**bson_to_dict(dic_acc_tp))
            contentAnnounce: str = str(acc_tp.userInfo.fullName) + " đã bình luận bài viết của bạn"
            announce = Announce(senderEmail=user_id, receiverEmail=post.createdBy, type="comment", contentAnnounce=contentAnnounce,
                                 isRead=False, createdAt=datetime.now(timezone.utc), contentId=new_comment.get("commentId"),
                                 contentParentId=str(post.id), content=new_comment.get("content"))
            dic_announce_insert = await AnnounceRepository.insert(announce.model_dump())
            if dic_announce_insert:
                return AddCommentResponse(
                    success=True,
                    message="Comment added successfully.",
                    comment=new_comment
                )
        else:
            return AddCommentResponse(success=False, message="Post not found.")

    async def update_react(self, post_id: str, comment_id: str, react: CommentReact) -> Optional[dict]:
        updated_post = await CommentRepository.update_comment_react(post_id, comment_id, react)
        return bson_to_dict(updated_post) if updated_post else None

    async def find_by_id(self, post_id: str) -> Optional[dict]:
        return await CommentRepository.find_by_id(post_id)
