import time
import json
from jose import JWTError
from passlib.context import CryptContext
from typing import Optional
from fastapi import HTTPException, status
from redis import RedisError
import requests
from dto.account.request.follow_block_request import FollowBlockRequest
from dto.account.request.get_all_account_request import GetAllAccountRequest
from dto.account.request.google_auth_request import GoogleAuthRequest
from dto.account.request.register_user_request import RegisterUserRequest
from dto.account.request.update_account_request import UpdateAccountRequest
from dto.account.response.follow_block_response import FollowBlockResponse
from dto.account.response.get_all_account_response import GetAllAccountResponse
from dto.account.response.register_user_response import RegisterUserResponse
from dto.account.response.update_account_response import UpdateAccountResponse
from models.account_model import Account
from repositories.account_repository import AccountRepository
from services.interfaces.account_service_interface import IAccountService
from models.base_model import bson_to_dict
from utils.security import decode_access_token
from core.redis import set_otp, get_otp, delete_otp, blacklist_token
from core.mailer import send_email
import random
from dto.auth.request.otp_request import OTPRequest
from dto.auth.response.otp_response import OTPResponse
from dto.account.request.login_request import LoginRequest
from dto.account.request.logout_request import LogoutRequest
from dto.account.response.logout_response import LogoutResponse
from dto.account.request.forgot_password_request import ForgotPasswordRequest
from dto.account.response.forgot_password_response import ForgotPasswordResponse

