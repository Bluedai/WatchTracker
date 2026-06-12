# Hinweise fuer die Coding-KI

## Ziel
- Halte die Anwendung stabil und erweitere sie in kleinen, nachvollziehbaren Schritten.
- Bewahre bestehendes Verhalten, ausser eine Aenderung ist explizit gewuenscht.

## Projektkontext
- Backend: FastAPI + SQLAlchemy in backend/app
- Frontend: React + TypeScript + Vite in frontend/src
- Betrieb: Docker Compose (Frontend + Backend + SQLite-Volume)

## Arbeitsweise
- Bevorzuge kleine, fokussierte Commits mit klarer Begruendung.
- Aendere nur die Dateien, die fuer die Aufgabe notwendig sind.
- Passe bei API-Aenderungen immer sowohl Backend-Schemas als auch Frontend-Typen an.
- Halte Namen, Sprachstil und Struktur konsistent mit bestehendem Code.

## Fachliche Regeln
- Override-Felder haben Vorrang vor API-Daten.
- Sync aus TMDB darf nur API-Felder aktualisieren, nie *_override Felder ueberschreiben.
- Bei Anzeige gilt die Reihenfolge: Override -> Deutsch -> Englisch.
- Flags fuer Fortschritt (z. B. ignore_in_progress) duerfen durch Sync nicht verloren gehen.

## Backend-Regeln
- Router-Endpunkte unter backend/app/routers in bestehende Struktur einordnen.
- DB-Modelle in backend/app/models.py und Pydantic-Schemas in backend/app/schemas.py konsistent halten.
- Bei neuen Feldern sicherstellen, dass bestehende SQLite-Instanzen kompatibel bleiben.
- Fehlerfaelle mit sinnvollen HTTP-Statuscodes und klaren Fehlermeldungen behandeln.

## Frontend-Regeln
- API-Aufrufe zentral in frontend/src/api/client.ts pflegen.
- Datentypen zentral in frontend/src/types/index.ts pflegen.
- Komponenten schlank halten; Seitenlogik in pages belassen.
- UI-Verhalten bei bestehenden Seiten nicht ohne Not veraendern.

## Verifikation (bevorzugt ueber Docker)
- Nach relevanten Aenderungen ueber Docker pruefen:
  - docker compose up -d --build
  - docker compose ps
  - docker compose logs --tail 200 backend frontend
- Bei API-Aenderungen mindestens die betroffenen Endpunkte manuell gegenpruefen.
- Bei UI-Aenderungen betroffene Seiten im Browser funktional testen.
- Bei Nutzung ueber VS Code Remote Explorer gilt: In der Bash/im Terminal kann localhost verwendet werden.
- Fuer Tests im lokalen Browser immer server als Hostname verwenden (mit passendem Port), nicht localhost.

## Dokumentation
- Bei neuen Features oder Verhaltensaenderungen README.md kurz aktualisieren.
- Halte Hinweise knapp, konkret und wartbar.
