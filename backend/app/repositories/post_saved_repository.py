from typing import List, Optional
from core.database import db
from bson import ObjectId

class PostSavedRepository:

    collection = db["post_saved"]

    @staticmethod
    async def find_by_email(email: str) -> Optional[dict]:
        return await PostSavedRepository.collection.find_one({"email": email})

    @staticmethod
    async def add_collection(email: str, collection_name: str) -> dict | None:
        await PostSavedRepository.collection.update_one(
            {"email": email},
            {
                "$setOnInsert": {"email": email}
            },
            upsert=True
        )

        await PostSavedRepository.collection.update_one(
            {
                "email": email,
                "collections.name": {"$ne": collection_name}
            },
            {
                "$push": {
                    "collections": {
                        "name": collection_name,
                        "posts": []
                    }
                }
            }
        )
        return await PostSavedRepository.find_by_email(email)

    @staticmethod
    async def add_post_to_collection(email: str, collection_name: str, post_id: str) -> dict | None:
        await PostSavedRepository.collection.update_one(
            {
                "email": email,
                "collections.name": collection_name
            },
            {
                "$addToSet": {
                    "collections.$.posts": post_id
                }
            }
        )
        return await PostSavedRepository.find_by_email(email)

    @staticmethod
    async def remove_post_from_collection(email: str, collection_name: str, post_id: str) -> dict | None:
        await PostSavedRepository.collection.update_one(
            {
                "email": email,
                "collections.name": collection_name
            },
            {
                "$pull": {
                    "collections.$.posts": post_id
                }
            }
        )
        return await PostSavedRepository.find_by_email(email)

    @staticmethod
    async def delete_collection(email: str, collection_name: str) -> dict | None:
        result = await PostSavedRepository.collection.update_one(
            {"email": email},
            {
                "$pull": {
                    "collections": {"name": collection_name}
                }
            }
        )

        if result.modified_count == 0:
            return None

        return await PostSavedRepository.find_by_email(email)