import aiohttp
import asyncio
from typing import Optional
from datetime import datetime
from bson import ObjectId
from typing import List
from services.interfaces.ai_service_interface import IAIService
from dto.ai.request.summarize_post_request import SummarizePostRequest
from dto.ai.response.summarize_post_response import SummarizePostResponse
from repositories.post_repository import PostRepository
from core.database import db
from core.ollama_client import get_ollama_client, OllamaSession
from services.other.file_service import FileService

class AIServiceImpl(IAIService):
    """
    Implementation của AI Service.
    Sử dụng OllamaClient từ core.ollama_client.
    """
    
    # Config cho summarization
    MODEL = "llama3.1:8b"

    VISION_MODEL = "qwen2.5vl:7b"  # Thêm config cho model vision 

    TEMPERATURE = 0.3
    # MAX_TOKENS = 200
    # TIMEOUT = 60
    MAX_TOKENS = 500
    TIMEOUT = 120
    
    SYSTEM_PROMPT = """Bạn là trợ lý AI cho diễn đàn sinh viên Trường Đại học Sư phạm Kỹ thuật Thành phố Hồ Chí Minh (hcmute). 
Tóm tắt bài đăng ngắn gọn, súc tích bằng tiếng Việt trong tối đa 5 câu."""

    SYSTEM_PROMPT_VISION = """Bạn là trợ lý AI cho diễn đàn sinh viên HCMUTE. 
Hãy phân tích bài đăng dựa trên:
1. Tiêu đề và nội dung văn bản
2. Nội dung hình ảnh đính kèm (nếu có)

Tóm tắt ngắn gọn, súc tích bằng tiếng Việt, tối đa 5 câu. 
Nếu ảnh chứa thông tin quan trọng (infographic, poster sự kiện, ảnh minh họa...), hãy đề cập đến."""
    
    SUMMARY_PROMPT = """Tóm tắt bài đăng sau:

TIÊU ĐỀ: {title}

NỘI DUNG: {content}

TÓM TẮT (tối đa 5 câu):"""

    VISION_PROMPT = """Phân tích bài đăng sau:

TIÊU ĐỀ: {title}

NỘI DUNG: {content}

{image_context}

Hãy tóm tắt nội dung chính, kết hợp thông tin từ văn bản và hình ảnh (nếu có).

TÓM TẮT (tối đa 5 câu):"""

    def __init__(self):
        """Khởi tạo service với OllamaClient"""
        # Có thể truyền config khác nếu cần
        self.ollama = get_ollama_client(
            model=self.MODEL,

            vision_model=self.VISION_MODEL,  # Thêm tham số vision_model

            timeout=self.TIMEOUT
        )

    async def summarize_post(self, req: SummarizePostRequest) -> SummarizePostResponse:
        """Tóm tắt bài viết sử dụng Ollama"""
        try:
            # Validate ObjectId
            try:
                obj_id = ObjectId(req.post_id)
            except:
                return self._error_response(req.post_id, "Invalid post_id format")
            
            # Lấy post từ repository
            post = await PostRepository.find_by_id(req.post_id)
            if not post:
                return self._error_response(req.post_id, "Post not found")
            
            title = post.get("title", "")
            content = post.get("content", "")

            media_files = post.get("thumbnails", []) #Them file url
            
            # Check cache nếu không force refresh
            if not req.force_refresh and post.get("ai_summary"):
                return SummarizePostResponse(
                    success=True,
                    post_id=req.post_id,
                    title=title,
                    summary=post["ai_summary"],
                    original_content=content,
                    generated_at=str(post.get("ai_summary_generated_at", "")),
                    cached=True
                )
            
            if media_files and len(media_files) > 0:
                summary = await self._call_ollama_with_vision(title, content, media_files)
            else:

                text_to_summarize = content if content else title

                # Không có ảnh, dùng text model như cũ
                # if len(content) < 30:
                if len(text_to_summarize) < 30:
                    # summary = content if content else "Không có nội dung"
                    summary = text_to_summarize if text_to_summarize else "Không có nội dung"
                else:
                    summary = await self._call_ollama_text(title, content)

            # Nếu content quá ngắn, không cần tóm tắt
            # if len(content) < 30:
            #     summary = content if content else "Không có nội dung"
            # else:
            #     # Gọi Ollama để tóm tắt
            #     summary = await self._call_ollama(title, content)
            
            # Cập nhật cache vào database
            await db.post.update_one(
                {"_id": obj_id},
                {
                    "$set": {
                        "ai_summary": summary,
                        "ai_summary_generated_at": datetime.utcnow(),
                        "ai_summary_model": self.MODEL,
                        "ai_summary_has_vision": bool(media_files)
                    }
                }
            )
            
            return SummarizePostResponse(
                success=True,
                post_id=req.post_id,
                title=title,
                summary=summary,
                original_content=content,
                generated_at=datetime.utcnow().isoformat(),
                cached=False
            )
            
        except Exception as e:
            return self._error_response(req.post_id, str(e))
    
    async def get_existing_summary(self, post_id: str) -> Optional[SummarizePostResponse]:
        """Lấy summary từ cache"""
        try:
            post = await PostRepository.find_by_id(post_id)
            if not post or not post.get("ai_summary"):
                return None
            
            return SummarizePostResponse(
                success=True,
                post_id=post_id,
                title=post.get("title", ""),
                summary=post["ai_summary"],
                original_content=post.get("content", ""),
                generated_at=str(post.get("ai_summary_generated_at", "")),
                cached=True
            )
        except:
            return None
    
    async def _call_ollama_text(self, title: str, content: str) -> str:
        """Gọi Ollama để tóm tắt sử dụng OllamaSession"""
        # Truncate nếu quá dài
        truncated = content[:1500] + "..." if len(content) > 1500 else content
        
        prompt = self.SUMMARY_PROMPT.format(title=title, content=truncated)
        
        # Dùng context manager để tự động đóng session
        async with OllamaSession(self.ollama) as client:
            try:
                response = await client.generate(
                    prompt=prompt,
                    system=self.SYSTEM_PROMPT,
                    temperature=self.TEMPERATURE,
                    num_predict=self.MAX_TOKENS
                )
                
                # Clean up
                summary = response.strip()
                if len(summary) > 500:  # Tăng limit vì cho phép 5 câu
                    summary = summary[:497] + "..."
                
                return summary if summary else "Không thể tóm tắt bài viết này"
                
            except Exception as e:
                # Fallback nếu AI fail
                print(f"Ollama error: {e}")
                return f"{content[:100]}..." if len(content) > 100 else content


    async def _call_ollama_with_vision(
        self, 
        title: str, 
        content: str, 
        media_files: List[str]
    ) -> str:
        """Gọi Ollama vision model với ảnh từ MinIO"""
        
        # Lấy presigned URLs cho ảnh (tối đa 3 ảnh để tránh quá tải)
        image_urls = []
        for file_id in media_files[:3]:
            try:
                url = FileService.get_file_url(file_id, expires_seconds=300)  # 5 phút
                image_urls.append(url)
            except Exception as e:
                print(f"Error getting URL for {file_id}: {e}")
        
        if not image_urls:
            # Fallback về text nếu không lấy được URL
            return await self._call_ollama_text(title, content)
        
        truncated = content[:1000] + "..." if len(content) > 1000 else content
        
        image_context = f"Có {len(image_urls)} hình ảnh đính kèm trong bài đăng."
        
        prompt = self.VISION_PROMPT.format(
            title=title,
            content=truncated,
            image_context=image_context
        )

        async with OllamaSession(self.ollama) as client:
            try:
                response = await client.generate_with_image(
                    prompt=prompt,
                    image_urls=image_urls,
                    system=self.SYSTEM_PROMPT_VISION,
                    temperature=self.TEMPERATURE,
                    num_predict=self.MAX_TOKENS
                )
                
                summary = response.strip()
                if len(summary) > 800:
                    summary = summary[:797] + "..."
                
                return summary if summary else "Không thể phân tích bài viết này"
                
            except Exception as e:
                print(f"Ollama vision error: {e}")
                # Fallback về text nếu vision fail
                return await self._call_ollama_text(title, content)
    
    def _error_response(self, post_id: str, error: str) -> SummarizePostResponse:
        """Helper tạo error response"""
        return SummarizePostResponse(
            success=False,
            post_id=post_id,
            title="",
            summary="",
            original_content="",
            error_message=error
        )