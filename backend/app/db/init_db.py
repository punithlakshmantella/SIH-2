import logging
from app.db.session import Base, engine
import app.models  # load all models to register with Base.metadata

logger = logging.getLogger("city-vision-db")

def init_db():
    """Initializes all database tables from SQLAlchemy metadata."""
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")

if __name__ == "__main__":
    init_db()
