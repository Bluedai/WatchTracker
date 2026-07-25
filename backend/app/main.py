from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
from app.routers import episodes, movies, search, series, watches


def _ensure_sqlite_episode_ignore_column() -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as connection:
        inspector = inspect(connection)
        if "episodes" not in inspector.get_table_names():
            return

        column_names = {column["name"] for column in inspector.get_columns("episodes")}
        if "ignore_in_progress" not in column_names:
            connection.execute(text("ALTER TABLE episodes ADD COLUMN ignore_in_progress BOOLEAN NOT NULL DEFAULT 0"))


def _ensure_sqlite_movie_columns() -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as connection:
        inspector = inspect(connection)
        if "watch_entries" not in inspector.get_table_names():
            return

        columns = inspector.get_columns("watch_entries")
        column_names = {column["name"] for column in columns}
        if "movie_id" not in column_names:
            connection.execute(text("ALTER TABLE watch_entries ADD COLUMN movie_id INTEGER"))

        # Existing databases created episode_id as NOT NULL, but movies need it nullable.
        episode_col = next((c for c in columns if c["name"] == "episode_id"), None)
        if episode_col and episode_col.get("nullable") is False:
            _migrate_watch_entries_for_movies(connection)


def _migrate_watch_entries_for_movies(connection) -> None:
    """Recreate watch_entries so episode_id is nullable and movie_id exists."""
    connection.execute(text("PRAGMA foreign_keys = OFF"))
    connection.execute(text("""
        CREATE TABLE watch_entries_new (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            episode_id INTEGER,
            movie_id INTEGER,
            watched_at DATETIME NOT NULL,
            notes TEXT,
            created_at DATETIME,
            updated_at DATETIME,
            FOREIGN KEY(episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
            FOREIGN KEY(movie_id) REFERENCES movies (id) ON DELETE CASCADE
        )
    """))
    connection.execute(text("""
        INSERT INTO watch_entries_new
        (id, episode_id, movie_id, watched_at, notes, created_at, updated_at)
        SELECT id, episode_id, movie_id, watched_at, notes, created_at, updated_at
        FROM watch_entries
    """))
    connection.execute(text("DROP TABLE watch_entries"))
    connection.execute(text("ALTER TABLE watch_entries_new RENAME TO watch_entries"))
    connection.execute(text("PRAGMA foreign_keys = ON"))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_episode_ignore_column()
    _ensure_sqlite_movie_columns()
    yield


app = FastAPI(title="WatchTracker", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api", tags=["Suche"])
app.include_router(series.router, prefix="/api", tags=["Serien"])
app.include_router(movies.router, prefix="/api", tags=["Filme"])
app.include_router(episodes.router, prefix="/api", tags=["Episoden"])
app.include_router(watches.router, prefix="/api", tags=["Sichtungen"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
