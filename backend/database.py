import os
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, Float, ForeignKey, Text
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

# Load .env from backend or v3 root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

DATABASE_URL = os.getenv("NEON_DATABASE_URL") or os.getenv("DATABASE_URL")

# Handle standard postgres:// scheme for SQLAlchemy 2.x compatibility
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    if "sslmode" not in DATABASE_URL and "neon.tech" in DATABASE_URL:
        # Ensure sslmode for Neon DB
        sep = "&" if "?" in DATABASE_URL else "?"
        DATABASE_URL = f"{DATABASE_URL}{sep}sslmode=require"

# Fallback to local SQLite if no Neon DB URL provided yet
if not DATABASE_URL:
    db_path = PROJECT_ROOT / "fraudlens.db"
    DATABASE_URL = f"sqlite:///{db_path}"
    IS_NEON = False
    print(f"[*] No NEON_DATABASE_URL provided. Using local SQLite: {DATABASE_URL}")
else:
    IS_NEON = True
    # Mask password in logs
    masked = DATABASE_URL
    if "@" in DATABASE_URL:
        parts = DATABASE_URL.split("@")
        masked = f"{parts[0].split(':')[0]}://***:***@{parts[1]}"
    print(f"[*] Connected to Database (Neon Postgres): {masked}")

# Engine setup
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

 
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="Fraud Analyst")
    created_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("AnalysisRecord", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class AnalysisRecord(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String(255), nullable=True)
    total_providers = Column(Integer, default=0)
    fraud_providers = Column(Integer, default=0)
    total_claims = Column(Integer, default=0)
    fraud_claims = Column(Integer, default=0)
    fraud_provider_percentage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="analyses")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "filename": self.filename,
            "total_providers": self.total_providers,
            "fraud_providers": self.fraud_providers,
            "total_claims": self.total_claims,
            "fraud_claims": self.fraud_claims,
            "fraud_provider_percentage": self.fraud_provider_percentage,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


def init_db():
    """Initializes tables and seeds a default admin user if none exists."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default admin & analyst if table is empty
        from .auth_service import hash_password
        if db.query(User).count() == 0:
            default_users = [
                User(
                    username="admin",
                    email="admin@fraudlens.io",
                    full_name="System Administrator",
                    hashed_password=hash_password("admin123"),
                    role="Admin"
                ),
                User(
                    username="analyst",
                    email="analyst@fraudlens.io",
                    full_name="Fraud Analyst",
                    hashed_password=hash_password("analyst123"),
                    role="Analyst"
                )
            ]
            db.add_all(default_users)
            db.commit()
            print("[*] Seeded default users (admin/admin123, analyst/analyst123).")
    except Exception as e:
        print(f"[!] DB initialization notice: {e}")
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ensure tables exist on startup
try:
    init_db()
except Exception as _e:
    print(f"[!] DB auto-init notice: {_e}")
