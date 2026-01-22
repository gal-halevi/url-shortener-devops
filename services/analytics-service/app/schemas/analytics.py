from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List
from uuid import UUID

class ClickEventBase(BaseModel):
    short_code: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    referer: Optional[str] = None

class ClickEventCreate(ClickEventBase):
    url_id: Optional[UUID] = None

class ClickEventResponse(ClickEventBase):
    id: UUID
    clicked_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class URLStats(BaseModel):
    url_id: UUID
    short_code: str
    total_clicks: int
    unique_ips: int
    last_clicked: Optional[datetime]
    click_timeline: List[dict]  # [{date: "2026-01-20", clicks: 15}, ...]

class UserSummary(BaseModel):
    user_id: UUID
    total_urls: int
    total_clicks: int
    top_urls: List[dict]  # [{short_code: "abc", clicks: 100}, ...]