from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid

Base = declarative_base()


class ClickEvent(Base):
    __tablename__ = "click_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    short_code = Column(String(10), nullable=False, index=True)
    url_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    
    # Request metadata
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    referer = Column(Text, nullable=True)
    
    # Geo data (optional for now)
    country = Column(String(2), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Timestamp
    clicked_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<ClickEvent(short_code='{self.short_code}', clicked_at='{self.clicked_at}')>"