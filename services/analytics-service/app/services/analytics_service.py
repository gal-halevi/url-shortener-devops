from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from app.models.click_event import ClickEvent
from app.schemas.analytics import URLStats, UserSummary
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID


class AnalyticsService:
    
    @staticmethod
    def get_url_stats(db: Session, url_id: UUID, days: int = 30) -> Optional[URLStats]:
        """Get statistics for a specific URL"""
        
        # Get basic stats - ADD short_code to GROUP BY
        stats = db.query(
            ClickEvent.short_code,
            func.count(ClickEvent.id).label("total_clicks"),
            func.count(distinct(ClickEvent.ip_address)).label("unique_ips"),
            func.max(ClickEvent.clicked_at).label("last_clicked")
        ).filter(
            ClickEvent.url_id == url_id
        ).group_by(
            ClickEvent.short_code  # ADD THIS LINE
        ).first()
        
        if not stats or stats.total_clicks == 0:
            return None
        
        # Get click timeline (last N days)
        start_date = datetime.utcnow() - timedelta(days=days)
        timeline = db.query(
            func.date(ClickEvent.clicked_at).label("date"),
            func.count(ClickEvent.id).label("clicks")
        ).filter(
            ClickEvent.url_id == url_id,
            ClickEvent.clicked_at >= start_date
        ).group_by(
            func.date(ClickEvent.clicked_at)
        ).order_by(
            func.date(ClickEvent.clicked_at)
        ).all()
        
        click_timeline = [
            {"date": str(item.date), "clicks": item.clicks}
            for item in timeline
        ]
        
        return URLStats(
            url_id=url_id,
            short_code=stats.short_code,
            total_clicks=stats.total_clicks,
            unique_ips=stats.unique_ips,
            last_clicked=stats.last_clicked,
            click_timeline=click_timeline
        )
    
    @staticmethod
    def get_user_summary(db: Session, user_id: UUID) -> UserSummary:
        """Get summary analytics for a user"""
        
        # First, get all URL IDs for this user from urls table
        # Note: This requires joining with urls table
        from sqlalchemy import text
        
        # Get total URLs and clicks
        result = db.execute(
            text("""
                SELECT 
                    COUNT(DISTINCT u.id) as total_urls,
                    COUNT(ce.id) as total_clicks
                FROM urls u
                LEFT JOIN click_events ce ON u.id = ce.url_id
                WHERE u.user_id = :user_id
            """),
            {"user_id": str(user_id)}
        ).first()
        
        total_urls = result.total_urls or 0
        total_clicks = result.total_clicks or 0
        
        # Get top URLs by clicks
        top_urls = db.execute(
            text("""
                SELECT 
                    u.short_code,
                    COUNT(ce.id) as clicks
                FROM urls u
                LEFT JOIN click_events ce ON u.id = ce.url_id
                WHERE u.user_id = :user_id
                GROUP BY u.id, u.short_code
                ORDER BY clicks DESC
                LIMIT 10
            """),
            {"user_id": str(user_id)}
        ).fetchall()
        
        top_urls_list = [
            {"short_code": row.short_code, "clicks": row.clicks}
            for row in top_urls
        ]
        
        return UserSummary(
            user_id=user_id,
            total_urls=total_urls,
            total_clicks=total_clicks,
            top_urls=top_urls_list
        )