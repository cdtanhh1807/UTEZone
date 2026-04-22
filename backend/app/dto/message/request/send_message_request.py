from typing import List, Optional

from pydantic import BaseModel

class SendMessageRequest(BaseModel):
    receiver_email: str
    content: str
    file: Optional[List[str]] = None
    media: Optional[List[str]] = None
