from pydantic import BaseModel

class SendMessageRequest(BaseModel):
    receiver_email: str
    content: str
