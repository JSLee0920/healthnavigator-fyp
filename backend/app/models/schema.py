from sqlalchemy import Column, String, ForeignKey, DateTime, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import random
import string
from app.db.postgres_client import Base


def generate_object_id(length=18):
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


class User(Base):
    __tablename__ = "users"
    user_id = Column(String(18), primary_key=True, default=generate_object_id)
    username = Column(String(32), nullable=False)
    password = Column(String(50), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    health_profile = Column(ARRAY(String), nullable=True)
    role = Column(String(20), nullable=False, default="user")
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )


class Session(Base):
    __tablename__ = "sessions"
    session_id = Column(String(18), primary_key=True, default=generate_object_id)
    user_id = Column(String(18), ForeignKey("users.user_id", ondelete="CASCADE"))
    status = Column(String(20), nullable=False, default="active")
    last_active = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "Messages", back_populates="session", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"
    message_id = Column(String(18), primary_key=True, default=generate_object_id)
    session_id = Column(
        String(18), ForeignKey("sessions.session_id", ondelete="CASCADE")
    )
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    session = relationship("Session", back_populates="messages")
