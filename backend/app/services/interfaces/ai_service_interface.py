from abc import ABC, abstractmethod
from typing import Optional
from dto.ai.request.summarize_post_request import SummarizePostRequest
from dto.ai.response.summarize_post_response import SummarizePostResponse


class IAIService(ABC):

    @abstractmethod
    async def summarize_post(self, req: SummarizePostRequest) -> SummarizePostResponse:
        pass

    @abstractmethod
    async def get_existing_summary(self, post_id: str) -> Optional[SummarizePostResponse]:
        pass