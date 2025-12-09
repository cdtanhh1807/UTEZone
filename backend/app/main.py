from fastapi import FastAPI
from contextlib import asynccontextmanager
from controllers import announce_controller, ban_controller, comment_controller, complaint_controller, message_controller, policy_controller, post_controller, report_controller, search_controller, story_controller
from controllers import account_controller
from core.database import init_db 
from controllers import file_controller
from fastapi.middleware.cors import CORSMiddleware
from controllers.websocket_controller import websocket_endpoint

import asyncio  
from utils.permission_watcher import permission_watcher_loop 

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    perm_task = asyncio.create_task(permission_watcher_loop())     # <── thêm
    # yield
    try:
        yield
    finally:
        perm_task.cancel()                                         # <── thêm
        await perm_task

app = FastAPI(
    title="UTE Forum",
    description="Simple UTE Forum backend using FastAPI + MongoDB",
    version="1.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hoặc chỉ định ['http://localhost:5173']
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(post_controller.router, prefix="/post", tags=["post"])
app.include_router(policy_controller.router, prefix="/policy", tags=["policy"])
app.include_router(ban_controller.router, prefix="/ban", tags=["ban"])
app.include_router(report_controller.router, prefix="/report", tags=["report"])
app.include_router(complaint_controller.router, prefix="/complaint", tags=["complaint"])
app.include_router(account_controller.router, prefix="/account", tags=["account"])
app.include_router(search_controller.router, prefix="/search", tags=["search"])
app.include_router(file_controller.router, prefix="/file", tags=["file"])
app.include_router(comment_controller.router, prefix="/comment", tags=["comment"])
app.include_router(message_controller.router, prefix="/message", tags=["message"])
app.include_router(announce_controller.router, prefix="/announce", tags=["announce"])
app.include_router(story_controller.router, prefix="/story", tags=["story"])
app.add_websocket_route("/ws", websocket_endpoint)