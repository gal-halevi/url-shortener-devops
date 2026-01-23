import pytest
import time
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.main import app
from app.models.click_event import Base, ClickEvent
from app.core.database import get_db
from app.core.config import settings

# Test database URL - from environment or default
TEST_DATABASE_URL = "postgresql+psycopg://test_user:test_pass@localhost:5433/urlshortener_test"

# Create test engine
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    yield session
    
    # Cleanup
    session.close()
    
    # Drop all tables to ensure clean state
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with overridden database dependency"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    yield TestClient(app)
    
    app.dependency_overrides.clear()


class TestAnalyticsIntegration:
    """Integration tests with real database"""
    
    def test_get_url_stats_with_real_data(self, client, db_session):
        """Test getting URL statistics with actual database"""
        # Arrange - Insert real test data
        url_id = uuid4()
        short_code = "test123"
        
        # Create multiple click events
        for i in range(5):
            click = ClickEvent(
                url_id=url_id,
                short_code=short_code,
                ip_address=f"192.168.1.{i}",
                user_agent="Mozilla/5.0 (Test Browser)",
                referer="https://test.com"
            )
            db_session.add(click)
        
        db_session.commit()
        
        # Act - Call API endpoint
        response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total_clicks"] == 5
        assert data["unique_ips"] == 5
        assert data["short_code"] == short_code
        assert data["url_id"] == str(url_id)
    
    def test_unique_ip_counting(self, client, db_session):
        """Test that unique IPs are counted correctly"""
        # Arrange - Multiple clicks from same IPs
        url_id = uuid4()
        short_code = "unique-test"
        
        # Same IP - 3 clicks
        for _ in range(3):
            click = ClickEvent(
                url_id=url_id,
                short_code=short_code,
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0"
            )
            db_session.add(click)
        
        # Different IP - 2 clicks
        for _ in range(2):
            click = ClickEvent(
                url_id=url_id,
                short_code=short_code,
                ip_address="192.168.1.200",
                user_agent="Mozilla/5.0"
            )
            db_session.add(click)
        
        db_session.commit()
        
        # Act
        response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["total_clicks"] == 5
        assert data["unique_ips"] == 2  # Only 2 unique IPs
    
    def test_url_not_found(self, client, db_session):
        """Test requesting stats for non-existent URL"""
        # Act
        non_existent_id = uuid4()
        response = client.get(f"/api/v1/analytics/urls/{non_existent_id}/stats")
        
        # Assert
        assert response.status_code == 404
        assert "No analytics data found" in response.json()["detail"]
    
    def test_click_timeline_aggregation(self, client, db_session):
        """Test that click timeline is properly aggregated by date"""
        # Arrange
        url_id = uuid4()
        short_code = "timeline-test"
        
        # Create clicks at different times
        click1 = ClickEvent(
            url_id=url_id,
            short_code=short_code,
            ip_address="192.168.1.1",
            clicked_at=datetime.now(timezone.utc)
        )
        db_session.add(click1)
        
        click2 = ClickEvent(
            url_id=url_id,
            short_code=short_code,
            ip_address="192.168.1.2",
            clicked_at=datetime.now(timezone.utc)
        )
        db_session.add(click2)
        
        db_session.commit()
        
        # Act
        response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "click_timeline" in data
        assert isinstance(data["click_timeline"], list)
        assert len(data["click_timeline"]) > 0
    
    def test_last_clicked_timestamp(self, client, db_session):
        """Test that last_clicked timestamp is accurate"""
        # Arrange
        url_id = uuid4()
        short_code = "timestamp-test"
        
        # Create clicks with specific timestamps
        first_time = datetime.now(timezone.utc)
        click1 = ClickEvent(
            url_id=url_id,
            short_code=short_code,
            ip_address="192.168.1.1",
            clicked_at=first_time
        )
        db_session.add(click1)
        db_session.commit()
        
        # Wait a moment and add another click
        time.sleep(0.1)
        second_time = datetime.now(timezone.utc)
        click2 = ClickEvent(
            url_id=url_id,
            short_code=short_code,
            ip_address="192.168.1.2",
            clicked_at=second_time
        )
        db_session.add(click2)
        db_session.commit()
        
        # Act
        response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["last_clicked"] is not None
        # Last clicked should be the second timestamp
        last_clicked = datetime.fromisoformat(data["last_clicked"].replace('Z', '+00:00'))
        assert last_clicked >= first_time
    
    def test_multiple_urls_isolation(self, client, db_session):
        """Test that stats are properly isolated between different URLs"""
        # Arrange - Create clicks for two different URLs
        url_id_1 = uuid4()
        url_id_2 = uuid4()
        
        # URL 1 - 3 clicks
        for i in range(3):
            click = ClickEvent(
                url_id=url_id_1,
                short_code="url1",
                ip_address=f"192.168.1.{i}"
            )
            db_session.add(click)
        
        # URL 2 - 5 clicks
        for i in range(5):
            click = ClickEvent(
                url_id=url_id_2,
                short_code="url2",
                ip_address=f"192.168.2.{i}"
            )
            db_session.add(click)
        
        db_session.commit()
        
        # Act
        response1 = client.get(f"/api/v1/analytics/urls/{url_id_1}/stats")
        response2 = client.get(f"/api/v1/analytics/urls/{url_id_2}/stats")
        
        # Assert
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1["total_clicks"] == 3
        assert data2["total_clicks"] == 5
        assert data1["short_code"] == "url1"
        assert data2["short_code"] == "url2"
    
    def test_health_check(self, client):
        """Test health endpoint"""
        response = client.get("/api/v1/analytics/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "analytics-service"
        assert "timestamp" in data
    
    def test_database_connection_in_stats(self, client, db_session):
        """Test that database queries work correctly in analytics service"""
        # Arrange
        url_id = uuid4()
        
        # Create a single click
        click = ClickEvent(
            url_id=url_id,
            short_code="db-test",
            ip_address="10.0.0.1",
            user_agent="Test Agent"
        )
        db_session.add(click)
        db_session.commit()
        
        # Act - Query through the API
        response = client.get(f"/api/v1/analytics/urls/{url_id}/stats")
        
        # Assert - Verify we got data from database
        assert response.status_code == 200
        data = response.json()
        
        # Verify the data matches what we inserted
        assert data["total_clicks"] == 1
        assert data["unique_ips"] == 1
        assert data["short_code"] == "db-test"