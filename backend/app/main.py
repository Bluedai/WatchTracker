from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import Base, engine
from app.routers import episodes, search, series, watches


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


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_episode_ignore_column()
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
app.include_router(episodes.router, prefix="/api", tags=["Episoden"])
app.include_router(watches.router, prefix="/api", tags=["Sichtungen"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
