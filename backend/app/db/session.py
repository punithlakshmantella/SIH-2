from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

def create_db_engine(url: str):
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        engine = create_engine(url, connect_args=connect_args)
        from sqlalchemy import event
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            if type(dbapi_connection).__name__ == "Connection":
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA busy_timeout=5000")
                cursor.close()
        return engine
    else:
        return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})

try:
    engine = create_db_engine(DATABASE_URL)
    # Quick probe
    with engine.connect() as conn:
        pass
except Exception:
    # If postgres is not running on localhost during local non-docker development, fallback to SQLite
    fallback_url = "sqlite:///./cityvision.db"
    engine = create_db_engine(fallback_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
