from pydantic import BaseModel, Field
from datetime import datetime


class ConversationResponse(BaseModel):
    other_email: str
    full_name: str
    last_message: str
    last_time: datetime
    has_new: bool