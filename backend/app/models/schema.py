import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, ARRAY, JSON, Float, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, relationship, mapped_column
from typing import Optional, List, Dict, Any
from app.db.postgres_client import Base
from datetime import datetime, timezone, date


class User(Base):
    __tablename__ = "users"
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
    )

    sessions = relationship(
        "Session", back_populates="user", cascade="all, delete-orphan"
    )
    health_profile = relationship(
        "HealthProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class HealthProfile(Base):
    __tablename__ = "health_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    gender: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(DateTime, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    blood_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    chronic_conditions: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), default=[]
    )
    allergies: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=[])
    current_medications: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), default=[]
    )

    lifestyle_factors: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, default={}
    )

    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="health_profile")


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
