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

# Create singleton instance
ws_manager = ConnectionManager()
