from dto.post_saved.request.rename_collection_request import RenameCollectionRequest
from dto.post_saved.response.rename_collection_response import RenameCollectionResponse
from models.base_model import bson_to_dict
from models.post_saved_model import PostSaved
from repositories.post_saved_repository import PostSavedRepository
from services.interfaces.post_saved_service_interface import IPostSavedService
from dto.post_saved.request.add_collection_request import AddCollectionRequest
from dto.post_saved.request.add_post_to_collection_request import AddPostToCollectionRequest
from dto.post_saved.request.delete_collection_request import DeleteCollectionRequest
from dto.post_saved.request.find_by_email_request import FindByEmailRequest
from dto.post_saved.request.remove_post_from_collection_request import RemovePostFromCollectionRequest
from dto.post_saved.response.add_collection_response import AddCollectionResponse
from dto.post_saved.response.add_post_to_collection_response import AddPostToCollectionResponse
from dto.post_saved.response.delete_collection_response import DeleteCollectionResponse
from dto.post_saved.response.find_by_email_response import FindByEmailResponse
from dto.post_saved.response.remove_post_from_collection_response import RemovePostFromCollectionResponse

class PostSavedServiceImpl(IPostSavedService):

    async def add_collection(self, req: AddCollectionRequest) -> AddCollectionResponse:
        dic = await PostSavedRepository.add_collection(req.email, req.collection_name)
        if dic:
            rs = PostSaved(**bson_to_dict(dic))
            return AddCollectionResponse(post_saved=rs)
        return AddCollectionResponse(post_saved=None)

    async def add_post_to_collection(self, req: AddPostToCollectionRequest) -> AddPostToCollectionResponse:
        dic = await PostSavedRepository.add_post_to_collection(req.email, req.collection_name, req.post_id)
        if dic:
            rs = PostSaved(**bson_to_dict(dic))
            return AddPostToCollectionResponse(post_saved=rs)
        return AddPostToCollectionResponse(post_saved=None)

    async def remove_post_from_collection(self, req: RemovePostFromCollectionRequest) -> RemovePostFromCollectionResponse:
        dic = await PostSavedRepository.remove_post_from_collection(req.email, req.collection_name, req.post_id)
        if dic:
            rs = PostSaved(**bson_to_dict(dic))
            return RemovePostFromCollectionResponse(post_saved=rs)
        return RemovePostFromCollectionResponse(post_saved=None)

    async def delete_collection(self, req: DeleteCollectionRequest) -> DeleteCollectionResponse:
        dic = await PostSavedRepository.delete_collection(req.email, req.collection_name)
        if dic:
            rs = PostSaved(**bson_to_dict(dic))
            return DeleteCollectionResponse(post_saved=rs)
        return DeleteCollectionResponse(post_saved=None)

    async def find_by_email(self, req: FindByEmailRequest) -> FindByEmailResponse:
        dic = await PostSavedRepository.find_by_email(req.email)
        if dic:
            rs = PostSaved(**bson_to_dict(dic))
            return FindByEmailResponse(post_saved=rs)
        return FindByEmailResponse(post_saved=None)

    async def rename_collection(self, req: RenameCollectionRequest) -> RenameCollectionResponse:
        dic = await PostSavedRepository.rename_collection(req.email, req.old_name, req.new_name)
        if "error" in dic:
            return RenameCollectionResponse(error=dic["error"])
        rs = PostSaved(**bson_to_dict(dic))
        return RenameCollectionResponse(post_saved=rs)