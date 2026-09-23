# IPL Auction — Backend (Express + Prisma + Postgres)

REST API that replaces Supabase for the React frontend. Tables mirror the
Supabase schema (`Teams`, `CricketPlayers`) so the UI works unchanged.

## Quick start

```bash
cd server
cp .env.example .env        # edit DATABASE_URL if needed
npm install

# Option A — local Postgres via Docker
docker compose up -d

# Create tables + seed (dummy dataset shared with the frontend)
npx prisma migrate deploy
npm run db:seed

# Run the API
npm run dev                 # watch mode, http://localhost:4000
```

Health check: `GET http://localhost:4000/health`

## Env

| Var            | Default                                              | Purpose                          |
|----------------|------------------------------------------------------|----------------------------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/...` | Prisma Postgres connection       |
| `PORT`         | `4000`                                               | API listen port                  |
| `CORS_ORIGIN`  | `http://localhost:5173`                              | Allowed frontend origin(s), `*` for dev |

## API reference

All responses are JSON. Errors are `{ "error": "<message>" }`.

### Teams

| Method | Path                    | Frontend equivalent       | Body / Notes |
|--------|-------------------------|---------------------------|--------------|
| GET    | `/api/teams`            | `fetchSupabaseData('Teams')` | ordered `id` asc |
| GET    | `/api/teams/:id`        | `getTeamFromTeamID(id)`   | 404 if missing |
| POST   | `/api/teams`            | `insertSupabaseData`      | accepts `team_name` or `teamName`, etc. |
| PATCH  | `/api/teams/:id/purse`  | `updatePurseOfTeam(id, purse)` | `{ "purse": 8000 }` |

### Players

| Method | Path                     | Frontend equivalent | Body / Notes |
|--------|--------------------------|---------------------|--------------|
| GET    | `/api/players?status=all\|unsold\|sold` | `fetchUnsoldPlayers()` (`unsold`), `fetcnsoldPlayers()` (`sold`) | ordered `id` asc |
| GET    | `/api/players/expensive` | `fetchExpensivePlayer()` | top sold by `final_price` desc, array of ≤1 |
| GET    | `/api/players/last-sold` | `fetchPrevPlayer()` | latest sold by `time_of_selling` desc, array of ≤1 |
| GET    | `/api/players/:id`       | — | 404 if missing |
| POST   | `/api/players`           | `insertSupabaseData` | accepts camelCase or snake_case |
| PATCH  | `/api/players/:id/sold`  | `markPlayerAsSold(id, price, teamId, team)` | `{ "final_price": 500, "sold_to_team_id": 1, "sold_to_team": "Mumbai Indians" }`; unsold = `{ "final_price": 0, "sold_to_team_id": -1, "sold_to_team": null }` |

### Squads

| Method | Path | Frontend equivalent |
|--------|------|---------------------|
| GET | `/api/teams-with-squads` | `fetchTeamsWithSquads()` — same `{ team_id, name, playerCount, purse, teamLogo, textColor, squad: [{name, role, isOverseas}], color1, color2 }` shape |

## Example auction flow

```bash
# Unsold pool (current player = [0])
curl 'http://localhost:4000/api/players?status=unsold'

# Mark player 1 sold to team 1 for 500 (sets time_of_selling)
curl -X PATCH http://localhost:4000/api/players/1/sold \
  -H 'Content-Type: application/json' \
  -d '{"final_price":500,"sold_to_team_id":1,"sold_to_team":"Mumbai Indians"}'

# Deduct purse
curl -X PATCH http://localhost:4000/api/teams/1/purse \
  -H 'Content-Type: application/json' \
  -d '{"purse":8000}'

# Mark unsold
curl -X PATCH http://localhost:4000/api/players/2/sold \
  -H 'Content-Type: application/json' \
  -d '{"final_price":0,"sold_to_team_id":-1,"sold_to_team":null}'
```

## Prisma

```bash
npx prisma generate        # regenerate client after schema changes
npx prisma migrate dev --name <change>   # local migration workflow
npx prisma studio          # visual DB browser
```

## Connect the frontend

Set the frontend env to point at this API (see repo-root `.env.example`):

```bash
VITE_API_URL=http://localhost:4000
VITE_DATA_SOURCE=backend
```

`VITE_DUMMY_MODE=true` still wins when set (local dummy data, no network).
