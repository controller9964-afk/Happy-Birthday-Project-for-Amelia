from app.core.config import Settings


def test_managed_postgres_urls_are_normalized_for_async_sqlalchemy():
    assert Settings(database_url="postgres://amelia:secret@db.example/amelia").database_url == (
        "postgresql+asyncpg://amelia:secret@db.example/amelia"
    )
    assert Settings(database_url="postgresql://amelia:secret@db.example/amelia").database_url == (
        "postgresql+asyncpg://amelia:secret@db.example/amelia"
    )
