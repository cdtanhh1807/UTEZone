# from typing import Dict, List, Optional
# from fastapi import WebSocket
# import json
# import uuid

# class MeetingConnectionManager:
#     """Quản lý kết nối WebSocket cho Meeting Rooms"""
    
#     def __init__(self):
#         # room_id -> {email: WebSocket}
#         self.rooms: Dict[str, Dict[str, WebSocket]] = {}
#         # socket_id -> room_id
#         self.socket_to_room: Dict[str, str] = {}
#         # socket_id -> email
#         self.socket_to_email: Dict[str, str] = {}
#         # socket_id -> WebSocket (lưu reference để dùng id() làm key)
#         self.sockets: Dict[str, WebSocket] = {}
    
#     def _get_socket_id(self, websocket: WebSocket) -> str:
#         """Tạo ID duy nhất cho websocket connection"""
#         return str(id(websocket))  # Dùng Python object id
    
#     async def connect_to_room(self, room_id: str, email: str, websocket: WebSocket):
#         """Thêm user vào room"""
#         socket_id = self._get_socket_id(websocket)
        
#         if room_id not in self.rooms:
#             self.rooms[room_id] = {}
        
#         self.rooms[room_id][email] = websocket
#         self.socket_to_room[socket_id] = room_id
#         self.socket_to_email[socket_id] = email
#         self.sockets[socket_id] = websocket
    
#     def disconnect_from_room(self, websocket: WebSocket):
#         """Xóa user khỏi room khi disconnect"""
#         socket_id = self._get_socket_id(websocket)
#         room_id = self.socket_to_room.get(socket_id)
#         email = self.socket_to_email.get(socket_id)
        
#         if room_id and room_id in self.rooms:
#             if email and email in self.rooms[room_id]:
#                 del self.rooms[room_id][email]
            
#             # Xóa room nếu trống
#             if not self.rooms[room_id]:
#                 del self.rooms[room_id]
        
#         # Clean up
#         self.socket_to_room.pop(socket_id, None)
#         self.socket_to_email.pop(socket_id, None)
#         self.sockets.pop(socket_id, None)
        
#         return room_id, email
    
#     async def broadcast_to_room(self, room_id: str, message: dict, exclude_email: Optional[str] = None):
#         """Gửi message đến tất cả trong room, trừ exclude_email"""
#         if room_id not in self.rooms:
#             return
            
#         dead_sockets = []
#         for email, ws in list(self.rooms[room_id].items()):
#             if exclude_email and email == exclude_email:
#                 continue
#             try:
#                 await ws.send_text(json.dumps(message, default=str))
#             except:
#                 dead_sockets.append(email)
        
#         # Clean up dead sockets
#         for email in dead_sockets:
#             if room_id in self.rooms and email in self.rooms[room_id]:
#                 del self.rooms[room_id][email]
    
#     async def send_to_user(self, room_id: str, target_email: str, message: dict):
#         """Gửi message đến user cụ thể trong room (cho WebRTC signaling)"""
#         if room_id not in self.rooms or target_email not in self.rooms[room_id]:
#             return
        
#         try:
#             await self.rooms[room_id][target_email].send_text(json.dumps(message, default=str))
#         except:
#             pass
    
#     def get_room_participants(self, room_id: str) -> List[str]:
#         """Lấy danh sách email trong room"""
#         return list(self.rooms.get(room_id, {}).keys())
    
#     def is_in_room(self, room_id: str, email: str) -> bool:
#         return email in self.rooms.get(room_id, {})

# # Singleton instance
# meeting_manager = MeetingConnectionManager()









from typing import Dict, List, Optional
from fastapi import WebSocket
import json

class MeetingConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Dict[str, WebSocket]] = {}
        self.socket_to_room: Dict[str, str] = {}
        self.socket_to_email: Dict[str, str] = {}
        self.sockets: Dict[str, WebSocket] = {}
    
    def _get_socket_id(self, websocket: WebSocket) -> str:
        return str(id(websocket))
    
    async def connect_to_room(self, room_id: str, email: str, websocket: WebSocket):
        socket_id = self._get_socket_id(websocket)
        
        if room_id not in self.rooms:
            self.rooms[room_id] = {}
        
        self.rooms[room_id][email] = websocket
        self.socket_to_room[socket_id] = room_id
        self.socket_to_email[socket_id] = email
        self.sockets[socket_id] = websocket
    
    async def disconnect_from_room(self, websocket: WebSocket):
        socket_id = self._get_socket_id(websocket)
        room_id = self.socket_to_room.get(socket_id)
        email = self.socket_to_email.get(socket_id)
        
        if room_id and room_id in self.rooms:
            if email and email in self.rooms[room_id]:
                del self.rooms[room_id][email]
            
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        
        self.socket_to_room.pop(socket_id, None)
        self.socket_to_email.pop(socket_id, None)
        self.sockets.pop(socket_id, None)
        
        return room_id, email
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_email: Optional[str] = None):
        if room_id not in self.rooms:
            return
            
        dead_sockets = []
        for email, ws in list(self.rooms[room_id].items()):
            if exclude_email and email == exclude_email:
                continue
            try:
                await ws.send_text(json.dumps(message, default=str))
            except:
                dead_sockets.append(email)
        
        for email in dead_sockets:
            if room_id in self.rooms and email in self.rooms[room_id]:
                del self.rooms[room_id][email]
    
    async def send_to_user(self, room_id: str, target_email: str, message: dict):
        if room_id not in self.rooms or target_email not in self.rooms[room_id]:
            return
        
        try:
            await self.rooms[room_id][target_email].send_text(json.dumps(message, default=str))
        except:
            pass
    
    def get_room_participants(self, room_id: str) -> List[str]:
        return list(self.rooms.get(room_id, {}).keys())
    
    def is_in_room(self, room_id: str, email: str) -> bool:
        return email in self.rooms.get(room_id, {})

meeting_manager = MeetingConnectionManager()