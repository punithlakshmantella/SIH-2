import sys
import os
import pytest

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

scripts_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
if scripts_path not in sys.path:
    sys.path.insert(0, scripts_path)

# Ensure test database isolation so main cityvision.db is preserved
test_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "test_cityvision.db")).replace("\\", "/")
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

from seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Ensure all tables are created and seeded with realistic test data in test_cityvision.db.
    """
    seed_database()
    yield
    # Clean up test database after session
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
    except Exception:
        pass
