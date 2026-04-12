import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, ARRAY, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, relationship, mapped_column
from typing import Optional
from app.db.postgres_client import Base
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    health_profile = Column(ARRAY(String), nullable=True)
    role = Column(String(20), nullable=False, default="user")
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )


class Session(Base):
    __tablename__ = "sessions"
    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False, index=True
    )
    status = Column(String(20), nullable=False, default="active")
    last_active: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    user = relationship("User", back_populates="sessions")
    messages = relationship(
        "Message", back_populates="session", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "messages"
    message_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True), ForeignKey("sessions.session_id"), nullable=False
    )
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )
    session = relationship("Session", back_populates="messages")
