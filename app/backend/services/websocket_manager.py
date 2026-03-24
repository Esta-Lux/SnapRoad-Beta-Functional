# SnapRoad - WebSocket Manager for Real-time Notifications
# Handles real-time updates for partner redemptions and customer proximity alerts

import json
import asyncio
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # Partner connections: {partner_id: {connection_id: websocket}}
        self.partner_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Customer connections: {customer_id: websocket}
        self.customer_connections: Dict[str, WebSocket] = {}
        # Staff connections for scan notifications
        self.staff_connections: Dict[str, WebSocket] = {}
        # Admin connections for moderation: {admin_id: websocket}
        self.admin_connections: Dict[str, WebSocket] = {}
        # Admin connections for live system monitor: {admin_id: websocket}
        self.admin_monitor_connections: Dict[str, WebSocket] = {}
    
    async def connect_partner(self, websocket: WebSocket, partner_id: str, connection_id: str):
        """Connect a partner staff member"""
        await websocket.accept()
        
        if partner_id not in self.partner_connections:
            self.partner_connections[partner_id] = {}
        
        self.partner_connections[partner_id][connection_id] = websocket
        
        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "partner_id": partner_id,
            "timestamp": datetime.now().isoformat()
        })
    
    async def disconnect_partner(self, partner_id: str, connection_id: str):
        """Disconnect a partner connection"""
        if partner_id in self.partner_connections:
            if connection_id in self.partner_connections[partner_id]:
                del self.partner_connections[partner_id][connection_id]
            if not self.partner_connections[partner_id]:
                del self.partner_connections[partner_id]
    
    async def connect_customer(self, websocket: WebSocket, customer_id: str):
        """Connect a customer for proximity notifications"""
        await websocket.accept()
        self.customer_connections[customer_id] = websocket
        
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "customer_id": customer_id,
            "timestamp": datetime.now().isoformat()
        })
    
    async def disconnect_customer(self, customer_id: str):
        """Disconnect a customer"""
        if customer_id in self.customer_connections:
            del self.customer_connections[customer_id]
    
    async def notify_partner_redemption(self, partner_id: str, redemption_data: dict):
        """Notify all connected partner staff about a new redemption"""
        if partner_id not in self.partner_connections:
            return
        
        message = {
            "type": "redemption",
            "data": redemption_data,
            "timestamp": datetime.now().isoformat()
        }
        
        disconnected = []
        for conn_id, websocket in self.partner_connections[partner_id].items():
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(conn_id)
        
        # Clean up disconnected
        for conn_id in disconnected:
            await self.disconnect_partner(partner_id, conn_id)
    
    async def notify_customer_nearby(self, partner_id: str, customer_id: str, offer_data: dict):
        """Notify partner staff that a customer with an offer is nearby"""
        if partner_id not in self.partner_connections:
            return
        
        message = {
            "type": "customer_nearby",
            "customer_id": customer_id,
            "offer": offer_data,
            "timestamp": datetime.now().isoformat()
        }
        
        disconnected = []
        for conn_id, websocket in self.partner_connections[partner_id].items():
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(conn_id)
        
        for conn_id in disconnected:
            await self.disconnect_partner(partner_id, conn_id)
    
    async def notify_customer_redeemed(self, customer_id: str, redemption_data: dict):
        """Notify customer that their offer was redeemed"""
        if customer_id not in self.customer_connections:
            return
        
        message = {
            "type": "offer_redeemed",
            "data": redemption_data,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            await self.customer_connections[customer_id].send_json(message)
        except Exception:
            await self.disconnect_customer(customer_id)
    
    async def broadcast_to_partner(self, partner_id: str, message: dict):
        """Broadcast a message to all partner connections"""
        if partner_id not in self.partner_connections:
            return
        
        disconnected = []
        for conn_id, websocket in self.partner_connections[partner_id].items():
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(conn_id)
        
        for conn_id in disconnected:
            await self.disconnect_partner(partner_id, conn_id)
    
    def get_partner_connection_count(self, partner_id: str) -> int:
        """Get the number of active connections for a partner"""
        if partner_id not in self.partner_connections:
            return 0
        return len(self.partner_connections[partner_id])

    async def connect_admin(self, websocket: WebSocket, admin_id: str):
        """Connect an admin for real-time moderation alerts."""
        await websocket.accept()
        self.admin_connections[admin_id] = websocket
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "admin_id": admin_id,
            "timestamp": datetime.now().isoformat()
        })

    async def disconnect_admin(self, admin_id: str):
        """Disconnect admin connection."""
        self.admin_connections.pop(admin_id, None)

    async def broadcast_incident(self, incident: dict):
        """Broadcast new incident to ALL connected admins."""
        message = {
            "type": "new_incident",
            "incident": incident,
            "timestamp": datetime.now().isoformat()
        }
        disconnected = []
        for admin_id, ws in self.admin_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(admin_id)
        for aid in disconnected:
            await self.disconnect_admin(aid)

    async def broadcast_moderation_update(self, incident_id: int, outcome: str):
        """Notify all admins when an incident is resolved."""
        message = {
            "type": "moderation_update",
            "incident_id": incident_id,
            "outcome": outcome,
            "timestamp": datetime.now().isoformat()
        }
        disconnected = []
        for admin_id, ws in self.admin_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(admin_id)
        for aid in disconnected:
            await self.disconnect_admin(aid)

    def get_admin_count(self) -> int:
        return len(self.admin_connections)

    async def connect_admin_monitor(self, websocket: WebSocket, admin_id: str):
        """Connect an admin for live telemetry monitor."""
        await websocket.accept()
        self.admin_monitor_connections[admin_id] = websocket
        await websocket.send_json({
            "type": "monitor_connected",
            "status": "connected",
            "admin_id": admin_id,
            "timestamp": datetime.now().isoformat(),
        })

    async def disconnect_admin_monitor(self, admin_id: str):
        self.admin_monitor_connections.pop(admin_id, None)

    async def broadcast_telemetry(self, event: dict):
        """Broadcast telemetry event to connected admin monitor clients."""
        message = {
            "type": "telemetry_event",
            "event": event,
            "timestamp": datetime.now().isoformat(),
        }
        disconnected = []
        for admin_id, ws in self.admin_monitor_connections.items():
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(admin_id)
        for aid in disconnected:
            await self.disconnect_admin_monitor(aid)

# Create singleton instance
ws_manager = ConnectionManager()
