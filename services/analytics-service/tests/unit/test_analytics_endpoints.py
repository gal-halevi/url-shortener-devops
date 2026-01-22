import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from app.main import app
from app.schemas.analytics import URLStats, UserSummary


client = TestClient(app)


@patch('app.api.v1.endpoints.analytics.get_db')
@patch('app.api.v1.endpoints.analytics.AnalyticsService.get_url_stats')
def test_get_url_statistics_success(mock_get_stats, mock_get_db):
    """Test successful URL statistics retrieval"""
    # Arrange
    url_id = uuid4()
    mock_stats = URLStats(
        url_id=url_id,
        short_code="test123",
        total_clicks=10,
        unique_ips=5,
        last_clicked=datetime.now(timezone.utc),
        click_timeline=[{"date": "2026-01-21", "clicks": 10}]
    )
    mock_get_stats.return_value = mock_stats
    mock_get_db.return_value = MagicMock()
    
    # Act
    response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["short_code"] == "test123"
    assert data["total_clicks"] == 10
    assert data["unique_ips"] == 5


@patch('app.api.v1.endpoints.analytics.get_db')
@patch('app.api.v1.endpoints.analytics.AnalyticsService.get_url_stats')
def test_get_url_statistics_not_found(mock_get_stats, mock_get_db):
    """Test URL statistics when no data exists"""
    # Arrange
    url_id = uuid4()
    mock_get_stats.return_value = None
    mock_get_db.return_value = MagicMock()
    
    # Act
    response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
    
    # Assert
    assert response.status_code == 404
    assert "No analytics data found" in response.json()["detail"]


@patch('app.api.v1.endpoints.analytics.get_db')
@patch('app.api.v1.endpoints.analytics.AnalyticsService.get_user_summary')
def test_get_user_summary_success(mock_get_summary, mock_get_db):
    """Test successful user summary retrieval"""
    # Arrange
    user_id = uuid4()
    mock_summary = UserSummary(
        user_id=user_id,
        total_urls=5,
        total_clicks=100,
        top_urls=[{"short_code": "test123", "clicks": 50}]
    )
    mock_get_summary.return_value = mock_summary
    mock_get_db.return_value = MagicMock()
    
    # Act
    response = client.get(f"/api/v1/analytics/user/{user_id}/summary")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["total_urls"] == 5
    assert data["total_clicks"] == 100
    assert len(data["top_urls"]) == 1


def test_health_endpoint():
    """Test health check endpoint"""
    response = client.get("/api/v1/analytics/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "analytics-service"
    assert "timestamp" in data