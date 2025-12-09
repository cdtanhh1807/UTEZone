from fastapi import APIRouter, Depends, HTTPException
from typing import List
from dto.comment.request.add_comment_request import AddCommentRequest
from dto.comment.response.add_comment_response import AddCommentResponse
from services.interfaces.comment_service_interface import ICommentService
from repositories.comment_repository import CommentRepository
from dto.comment.response.update_comment_react_response import UpdateCommentReactResponse
from models.post_model import React
from models.post_model import CommentReact
from services.interfaces.post_service_interface import IPostService
from services.interfaces.comment_service_interface import ICommentService
from core.dependency import get_comment_service
from utils.security import get_current_user


router = APIRouter()

@router.post("/add_comment", response_model=AddCommentResponse)
async def add_comment(
    comment: AddCommentRequest,
    current_user: dict = Depends(get_current_user),
    service: ICommentService = Depends(get_comment_service)
):
    user_id = current_user.get("sub")
    return await service.add(comment, user_id)

@router.put("/{post_id}/comments/{comment_id}/react/{react_type}", response_model=UpdateCommentReactResponse)
async def toggle_comment_react(
    post_id: str,
    comment_id: str,
    react_type: str,
    current_user: dict = Depends(get_current_user),
    service: ICommentService = Depends(get_comment_service)
):
    user_email = current_user["sub"]
    valid_types = ["love", "like", "haha", "wow", "sad", "angry"]

    if react_type not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid react type")

    post = await service.find_by_id(post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = next((c for c in post.get("comments", []) if c["commentId"] == comment_id), None)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    react = CommentReact(**comment.get("reacts", {}))
    current_list = getattr(react, react_type)
    if user_email in current_list:
        current_list.remove(user_email)
    else:
        for r in valid_types:
            if r != react_type:
                other_list = getattr(react, r)
                if user_email in other_list:
                    other_list.remove(user_email)
        current_list.append(user_email)

    setattr(react, react_type, current_list)

    # Cập nhật DB
    await service.update_react(post_id, comment_id, react)

    return UpdateCommentReactResponse(message="Comment reaction updated", react=react)
