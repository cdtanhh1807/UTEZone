from datetime import datetime, timedelta, timezone
from typing import List, Optional
from dto.post.request.get_my_post_request import GetMyPostRequest
from dto.post.request.get_post_by_email_request import GetPostByEmailRequest
from dto.post.response.get_post_by_email_response import GetPostByEmailResponse
from dto.statistic.request.get_post_of_day_request import GetPostOfDayRequest
from dto.statistic.request.get_top_interacted_post_request import GetTopInteractedPostRequest
from dto.statistic.response.get_post_of_day_response import GetPostOfDayResponse
from dto.statistic.response.get_top_interacted_post_response import GetTopInteractedPostReponse, TopPost
from repositories.account_repository import AccountRepository
from services.interfaces.post_service_interface import IPostService
from repositories.post_repository import PostRepository
from dto.post.request.add_post_request import AddPostRequest
from dto.post.response.add_post_response import AddPostResponse
from dto.post.request.get_post_request import GetPostRequest
from dto.post.response.get_post_response import GetPostResponse
from dto.post.request.update_post_request import UpdatePostRequest
from dto.post.response.update_post_response import UpdatePostResponse
from dto.post.request.get_all_post_request import GetAllPostRequest
from dto.post.response.get_all_post_response import GetAllPostResponse 
from dto.post.request.delete_post_request import DeletePostRequest
from dto.post.response.delete_post_response import DeletePostResponse
from models.post_model import Post, React
from models.base_model import bson_to_dict

from core.database import db 
from repositories.interaction_repository import InteractionRepository
from core.redis import (
    get_cached_feed, cache_feed,
    get_viewed_posts, mark_post_viewed, invalidate_feed_cache
)
MAX_TAKE = 20


