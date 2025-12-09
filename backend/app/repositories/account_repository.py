from bson import ObjectId
from core.database import db
from typing import Optional
from rapidfuzz import fuzz


class AccountRepository:

    collection = db["account"]

    @staticmethod
    async def find_by_email(email: str) -> Optional[dict]:
        doc = await AccountRepository.collection.find_one({"email": email})
        if doc: return doc
        return None
    
    @staticmethod
    async def find_by_email_user(email: str, myAccount: dict) -> Optional[dict]:
        my_email = myAccount.get("email")
        my_blocks = myAccount["userInfo"].get("blocks", [])

        # Query account theo email
        doc = await AccountRepository.collection.find_one({"email": email})

        if not doc:
            return None

        # 1. Kiểm tra nếu bạn đã block account này → loại bỏ
        if email in my_blocks:
            return None

        # 2. Kiểm tra nếu account này đã block bạn → loại bỏ
        author_blocks = doc["userInfo"].get("blocks", [])
        if my_email in author_blocks:
            return None

        return doc

    
    @staticmethod
    async def insert(account: dict) -> Optional[dict]:
        rs = await AccountRepository.collection.insert_one(account)
        new_rs = await AccountRepository.collection.find_one({"_id": rs.inserted_id})
        return new_rs
    
    @staticmethod
    async def change_password(email: str, new_password: str) -> Optional[dict]:
        result = await AccountRepository.collection.update_one(
            {"email": email},
            {"$set": {"password": new_password}}
        )
        
        if result.modified_count == 0:
            return None

        updated_account = await AccountRepository.collection.find_one({"email": email})
        return updated_account
    
    @staticmethod
    async def find_all() -> list[dict]:
        accounts = []
        async for account in AccountRepository.collection.find({"hidden": {"$exists": False}}):
            accounts.append(account)
        return accounts
    
    @staticmethod
    async def find_by_id(account_id: str) -> dict | None:
        return await AccountRepository.collection.find_one({"_id": ObjectId(account_id)})

    @staticmethod
    async def update(data: dict) -> dict | None:
        account_id = data.pop("id", None)
        if not account_id: return None
        await AccountRepository.collection.update_one(
            {"_id": ObjectId(account_id)},
            {"$set": data}
        )
        return await AccountRepository.find_by_id(account_id)
    
    @staticmethod
    async def find_by_fullname(keySearch: str, myAccount: dict) -> Optional[list[dict]]:
        from rapidfuzz import fuzz

        my_email = myAccount.get("email")
        my_blocks = myAccount["userInfo"].get("blocks", [])

        # 1. Tách keySearch thành các từ
        parts = keySearch.lower().split()

        # 2. Tạo regex sơ bộ
        regex_conditions = [
            {
                "userInfo.fullName": {
                    "$regex": part[:2],
                    "$options": "i"
                }
            }
            for part in parts if len(part) >= 2
        ]

        if not regex_conditions:
            regex_conditions = [{"userInfo.fullName": {"$regex": ".*"}}]

        # 3. Query sơ bộ: loại bỏ account bị block bởi bạn
        cursor = AccountRepository.collection.find({
            "$or": regex_conditions,
            "email": {"$nin": my_blocks}   # bạn đã block
        })

        candidates = await cursor.to_list(length=None)

        if not candidates:
            return None

        # 4. Fuzzy filter + kiểm tra mutual block (tài khoản được tìm không block bạn)
        results = []
        for acc in candidates:
            # Check mutual block
            acc_blocks = acc["userInfo"].get("blocks", [])
            if myAccount.get("email") in acc_blocks:
                continue  # account này đã block bạn, loại bỏ

            # Fuzzy match
            full_name = acc["userInfo"]["fullName"]
            score = fuzz.token_sort_ratio(full_name.lower(), keySearch.lower())
            if score >= 50:
                results.append(acc)

        return results if results else None


    
    @staticmethod
    async def find_by_department(department: str, myAccount: dict) -> Optional[list[dict]]:
        my_email = myAccount.get("email")
        my_blocks = myAccount["userInfo"].get("blocks", [])

        # Query sơ bộ: theo department, loại bỏ account bị bạn block
        cursor = AccountRepository.collection.find(
            {
                "userInfo.department": department,
                "email": {"$nin": my_blocks}
            }
        ).limit(20)

        candidates = await cursor.to_list(length=20)

        # Lọc tiếp những account đã block bạn
        results = [
            acc for acc in candidates
            if my_email not in acc["userInfo"].get("blocks", [])
        ]

        return results if results else None




    



