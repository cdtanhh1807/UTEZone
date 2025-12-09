from fastapi import APIRouter, UploadFile, File
from services.other.file_service import FileService

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = await FileService.upload_file(file)
    return {"file_id": file_id, "url": FileService.get_file_url(file_id)}

@router.get("/file/{file_id}")
async def get_file(file_id: str):
    url = FileService.get_file_url(file_id)
    return {"url": url}
