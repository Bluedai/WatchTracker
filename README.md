# WatchTracker

Selbst gehostete Web-Anwendung zur Verwaltung des Serien- und Film-Fortschritts. Verwalte deine Serien- und Filmsammlung, tracke welche Episoden und Filme du gesehen hast, und behalte den Überblick über deinen Fortschritt – alles in einer deutschen Benutzeroberfläche.

## Features

- **Serien- und Filmsuche** – Suche nach Serien und Filmen über die TMDB-API und füge sie zu deiner Bibliothek hinzu
- **Deutsche Titel** – Bevorzugt deutsche Titel, englisch als Fallback
- **Episoden- und Filmverwaltung** – Markiere Episoden und Filme als gesehen, mit vollständigem Sichtungsverlauf
- **Mehrfach-Sichtungen** – Eine Episode oder ein Film kann mehrfach als gesehen markiert werden, jede Sichtung wird mit Datum historisiert
- **Manuelle Korrekturen** – Titel und Beschreibungen können lokal überschrieben werden, ohne bei Aktualisierung verloren zu gehen
- **Tags pro Serie / Film** – Erstelle eigene Tags und ordne Serien und Filmen mehrere Tags zu
- **Tag-Verwaltung** – Tags umbenennen/loeschen und Nutzung je Tag einsehen
- **Fortschrittsanzeige** – Pro Serie, pro Staffel, für Filme und gesamt
- **Filter** – Nach Tags filtern, separate Abschnitte für Serien und Filme in der Bibliothek
- **API-Synchronisation** – Button zum Nachladen neuer Staffeln, Episoden und Filmdaten aus TMDB
- **Docker Compose** – Ein Befehl zum Starten

## Voraussetzungen