class PostServiceImpl(IPostService):

    async def add(self, post_req: AddPostRequest) -> Optional[AddPostResponse]:
        new_post = await PostRepository.insert(post_req.model_dump())
        if new_post:
            return AddPostResponse(success=True, message="Completed")
        else:
            return AddPostResponse(success=False, message="Failed to add post")


    async def get_all(self, req: GetAllPostRequest) -> Optional[GetAllPostResponse]:
        uid = req.email
        dic_acc = await AccountRepository.find_by_email(uid)
        # 1. Cache
        # cached = await get_cached_feed(uid)
        # if cached:
        #     return GetAllPostResponse(post_list=[Post(**d) for d in cached])

        # 2. Đã xem
        viewed = await get_viewed_posts(uid)

        # 3. Follow & department
        me = await db["account"].find_one(
            {"email": uid},
            {"userInfo.followed": 1, "userInfo.department": 1}
        )
        followed = me.get("userInfo", {}).get("followed", [])
        user_dept = me.get("userInfo", {}).get("department")

        # 4. Interacted
        interacted = await InteractionRepository(db).get_interacted_emails(uid)
        interacted = list(interacted - set(followed))
        
        # 5. Lấy hết bài chưa xem (không giới hạn)
        new_docs = await PostRepository.get_ranked_posts(
            email=uid,
            followed=followed,
            interacted=interacted,
            user_dept=user_dept,
            exclude_ids=list(viewed),
            limit=None,
            myAccount=dic_acc
        )

        # 6. Refill bài đã xem đến MAX_TAKE (kể cả 0)
        needed = 300 - len(new_docs)          # có thể = 0
        old_docs = []
        if needed > 0:       
            total_valid = await db["post"].count_documents({"visibility": "public", "status": "active"})
            # print(f"[SRV] total valid posts = {total_valid}")
            old_docs = await PostRepository.get_ranked_posts(
                email=uid,
                followed=followed,
                interacted=interacted,
                user_dept=user_dept,
                exclude_ids=[],
                limit=needed,
                myAccount=dic_acc
            )
            seen_ids = {str(d["_id"]) for d in new_docs}
            old_docs = [d for d in old_docs if str(d["_id"]) not in seen_ids]

        # 7. Ghép & giữ thứ tự ưu tiên
        docs = (new_docs + old_docs)[:MAX_TAKE]

        # 8. Cache & mark viewed
        serializable = [bson_to_dict(d) for d in docs]
        await cache_feed(uid, serializable)
        for d in docs:
            await mark_post_viewed(uid, str(d["_id"]))
        # print("da xem: " + str(viewed))
        # print(f"[SRV] followed={len(followed)}, interacted={len(interacted)}, dept={user_dept}")
        # print(f"[SRV] exclude_ids=[] (refill), needed={needed}")
        # print(f"[DEBUG] new={len(new_docs)}  old={len(old_docs)}  total={len(docs)}")
        # print(f"viewed count: {len(viewed)}")
        # print(f"new docs (chưa xem): {len(new_docs)}")
        # print(f"old docs (đã xem): {len(old_docs)}")
        # print(f"total return: {len(docs)}")
        return GetAllPostResponse(post_list=[Post(**d) for d in docs])


    async def get_by_id(self, post_id: GetPostRequest) -> Optional[GetPostResponse]:
        post = await PostRepository.find_by_id(post_id.id)
        if post:
            return GetPostResponse(post=Post(**bson_to_dict(post))) 
        return None


    async def update(self, post_req: UpdatePostRequest) -> Optional[UpdatePostResponse]:
        updated_post = await PostRepository.update(post_req.model_dump(exclude_none=True))
        if updated_post:
            return UpdatePostResponse(post=Post(**bson_to_dict(updated_post)))
        return None


    async def delete(self, post_id: DeletePostRequest) -> Optional[DeletePostResponse]:
        rs = await PostRepository.delete(post_id.id)
        if rs:
            return DeletePostResponse(success=True, message="Deleted")
        else:
            return DeletePostResponse(success=False, message="Failed to delete post")
        
    async def update_comment_status(self, post_id: str, comment_id: str, status_comment: str):
        updated_post = await PostRepository.update_comment_status(post_id, comment_id, status_comment)
        if updated_post:
            return UpdatePostResponse(post=Post(**bson_to_dict(updated_post)))
        return None
    

    async def find_by_id(self, post_id: str):
        """
        Trả về Post model trực tiếp, dùng cho toggle_react
        """
        post_data = await PostRepository.find_by_id(post_id)
        if post_data:
            return Post(**bson_to_dict(post_data))
        return None
    
    async def update_react(self, post_id: str, react: React) -> Post | None:
        """
        Gọi repository để cập nhật field 'react' của bài viết.
        """
        updated_post = await PostRepository.update_react(post_id, react)
        if updated_post:
            return Post(**bson_to_dict(updated_post))
        return None
    
    async def get_by_email(self, req: GetPostByEmailRequest) -> GetPostByEmailResponse:
        posts_data = await PostRepository.find_by_email(req.email)
        posts = [Post(**bson_to_dict(p)) for p in posts_data]
        return GetPostByEmailResponse(post_list=posts)
    
    async def get_my_post(self, post_list: GetMyPostRequest) -> GetAllPostResponse:
        dic_posts = await PostRepository.find_by_email(post_list.email)
        posts: list[Post] = []
        if len(dic_posts) > 0:
            for dic in dic_posts:
                post: Post = Post(**bson_to_dict(dic))
                posts.append(post)
        return GetAllPostResponse(post_list=posts)
    
    async def get_post_of_day(self, req: GetPostOfDayRequest) -> GetPostOfDayResponse:
        rs = await PostRepository.get_post_of_day()
        return GetPostOfDayResponse(success=True, data=rs)
    
    async def get_top_interacted_posts_in_week(self, req: GetTopInteractedPostRequest) -> GetTopInteractedPostReponse:
        post_dic = await PostRepository.get_top_interacted_posts_in_week(10)
        data: List[TopPost] = []
        for dic in post_dic:
            post: TopPost = TopPost(**bson_to_dict(dic))
            data.append(post)
        return GetTopInteractedPostReponse(success=True, data=data)




