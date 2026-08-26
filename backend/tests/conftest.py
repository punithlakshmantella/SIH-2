import sys
import os
import pytest

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

scripts_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "scripts"))
if scripts_path not in sys.path:
    sys.path.insert(0, scripts_path)

from seed import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """
    Ensure all tables are created and seeded with realistic test data once per session.
    """
    seed_database()