import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AccountServiceImpl(IAccountService):

    async def register_user(self, register_user_req: RegisterUserRequest) -> Optional[RegisterUserResponse]:
        existing = await AccountRepository.find_by_email(register_user_req.email)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
        otp = str(random.randint(100000, 999999))

        hashed_pw = pwd_context.hash(register_user_req.password)
        register_user_req.password = hashed_pw

        await set_otp(f"otp:{register_user_req.email}", otp, expire=180)

        user_data = register_user_req.model_dump()
        await set_otp(f"user:{register_user_req.email}", json.dumps(user_data), expire=180)

        await send_email(
            register_user_req.email,
            "[UTEForum]: Verify your account",
            f"Your OTP is: {otp}"
        )

        return None

    async def authenticate_user(self, login_req: LoginRequest) -> Optional[Account]:
        account = await AccountRepository.find_by_email(login_req.username)
        if not account:
            return None
        if not pwd_context.verify(login_req.password, account["password"]):
            return None
        return Account(**bson_to_dict(account))

    async def verify_otp(self, otp_req: OTPRequest) -> Optional[RegisterUserResponse]:
        stored_otp = await get_otp(f"otp:{otp_req.email}")
        if not stored_otp or stored_otp != otp_req.otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )

        user_data_json = await get_otp(f"user:{otp_req.email}")
        if not user_data_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User data expired, please register again"
            )

        user_data = json.loads(user_data_json)

        #Cấp quyền
        user_data["permission"] = {
            "pernum": "11",
            "validity": "3333-12-12T12:00:00Z"
        }

        result = await AccountRepository.insert(user_data)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create account"
            )

        await delete_otp(f"otp:{otp_req.email}")
        await delete_otp(f"user:{otp_req.email}")

        return RegisterUserResponse(account=Account(**bson_to_dict(result)))
    
    async def logout_user(self, logout_req: LogoutRequest) -> Optional[LogoutResponse]:
        try:
            payload = decode_access_token(logout_req.token)
            exp = payload.get("exp")
            if not exp:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

            ttl = exp - int(time.time())

            if ttl <= 0:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")

            await blacklist_token(logout_req.token, ttl)
            return LogoutResponse(message="Logout successful", success=True)

        except JWTError as e:
            raise HTTPException(status_code=401, detail="Invalid JWT token")
        except RedisError as e:
            raise HTTPException(status_code=500, detail="Logout failed due to server error")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        
    async def forgot_password(self, forgot_password_req: ForgotPasswordRequest) -> None:
        existing = await AccountRepository.find_by_email(forgot_password_req.email)
        if not existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account not found")
    
        otp = str(random.randint(100000, 999999))

        await set_otp(f"otp:{forgot_password_req.email}", otp, expire=180)

        user_data = forgot_password_req.model_dump()
        await set_otp(f"user:{forgot_password_req.email}", json.dumps(user_data), expire=180)

        await send_email(
            forgot_password_req.email,
            "[UTEForum]: Authenticate to change password",
            f"Your OTP is: {otp}"
        )

        return None

    async def change_password(self, change_password_req: ForgotPasswordRequest) -> Optional[ForgotPasswordResponse]:
        stored_otp = await get_otp(f"otp:{change_password_req.email}")
        if not stored_otp or stored_otp != change_password_req.otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP"
            )
        
        user_data_json = await get_otp(f"user:{change_password_req.email}")
        if not user_data_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User data expired, please try again"
            )

        hashed_pw = pwd_context.hash(change_password_req.new_password)

        result = await AccountRepository.change_password(change_password_req.email, hashed_pw)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update account"
            )

        await delete_otp(f"otp:{change_password_req.email}")
        await delete_otp(f"user:{change_password_req.email}")

        return ForgotPasswordResponse(message="Success", success=True)
    
    async def login_with_google(self, google_req: GoogleAuthRequest) -> Optional[Account]:
        # GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        GOOGLE_CLIENT_ID = "11513787683-k2jko2vekvh90c37sgbnftbqc07eq245.apps.googleusercontent.com"

        response = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": google_req.token}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")

        data = response.json()
        email = data.get("email")
        # name = data.get("name")
        # picture = data.get("picture")

        if not email:
            raise HTTPException(status_code=400, detail="Email not found in Google token")

        existing_user = await AccountRepository.find_by_email(email)

        if not existing_user:
            new_user = {
                "type": "google",
                "email": email,
                "password": None,
                "role": "user",
                "status": "active"
            }
            created = await AccountRepository.insert(new_user)
            user = created
        else:
            user = existing_user

        return Account(**bson_to_dict(user))
    
    async def get_all(self, account_list: GetAllAccountRequest) -> Optional[GetAllAccountResponse]:
        accounts = await AccountRepository.find_all()
        return GetAllAccountResponse(account_list=[Account(**bson_to_dict(account)) for account in accounts]) 
    
    async def update(self, account_req: UpdateAccountRequest) -> Optional[UpdateAccountResponse]:
        update_account = await AccountRepository.update(account_req.model_dump(exclude_none=True))
        if update_account:
            return UpdateAccountResponse(account=Account(**bson_to_dict(update_account)))
        return None
    
    async def get_role_by_email(self, email: str) -> Optional[str]:
        dic_account = await AccountRepository.find_by_email(email)
        if not dic_account:
            return None
        account = Account(**bson_to_dict(dic_account))
        return account.role

    
    # async def update_permission_redis(self, violatorEmail: str, violationId: str):


    #     update_account = await AccountRepository.update(account_req.model_dump(exclude_none=True))
    #     if update_account:
    #         return UpdateAccountResponse(account=Account(**bson_to_dict(update_account)))
    #     return None
    
    async def follow(self, req: FollowBlockRequest) -> Optional[FollowBlockResponse]:
        dic_owner = await AccountRepository.find_by_email(req.owner)
        dic_client = await AccountRepository.find_by_email(req.client)
        if dic_client:
            owner: Account = Account(**bson_to_dict(dic_owner))
            client: Account = Account(**bson_to_dict(dic_client))
            owner.userInfo.followed.append(dic_client.get("email"))
            if client.email in owner.userInfo.blocks:
                owner.userInfo.blocks.remove(client.email)
            client.userInfo.followers.append(dic_owner.get("email"))
            dic_rs_owner = await AccountRepository.update(owner.model_dump(exclude_none=True))
            dic_rs_client = await AccountRepository.update(client.model_dump(exclude_none=True))
            if dic_rs_owner and dic_rs_client:
                return FollowBlockResponse(success=True, message="Ok")
        return FollowBlockResponse(success=False, message="Error")
    
    async def un_follow(self, req: FollowBlockRequest) -> Optional[FollowBlockResponse]:
        dic_owner = await AccountRepository.find_by_email(req.owner)
        dic_client = await AccountRepository.find_by_email(req.client)
        if dic_client:
            owner: Account = Account(**bson_to_dict(dic_owner))
            client: Account = Account(**bson_to_dict(dic_client))
            if client.email in owner.userInfo.followed:
                owner.userInfo.followed.remove(client.email)
            if owner.email in client.userInfo.followers:
                client.userInfo.followers.remove(owner.email)
            dic_rs_owner = await AccountRepository.update(owner.model_dump(exclude_none=True))
            dic_rs_client = await AccountRepository.update(client.model_dump(exclude_none=True))
            if dic_rs_owner and dic_rs_client:
                return FollowBlockResponse(success=True, message="Ok")
        return FollowBlockResponse(success=False, message="Error")
    
    async def block(self, req: FollowBlockRequest) -> Optional[FollowBlockResponse]:
        dic_owner = await AccountRepository.find_by_email(req.owner)
        dic_client = await AccountRepository.find_by_email(req.client)
        if dic_client:
            owner: Account = Account(**bson_to_dict(dic_owner))
            client: Account = Account(**bson_to_dict(dic_client))
            owner.userInfo.blocks.append(client.email)
            if client.email in owner.userInfo.followed:
                owner.userInfo.followed.remove(client.email)
            if client.email in owner.userInfo.followers:
                owner.userInfo.followers.remove(client.email)
            if owner.email in client.userInfo.followed:
                client.userInfo.followed.remove(owner.email)
            if owner.email in client.userInfo.followers:    
                client.userInfo.followers.remove(owner.email)
            dic_rs_owner = await AccountRepository.update(owner.model_dump(exclude_none=True))
            dic_rs_client = await AccountRepository.update(client.model_dump(exclude_none=True))
            if dic_rs_owner and dic_rs_client:
                return FollowBlockResponse(success=True, message="Ok")
        return FollowBlockResponse(success=False, message="Error")
    
    async def un_block(self, req: FollowBlockRequest) -> Optional[FollowBlockResponse]:
        dic_owner = await AccountRepository.find_by_email(req.owner)
        dic_client = await AccountRepository.find_by_email(req.client)
        if dic_client:
            owner: Account = Account(**bson_to_dict(dic_owner))
            if dic_client.get("email") in owner.userInfo.blocks:
                owner.userInfo.blocks.remove(dic_client.get("email"))
            dic_rs_owner = await AccountRepository.update(owner.model_dump(exclude_none=True))
            if dic_rs_owner:
                return FollowBlockResponse(success=True, message="Ok")
        return FollowBlockResponse(success=False, message="Error")
    

    async def update_user_info(self, email: str, user_info: dict) -> bool:
        update_data = {f"userInfo.{k}": v for k, v in user_info.items() if v is not None}

        if not update_data:
            return False

        result = await AccountRepository.collection.update_one(
            {"email": email},
            {"$set": update_data}
        )

        return result.modified_count > 0
    
    async def get_account_by_email(self, email: str) -> Optional[Account]:
        dic = await AccountRepository.find_by_email(email)
        account_data = await AccountRepository.find_by_email_user(email, dic)
        if not account_data:
            return None
        return Account(**bson_to_dict(account_data))
