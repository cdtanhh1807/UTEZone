from datetime import datetime, timedelta, timezone
from typing import List, Optional
from core.database import db
from bson import ObjectId

from models.post_model import React
from repositories.account_repository import AccountRepository


class PostRepository:

    collection = db["post"]

    @staticmethod
    async def insert(data: dict) -> dict:
        result = await PostRepository.collection.insert_one(data)
        new_post = await PostRepository.collection.find_one({"_id": result.inserted_id})
        return new_post

    @staticmethod
    async def find_all() -> list[dict]:
        posts = []
        async for post in PostRepository.collection.find():
            posts.append(post)
        return posts

    @staticmethod
    async def find_by_id(post_id: str) -> dict | None:
        return await PostRepository.collection.find_one({"_id": ObjectId(post_id)})

    @staticmethod
    async def update(data: dict) -> dict | None:
        post_id = data.pop("id", None)
        if not post_id: return None
        await PostRepository.collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": data}
        )
        return await PostRepository.find_by_id(post_id)

    # @staticmethod
    # async def delete(post_id: str) -> bool:
    #     result = await PostRepository.collection.delete_one({"_id": ObjectId(post_id)})
    #     return result.deleted_count > 0
    @staticmethod
    async def delete(post_id: str) -> bool:
        result = await PostRepository.collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$set": {"status": "off"}}
        )
        return result.modified_count > 0

    @staticmethod
    async def update_comment_status(post_id: str, comment_id: str, status: str):
        result = await PostRepository.collection.update_one(
            {"_id": ObjectId(post_id), "comments.commentId": comment_id}, 
            {"$set": {"comments.$.statusComment": status}} 
        )

        if result.modified_count == 0:
            return None

        updated_post = await PostRepository.find_by_id(post_id)
        return updated_post
    
    @staticmethod
    async def get_ranked_posts(
        email: str,
        followed: List[str],
        interacted: List[str],
        user_dept: Optional[str],
        exclude_ids: List[str],
        limit: int,
        myAccount: dict
    ) -> List[dict]:
        from bson import ObjectId
        from datetime import datetime, timezone, timedelta

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        my_blocks = myAccount["userInfo"].get("blocks", [])
        # my_followers = set(myAccount["userInfo"].get("followers", []))
        my_followed = set(myAccount["userInfo"].get("followed", []))
        # mutual_follow = list(my_followers.intersection(my_followed))
        mutual_follow = list(my_followed)

        # --- 1. Match stage: public hoặc follow mutual + loại post blocked ---
        match_stage = {
            "status": "active",
            "$or": [
                # public nhưng không nằm trong blocks
                {"visibility": "public", "createdBy": {"$nin": my_blocks}},
                # follow nhưng author nằm trong mutual_follow
                {"visibility": "follow", "createdBy": {"$in": mutual_follow}}
            ]
        }
        if exclude_ids:
            match_stage["_id"] = {"$nin": [ObjectId(pid) for pid in exclude_ids]}

        # --- 2. Pipeline ---
        pipeline = [
            {"$match": match_stage},
            # --- Lookup để lấy thông tin blocks của author ---
            {
                "$lookup": {
                    "from": "account",
                    "localField": "createdBy",
                    "foreignField": "email",
                    "as": "author_info"
                }
            },
            {"$unwind": "$author_info"},
            # --- Mutual block: loại bỏ nếu author block bạn ---
            {"$match": {
                "$expr": {"$not": {"$in": [email, {"$ifNull": ["$author_info.userInfo.blocks", []]}]}}
            }},
            # --- Tính hotScore, finalScore như cũ ---
            {"$addFields": {
                "hotScore": {
                    "$add": [
                        {"$size": {"$ifNull": ["$react.love", []]}},
                        {"$multiply": [1.5, {"$size": {"$ifNull": ["$react.like", []]}}]},
                        {"$multiply": [1.2, {"$size": {"$ifNull": ["$react.haha", []]}}]},
                        {"$multiply": [1.2, {"$size": {"$ifNull": ["$react.wow", []]}}]},
                        {"$multiply": [0.8, {"$size": {"$ifNull": ["$react.sad", []]}}]},
                        {"$multiply": [0.5, {"$size": {"$ifNull": ["$react.angry", []]}}]},
                        {"$size": {"$ifNull": ["$comments", []]}}
                    ]
                },
                "isMyPostToday": {
                    "$and": [
                        {"$eq": ["$createdBy", email]},
                        {"$gte": ["$createdAt", today_start]},
                        {"$lt": ["$createdAt", today_end]}
                    ]
                },
                "isFollowed": {"$in": ["$createdBy", followed]},
                "isInteracted": {"$in": ["$createdBy", interacted]},
                "sameDept": {"$in": [user_dept, {"$ifNull": ["$category", []]}]},
                "ageHours": {"$divide": [{"$subtract": [now, "$createdAt"]}, 3600000]}
            }},
            {"$addFields": {
                "finalScore": {
                    "$add": [
                        {"$cond": ["$isMyPostToday", 1_000_000, 0]},
                        {"$cond": ["$isFollowed", 300, 0]},
                        {"$cond": ["$isInteracted", 200, 0]},
                        {"$cond": ["$sameDept", 100, 0]},
                        "$hotScore",
                        {"$divide": [100, {"$add": ["$ageHours", 4]}]}
                    ]
                }
            }},
            {"$sort": {"finalScore": -1}},
            {"$limit": limit or 10_000},
            {"$project": {
                "finalScore": 0, "hotScore": 0, "isMyPostToday": 0,
                "isFollowed": 0, "isInteracted": 0, "sameDept": 0, "ageHours": 0,
                "author_info": 0
            }}
        ]

        print(f"[REPO] pipeline limit = {limit}, exclude_ids = {len(exclude_ids)}")
        result = await PostRepository.collection.aggregate(pipeline).to_list(length=limit)
        print(f"[REPO] returned = {len(result)}")
        return result


    @staticmethod
    async def update_react(post_id: str, react: React) -> dict | None:
            """
            Cập nhật trường 'react' của bài viết theo ID.
            """
            # Chuyển React instance thành dict
            react_dict = react.dict()

            await PostRepository.collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": {"react": react_dict}}
            )
            return await PostRepository.find_by_id(post_id)
    
    @staticmethod
    async def find_by_email(email: str) -> list[dict]:
        posts = []
        async for post in PostRepository.collection.find({"createdBy": email}).sort("createdAt", -1):
            posts.append(post)
        return posts

    # @staticmethod
    # async def find_post_by_keysearch_and_department(
    #     keySearch: str,
    #     department: str,
    #     myAccount: dict
    # ) -> Optional[list[dict]]:

    #     from rapidfuzz import fuzz

    #     my_email = myAccount.get("email")
    #     # Lấy danh sách email follow 2 chiều
    #     # followers = set(myAccount["userInfo"].get("followers", []))
    #     # followed = set(myAccount["userInfo"].get("followed", []))
    #     # mutual_follow = list(followers.intersection(followed))
    #     mutual_follow = set(myAccount["userInfo"].get("followed", []))

    #     # Danh sách email bị block bởi tài khoản đang search
    #     my_blocks = myAccount["userInfo"].get("blocks", [])

    #     # Visibility conditions
    #     visibility_condition = {
    #         "$or": [
    #             # PUBLIC nhưng không phải của account bạn đã block
    #             {
    #                 "visibility": "public",
    #                 "createdBy": {"$nin": my_blocks}
    #             },
    #             # FOLLOW nhưng phải mutual follow
    #             {
    #                 "visibility": "follow",
    #                 "createdBy": {"$in": mutual_follow}
    #             }
    #         ]
    #     }

    #     # 1. Tách keySearch thành từ
    #     parts = keySearch.lower().split()

    #     # 2. Regex sơ bộ
    #     regex_conditions = [
    #         {
    #             "$or": [
    #                 {"title": {"$regex": part[:2], "$options": "i"}},
    #                 {"content": {"$regex": part[:2], "$options": "i"}},
    #             ]
    #         }
    #         for part in parts if len(part) >= 2
    #     ]

    #     if not regex_conditions:
    #         regex_conditions = [{
    #             "$or": [
    #                 {"title": {"$regex": ".*"}},
    #                 {"content": {"$regex": ".*"}},
    #             ]
    #         }]

    #     # 3. Query các post ứng viên theo regex + visibility
    #     cursor = PostRepository.collection.find({
    #         "$or": regex_conditions,
    #         "status": "active",
    #         **visibility_condition
    #     })

    #     candidates = await cursor.to_list(length=None)

    #     # 4. Fuzzy filter + mutual block check
    #     matched = []
    #     for post in candidates:
    #         # Lấy thông tin account tạo post để kiểm tra mutual block
    #         author = await AccountRepository.collection.find_one({"email": post.get("createdBy")})
    #         if not author:
    #             continue

    #         author_blocks = author["userInfo"].get("blocks", [])
    #         # Nếu author đã block bạn → skip
    #         if my_email in author_blocks:
    #             continue

    #         # Fuzzy match
    #         title = post.get("title", "").lower()
    #         content = post.get("content", "").lower()
    #         score = max(
    #             fuzz.token_sort_ratio(title, keySearch.lower()),
    #             fuzz.token_sort_ratio(content, keySearch.lower())
    #         )
    #         if score >= 50:
    #             matched.append(post)

    #     # Sort theo createdAt giảm dần
    #     if matched:
    #         matched.sort(key=lambda p: p.get("createdAt"), reverse=True)
    #         return matched

    #     # 5. Fallback: lấy post theo department
    #     acc_cursor = AccountRepository.collection.find(
    #         {
    #             "role": {"$in": ["User", "Moderator"]},
    #             "userInfo.department": department
    #         },
    #         {"email": 1}
    #     )

    #     accounts = await acc_cursor.to_list(length=None)
    #     if not accounts:
    #         return None

    #     email_list = [acc["email"] for acc in accounts]

    #     # 6. Query post department + visibility
    #     post_cursor = PostRepository.collection.find(
    #         {
    #             "createdBy": {"$in": email_list},
    #             "status": "active",
    #             **visibility_condition
    #         }
    #     ).sort("createdAt", -1).limit(20)

    #     posts = await post_cursor.to_list(length=None)

    #     # 7. Mutual block filter trên fallback posts
    #     final_posts = []
    #     for post in posts:
    #         author = await AccountRepository.collection.find_one({"email": post.get("createdBy")})
    #         if not author:
    #             continue
    #         if my_email in author["userInfo"].get("blocks", []):
    #             continue
    #         final_posts.append(post)

    #     return final_posts if final_posts else None

    @staticmethod
    async def find_post_by_keysearch_and_department(
        keySearch: str,
        department: str,
        myAccount: dict
    ) -> Optional[list[dict]]:

        from rapidfuzz import fuzz

        my_email = myAccount.get("email")
        # Lấy danh sách email follow 2 chiều
        my_followed = set(myAccount["userInfo"].get("followed", []))
        # mutual_follow = list(my_followers.intersection(my_followed))
        mutual_follow = list(my_followed)

        # Danh sách email bị block bởi tài khoản đang search
        my_blocks = myAccount["userInfo"].get("blocks", [])

        # Visibility conditions
        visibility_condition = {
            "$or": [
                # PUBLIC nhưng không phải của account bạn đã block
                {
                    "visibility": "public",
                    "createdBy": {"$nin": my_blocks}
                },
                # FOLLOW nhưng phải mutual follow
                {
                    "visibility": "follow",
                    "createdBy": {"$in": mutual_follow}
                }
            ]
        }

        # 1. Tách keySearch thành từ
        parts = keySearch.lower().split()

        # 2. Regex sơ bộ
        regex_conditions = [
            {
                "$or": [
                    {"title": {"$regex": part[:2], "$options": "i"}},
                    {"content": {"$regex": part[:2], "$options": "i"}},
                ]
            }
            for part in parts if len(part) >= 2
        ]

        # 3. Query các post ứng viên theo regex + visibility
        cursor = PostRepository.collection.find({
            "$or": regex_conditions,
            "status": "active",
            **visibility_condition
        })

        candidates = await cursor.to_list(length=None)

        # 4. Fuzzy filter + mutual block check
        matched = []
        for post in candidates:
            # Lấy thông tin account tạo post để kiểm tra mutual block
            author = await AccountRepository.collection.find_one({"email": post.get("createdBy")})
            if not author:
                continue

            author_blocks = author["userInfo"].get("blocks", [])
            # Nếu author đã block bạn → skip
            if my_email in author_blocks:
                continue

            # Fuzzy match
            title = post.get("title", "").lower()
            content = post.get("content", "").lower()
            score = max(
                fuzz.token_sort_ratio(title, keySearch.lower()),
                fuzz.token_sort_ratio(content, keySearch.lower())
            )
            if score >= 50:
                matched.append(post)

        # Sort theo createdAt giảm dần
        if matched:
            matched.sort(key=lambda p: p.get("createdAt"), reverse=True)
            return matched

        # Nếu không có bài viết nào phù hợp với keySearch và các điều kiện visibility, return None
        return None

    @staticmethod
    async def get_post_of_day() -> int:
        now = datetime.now(timezone.utc)
        start_of_day = datetime(now.year, now.month, now.day)
        end_of_day = start_of_day + timedelta(days=1) - timedelta(microseconds=1)

        posts_today = await PostRepository.collection.find({
            'createdAt': {
                '$gte': start_of_day,
                '$lte': end_of_day
            }
        }).to_list(None) 
        return len(posts_today)
    
    @staticmethod
    async def get_top_interacted_posts_in_week(limit: int = 10) -> List[dict]:
        now = datetime.now(timezone.utc)
        start_of_week = now - timedelta(days=7)

        posts = await PostRepository.collection.find({
            'createdAt': {'$gte': start_of_week},
            'status': 'active'
        }).to_list(length=None)

        def calculate_interaction_score(post: dict) -> int:
            react_score = sum([
                len(post.get('react', {}).get(react_type, []))
                for react_type in ['love', 'like', 'haha', 'wow', 'sad', 'angry']
            ])
            comment_score = len(post.get('comments', []))
            return react_score + comment_score

        post_dic = []
        for post in posts:
            post_dic.append(post)

        post_dic.sort(key=calculate_interaction_score, reverse=True)
        top_posts = post_dic[:limit]

        result = [
            {
                "postId": str(post["_id"]),
                "title": post.get("title", ""),
                "createdBy": post.get("createdBy", ""),
                "interactions": calculate_interaction_score(post)
            }
            for post in top_posts
        ]

        return result

    