- [Docker](https://docs.docker.com/get-docker/) und [Docker Compose](https://docs.docker.com/compose/install/)
- Einen kostenlosen TMDB-API-Key

## TMDB-API-Key erstellen

1. Registriere dich kostenlos unter https://www.themoviedb.org/signup
2. Gehe zu https://www.themoviedb.org/settings/api
3. Beantrage einen API-Key (Typ: Developer)
4. Kopiere den **API Key (v3 auth)**

## Installation & Start

```bash
# Repository klonen
git clone <repo-url>
cd WatchTracker

# Umgebungsvariablen konfigurieren
cp .env.example .env
# Öffne .env und trage deinen TMDB_API_KEY ein
# Optional: FRONTEND_PORT, BACKEND_PORT und DB_NAME anpassen

# Anwendung starten
docker compose up --build -d
```

### Parallele Entwicklungsumgebung

Eine zweite, isolierte Instanz mit eigener Datenbank und eigenen Ports lässt sich über `.env.dev` betreiben:

```bash
# Falls noch nicht vorhanden:
cp .env.example .env.dev

# Passe .env.dev an (andere Ports, anderer DB_NAME, TMDB_API_KEY)
docker compose --env-file .env.dev up -d --build
```

Erreichbar dann unter (Standardwerte aus `.env.dev`):
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8002
- **API Docs (Swagger)**: http://localhost:8002/docs

Die Anwendung ist dann erreichbar unter (Standardwerte aus `.env.example`):
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

### Zugriff von anderen Geräten

Um die App von anderen Geräten im lokalen Netzwerk zu erreichen, verwende die IP-Adresse des Servers statt `localhost`, z. B. `http://192.168.1.100:3000` (oder den in `.env` gesetzten `FRONTEND_PORT`).

## Benutzung

### Serien und Filme hinzufügen
1. Navigiere zu **Suche**
2. Wähle oben den Reiter **Serien** oder **Filme**
3. Gib den Titel ein und klicke **Suchen**
4. Klicke **Hinzufügen** beim gewünschten Eintrag
5. Bei Serien werden Staffeln und Episoden automatisch aus TMDB geladen

### Episoden und Filme als gesehen markieren
- In der Staffelansicht: Klicke auf den Kreis links neben einer Episode
- In der Episoden- oder Filmdetailansicht: Klicke **Als gesehen markieren**
- Jeder Klick erstellt einen neuen Sichtungseintrag (Mehrfach-Sichtungen möglich)

### Sichtungen verwalten
- In der Episoden- oder Filmdetailansicht siehst du den vollständigen Sichtungsverlauf
- Jeder Eintrag kann bearbeitet (Datum/Notiz ändern) oder gelöscht werden

### Serien- und Filmdaten aktualisieren
- Auf der Detail-Seite: Klicke **Aktualisieren**
- Neue Staffeln und Episoden bzw. Filmdaten werden aus TMDB nachgeladen
- Deine manuellen Korrekturen bleiben dabei erhalten

### Manuelle Korrekturen
- Klicke **Bearbeiten** auf der Serien-, Staffel-, Episoden- oder Filmdetail-Seite
- Ändere Titel oder Beschreibung
- Klicke **Speichern**
- Zum Zurücksetzen: **Overrides zurücksetzen** entfernt alle manuellen Änderungen

### Tags verwalten
- Auf der Serien- oder Filmdetail-Seite kannst du Tags zuweisen, entfernen, umbenennen und global loeschen
- In der Bibliothek kannst du in den Abschnitten **Serien** und **Filme** nach Tags filtern
- Auf der Seite **Tags** kannst du alle Tags zentral pflegen

### Bibliothek
- Die Startseite zeigt getrennte Reiter für **Serien** und **Filme**
- Der jeweilige Fortschritt wird pro Abschnitt angezeigt

## Technologie

| Komponente | Technologie |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Datenbank | SQLite (WAL-Modus) |
| ORM | SQLAlchemy 2.0 |
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS |
| API-Quelle | TMDB (The Movie Database) |
| Deployment | Docker Compose |

## Medientypen

Die App unterstützt zwei Medientypen:

- **Serien** mit Staffeln und Episoden
- **Filme** ohne Staffel-/Episodenstruktur

In der Suche kannst du zwischen Serien und Filmen wechseln. In der Bibliothek werden beide Medientypen in separaten Reitern angezeigt.

## Projektstruktur

```
├── docker-compose.yml          # Service-Definitionen
├── .env.example                # Umgebungsvariablen-Vorlage
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI-Anwendung
│       ├── config.py           # Konfiguration
│       ├── database.py         # SQLAlchemy-Setup
│       ├── models.py           # Datenbank-Modelle
│       ├── schemas.py          # Pydantic-Schemas
│       ├── routers/            # API-Endpunkte
│       │   ├── search.py       # TMDB-Suche
│       │   ├── series.py       # Serien + Staffeln
│       │   ├── episodes.py     # Episoden
│       │   └── watches.py      # Sichtungen
│       └── services/
│           ├── tmdb.py         # TMDB-API-Client
│           └── sync.py         # Synchronisations-Logik
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── api/client.ts       # API-Client
│       ├── types/index.ts      # TypeScript-Typen
│       ├── components/         # UI-Komponenten
│       └── pages/              # Seiten
└── data/                       # SQLite-Datenbank (via Volume)
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/search?q=…` | TMDB-Suche nach Serien |
| GET | `/api/search/movies?q=…` | TMDB-Suche nach Filmen |
| POST | `/api/series` | Serie hinzufügen |
| GET | `/api/series` | Serien auflisten |
| GET | `/api/series/{id}` | Seriendetails |
| POST | `/api/movies` | Film hinzufügen |
| GET | `/api/movies` | Filme auflisten |
| GET | `/api/movies/{id}` | Filmdetails |
| PUT | `/api/movies/{id}` | Film bearbeiten |
| DELETE | `/api/movies/{id}` | Film entfernen |
| POST | `/api/movies/{id}/sync` | Film aus TMDB aktualisieren |
| PUT | `/api/movies/{id}/reset-overrides` | Film-Overrides zurücksetzen |
| PUT | `/api/movies/{id}/tags` | Tags eines Films setzen |
| POST | `/api/movies/{id}/tags/{tag_id}` | Tag zu Film hinzufügen |
| DELETE | `/api/movies/{id}/tags/{tag_id}` | Tag von Film entfernen |
| POST | `/api/movies/{id}/watch` | Filmsichtung hinzufügen |
| PUT | `/api/movies/watches/{id}` | Filmsichtung bearbeiten |
| DELETE | `/api/movies/watches/{id}` | Filmsichtung löschen |
| PUT | `/api/series/{id}` | Serie bearbeiten |
| PUT | `/api/series/{id}/tags` | Tags einer Serie setzen |
| POST | `/api/series/{id}/tags/{tag_id}` | Tag zu Serie hinzufügen |
| DELETE | `/api/series/{id}/tags/{tag_id}` | Tag von Serie entfernen |
| DELETE | `/api/series/{id}` | Serie entfernen |
| POST | `/api/series/{id}/sync` | Aus TMDB aktualisieren |
| PUT | `/api/series/{id}/reset-overrides` | Overrides zurücksetzen |
| GET | `/api/tags` | Alle Tags auflisten |
| POST | `/api/tags` | Tag erstellen |
| PUT | `/api/tags/{id}` | Tag umbenennen |
| DELETE | `/api/tags/{id}` | Tag löschen |
| GET | `/api/series/{id}/seasons` | Staffeln |
| GET | `/api/seasons/{id}` | Staffeldetails |
| PUT | `/api/seasons/{id}` | Staffel bearbeiten |
| PUT | `/api/seasons/{id}/reset-overrides` | Staffel-Overrides zurücksetzen |
| GET | `/api/episodes/{id}` | Episodendetails |
| PUT | `/api/episodes/{id}` | Episode bearbeiten |
| PUT | `/api/episodes/{id}/reset-overrides` | Episode-Overrides zurücksetzen |
| POST | `/api/episodes/{id}/watch` | Sichtung hinzufügen |
| GET | `/api/episodes/{id}/watches` | Sichtungsverlauf |
| PUT | `/api/watches/{id}` | Sichtung bearbeiten |
| DELETE | `/api/watches/{id}` | Sichtung löschen |
| GET | `/api/watch-history` | Globaler Verlauf |
| GET | `/api/series/{id}/progress` | Fortschritt |
| GET | `/api/stats` | Gesamtstatistik |

## Override-Strategie

Die Anwendung speichert API-Daten und manuelle Korrekturen in getrennten Spalten:

- **API-Spalten** (`name_en`, `name_de`, `overview_en`, `overview_de`) werden bei jedem Sync aktualisiert
- **Override-Spalten** (`name_override`, `overview_override`) werden bei Sync **nie** berührt
- **Anzeige-Reihenfolge**: Override → Deutsch → Englisch
- **Zurücksetzen**: Override auf NULL setzen → API-Daten werden wieder angezeigt

## Daten sichern

Die SQLite-Datenbank liegt im `data/`-Verzeichnis (Standard: `watchtracker.db`, konfigurierbar über `DB_NAME` in `.env`).

Wenn die App laeuft (WAL-Modus), sollten zusaetzlich die WAL-Datei und optional die SHM-Datei gesichert werden:

```bash
cp data/watchtracker.db data/watchtracker_backup.db
cp data/watchtracker.db-wal data/watchtracker_backup.db-wal
cp data/watchtracker.db-shm data/watchtracker_backup.db-shm || true
```

## Stoppen & Neu starten

```bash
# Stoppen
docker compose down

# Neu starten (ohne Rebuild)
docker compose up -d

# Neu starten (mit Rebuild nach Code-Änderungen)
docker compose up --build -d
```

## Troubleshooting

- **TMDB-API-Fehler**: Prüfe ob der API-Key in `.env` korrekt eingetragen ist
- **Leere Ergebnisse**: Manche Serien haben keine deutschen Titel – es wird dann der englische Titel angezeigt
- **Port belegt**: Passe `FRONTEND_PORT` und/oder `BACKEND_PORT` in `.env` an (z. B. `FRONTEND_PORT=3001`) und starte die Container neu
- **Datenbank-Probleme**: Lösche `data/watchtracker.db` (oder die über `DB_NAME` gesetzte Datei) und starte neu für einen frischen Start

## Lizenz

Dieses Projekt nutzt die [TMDB API](https://www.themoviedb.org/documentation/api), ist aber weder von TMDB unterstützt noch zertifiziert. Seriendaten stammen von TMDB.
