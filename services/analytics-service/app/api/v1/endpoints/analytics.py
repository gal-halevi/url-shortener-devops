from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import URLStats, UserSummary
from uuid import UUID
from typing import Optional
from datetime import datetime  # Add this import

router = APIRouter()


@router.get("/urls/{url_id}/stats", response_model=URLStats)
def get_url_statistics(
    url_id: UUID,
    days: int = Query(default=30, ge=1, le=365, description="Number of days to include in timeline"),
    db: Session = Depends(get_db)
):
    """
    Get analytics statistics for a specific URL
    
    - **url_id**: UUID of the URL
    - **days**: Number of days to include in click timeline (default: 30)
    """
    stats = AnalyticsService.get_url_stats(db, url_id, days)
    
    if not stats:
        raise HTTPException(
            status_code=404,
            detail="No analytics data found for this URL"
        )
    
    return stats


@router.get("/user/{user_id}/summary", response_model=UserSummary)
def get_user_summary(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get analytics summary for a user
    
    - **user_id**: UUID of the user
    
    Returns:
    - Total number of URLs created
    - Total clicks across all URLs
    - Top 10 URLs by click count
    """
    summary = AnalyticsService.get_user_summary(db, user_id)
    
    return summary


@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "analytics-service",
        "timestamp": datetime.utcnow().isoformat() + "Z"  # Add timestamp
    }