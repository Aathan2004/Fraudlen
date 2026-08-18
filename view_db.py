"""
FraudLens Database Viewer
Run: python view_db.py
Works with both Neon PostgreSQL and local SQLite!
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.database import SessionLocal, User, AnalysisRecord, IS_NEON, DATABASE_URL

def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title.upper()}")
    print("=" * 70)

def view_database():
    db = SessionLocal()
    try:
        # DB Info
        db_type = "Neon PostgreSQL (Cloud)" if IS_NEON else "SQLite (Local Fallback)"
        print_header(f"Database Status: {db_type}")
        
        # Mask sensitive connection string
        masked = DATABASE_URL
        if "@" in DATABASE_URL:
            parts = DATABASE_URL.split("@")
            masked = f"{parts[0].split(':')[0]}://***:***@{parts[1]}"
        print(f"Connection: {masked}")

        # 1. Users Table
        print_header("Registered Users (users table)")
        users = db.query(User).order_by(User.id.asc()).all()
        if not users:
            print("No users found.")
        else:
            print(f"{'ID':<4} | {'Username':<15} | {'Email':<25} | {'Role':<15} | {'Full Name':<20}")
            print("-" * 85)
            for u in users:
                full_name = u.full_name or "—"
                print(f"{u.id:<4} | {u.username:<15} | {u.email:<25} | {u.role:<15} | {full_name:<20}")

        # 2. Analysis History Table
        print_header("Analysis History (analysis_history table)")
        records = db.query(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).limit(20).all()
        if not records:
            print("No analysis history recorded yet.")
        else:
            print(f"{'ID':<4} | {'User ID':<8} | {'Filename':<25} | {'Providers':<10} | {'Fraud Prov':<11} | {'Claims':<8} | {'Date':<19}")
            print("-" * 95)
            for r in records:
                fname = (r.filename[:22] + "...") if r.filename and len(r.filename) > 25 else (r.filename or "—")
                dt = r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "—"
                uid = str(r.user_id) if r.user_id else "Anon"
                print(f"{r.id:<4} | {uid:<8} | {fname:<25} | {r.total_providers:<10} | {r.fraud_providers:<11} | {r.total_claims:<8} | {dt:<19}")

        print("\n" + "=" * 70 + "\n")

    except Exception as e:
        print(f"\n[!] Error querying database: {e}\n")
    finally:
        db.close()

if __name__ == "__main__":
    view_database()
