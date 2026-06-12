from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Series(Base):
    __tablename__ = "series"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tmdb_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)

    name_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    name_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    name_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    overview_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    poster_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    first_air_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_seasons: Mapped[int] = mapped_column(Integer, default=0)

    missing_from_api: Mapped[bool] = mapped_column(Boolean, default=False)
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    seasons: Mapped[list["Season"]] = relationship(
        back_populates="series", cascade="all, delete-orphan", order_by="Season.season_number"
    )
    tags: Mapped[list["Tag"]] = relationship(
        secondary="series_tags",
        back_populates="series",
        order_by="Tag.name",
    )

    @property
    def display_name(self) -> str:
        return self.name_override or self.name_de or self.name_en or ""

    @property
    def display_overview(self) -> str | None:
        return self.overview_override or self.overview_de or self.overview_en

    @property
    def has_override(self) -> bool:
        return self.name_override is not None or self.overview_override is not None


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    series: Mapped[list["Series"]] = relationship(
        secondary="series_tags",
        back_populates="tags",
    )


class SeriesTag(Base):
    __tablename__ = "series_tags"
    __table_args__ = (UniqueConstraint("series_id", "tag_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    series_id: Mapped[int] = mapped_column(Integer, ForeignKey("series.id", ondelete="CASCADE"), nullable=False)
    tag_id: Mapped[int] = mapped_column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Season(Base):
    __tablename__ = "seasons"
    __table_args__ = (UniqueConstraint("series_id", "season_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    series_id: Mapped[int] = mapped_column(Integer, ForeignKey("series.id", ondelete="CASCADE"), nullable=False)
    tmdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    season_number: Mapped[int] = mapped_column(Integer, nullable=False)

    name_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    name_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    name_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    overview_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    poster_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    air_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    episode_count: Mapped[int] = mapped_column(Integer, default=0)

    missing_from_api: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    series: Mapped["Series"] = relationship(back_populates="seasons")
    episodes: Mapped[list["Episode"]] = relationship(
        back_populates="season", cascade="all, delete-orphan", order_by="Episode.episode_number"
    )

    @property
    def display_name(self) -> str:
        return self.name_override or self.name_de or self.name_en or ""

    @property
    def has_override(self) -> bool:
        return self.name_override is not None or self.overview_override is not None


class Episode(Base):
    __tablename__ = "episodes"
    __table_args__ = (UniqueConstraint("season_id", "episode_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_id: Mapped[int] = mapped_column(Integer, ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False)
    tmdb_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)

    name_en: Mapped[str] = mapped_column(Text, nullable=False, default="")
    name_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    name_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    overview_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview_de: Mapped[str | None] = mapped_column(Text, nullable=True)
    overview_override: Mapped[str | None] = mapped_column(Text, nullable=True)

    air_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    still_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    runtime: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ignore_in_progress: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    missing_from_api: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    season: Mapped["Season"] = relationship(back_populates="episodes")
    watch_entries: Mapped[list["WatchEntry"]] = relationship(
        back_populates="episode", cascade="all, delete-orphan", order_by="WatchEntry.watched_at.desc()"
    )

    @property
    def display_name(self) -> str:
        return self.name_override or self.name_de or self.name_en or ""

    @property
    def display_overview(self) -> str | None:
        return self.overview_override or self.overview_de or self.overview_en

    @property
    def has_override(self) -> bool:
        return self.name_override is not None or self.overview_override is not None

    @property
    def is_watched(self) -> bool:
        return len(self.watch_entries) > 0


class WatchEntry(Base):
    __tablename__ = "watch_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    episode_id: Mapped[int] = mapped_column(Integer, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=False)
    watched_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    episode: Mapped["Episode"] = relationship(back_populates="watch_entries")
