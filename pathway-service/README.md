# Pathway Streaming Service

Standalone Python microservice for GreenGuard AI that fetches real-time agricultural data from AgroMonitoring and stores it in PostgreSQL.

## Architecture

```
AgroMonitoring APIs  →  Pathway Service  →  PostgreSQL  →  Next.js Backend
```

## Setup

### 1. Install Dependencies

```bash
cd pathway-service
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export AGROMONITORING_API_KEY="your-api-key"
export PORT=8081  # optional, default 8081
```

### 3. Run

```bash
python main.py
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health check |
| `/trigger/weather` | GET | Manually trigger weather fetch for all farms |
| `/trigger/ndvi` | GET | Manually trigger NDVI fetch for all farms |

## Schedule

- **Weather**: Every 1 hour
- **NDVI**: Every 5 days

## Docker

```bash
docker build -t greenguard-pathway .
docker run -e DATABASE_URL=... -e AGROMONITORING_API_KEY=... -p 8081:8081 greenguard-pathway
```
