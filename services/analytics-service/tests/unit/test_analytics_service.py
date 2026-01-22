import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import URLStats, UserSummary


class TestAnalyticsService:
    
    def test_get_url_stats_success(self):
        """Test getting URL stats with valid data"""
        # Arrange
        mock_db = MagicMock()
        url_id = uuid4()
        
        # Mock the basic stats query
        mock_stats = MagicMock()
        mock_stats.short_code = "test123"
        mock_stats.total_clicks = 10
        mock_stats.unique_ips = 5
        mock_stats.last_clicked = datetime.now(timezone.utc)
        
        mock_db.query.return_value.filter.return_value.group_by.return_value.first.return_value = mock_stats
        
        # Mock the timeline query
        mock_timeline_item = MagicMock()
        mock_timeline_item.date = datetime.now(timezone.utc).date()
        mock_timeline_item.clicks = 10
        
        mock_db.query.return_value.filter.return_value.group_by.return_value.order_by.return_value.all.return_value = [mock_timeline_item]
        
        # Act
        result = AnalyticsService.get_url_stats(mock_db, url_id, days=30)
        
        # Assert
        assert result is not None
        assert isinstance(result, URLStats)
        assert result.short_code == "test123"
        assert result.total_clicks == 10
        assert result.unique_ips == 5
        assert len(result.click_timeline) == 1
    
    def test_get_url_stats_no_data(self):
        """Test getting URL stats when no data exists"""
        # Arrange
        mock_db = MagicMock()
        url_id = uuid4()
        
        # Mock no stats
        mock_db.query.return_value.filter.return_value.group_by.return_value.first.return_value = None
        
        # Act
        result = AnalyticsService.get_url_stats(mock_db, url_id)
        
        # Assert
        assert result is None
    
    def test_get_url_stats_zero_clicks(self):
        """Test getting URL stats when clicks is 0"""
        # Arrange
        mock_db = MagicMock()
        url_id = uuid4()
        
        mock_stats = MagicMock()
        mock_stats.total_clicks = 0
        
        mock_db.query.return_value.filter.return_value.group_by.return_value.first.return_value = mock_stats
        
        # Act
        result = AnalyticsService.get_url_stats(mock_db, url_id)
        
        # Assert
        assert result is None
    
    def test_get_user_summary_success(self):
        """Test getting user summary with valid data"""
        # Arrange
        mock_db = MagicMock()
        user_id = uuid4()
        
        # Mock the summary query result
        mock_result = MagicMock()
        mock_result.total_urls = 5
        mock_result.total_clicks = 100
        
        mock_db.execute.return_value.first.return_value = mock_result
        
        # Mock top URLs query
        mock_top_url = MagicMock()
        mock_top_url.short_code = "test123"
        mock_top_url.clicks = 50
        
        mock_db.execute.return_value.fetchall.return_value = [mock_top_url]
        
        # Act
        result = AnalyticsService.get_user_summary(mock_db, user_id)
        
        # Assert
        assert result is not None
        assert isinstance(result, UserSummary)
        assert result.total_urls == 5
        assert result.total_clicks == 100
        assert len(result.top_urls) == 1
        assert result.top_urls[0]["short_code"] == "test123"
        assert result.top_urls[0]["clicks"] == 50