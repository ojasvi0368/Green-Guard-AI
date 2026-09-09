"""
Pathway Streaming Microservice — GreenGuard AI
Fetches AgroMonitoring data on schedule and stores in PostgreSQL.

Weather: every 1 hour
NDVI:    every 5 days
"""

import os
import time
import json
import logging
import threading
import requests
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

# ─── Configuration ──────────────────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:npg_Eu01MAtcXTsg@ep-hidden-math-a1o3lbga-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
AGRO_API_KEY = os.environ.get("AGROMONITORING_API_KEY", "f05a8f3d46242bf5dd879d96479a340f")
AGRO_BASE    = "https://api.agromonitoring.com/agro/1.0"

WEATHER_INTERVAL_SEC = 3600      # 1 hour
NDVI_INTERVAL_SEC    = 5 * 86400 # 5 days

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("pathway")

# ─── Database helpers ───────────────────────────────────

def get_db():
    """Get a PostgreSQL connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def get_all_farms():
    """Fetch all farms with polygonIds from the database."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute('SELECT id, name, "polygonId" FROM "Farm" WHERE "polygonId" IS NOT NULL')
        farms = cur.fetchall()
        return farms
    finally:
        conn.close()


def upsert_farm_data(farm_id, ndvi=None, weather=None, soil_moisture=None, drought_risk=None):
    """Insert a new FarmData record."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO "FarmData" (id, "farmId", ndvi, weather, "soilMoisture", "droughtRisk", "createdAt")
            VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, NOW())
            """,
            (farm_id, ndvi, json.dumps(weather) if weather else None, soil_moisture, drought_risk),
        )
        conn.commit()
        log.info(f"  ✅ Stored data for farm {farm_id}")
    except Exception as e:
        conn.rollback()
        log.error(f"  ❌ DB write error for farm {farm_id}: {e}")
    finally:
        conn.close()

# ─── AgroMonitoring API ─────────────────────────────────

def fetch_weather(polygon_id):
    """Fetch current weather for a polygon."""
    url = f"{AGRO_BASE}/weather?polyid={polygon_id}&appid={AGRO_API_KEY}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list) and len(data) > 0:
        return data[0]
    return data


def fetch_ndvi(polygon_id):
    """Fetch latest NDVI for a polygon (last 30 days)."""
    end = int(time.time())
    start = end - 30 * 86400
    url = f"{AGRO_BASE}/ndvi/history?polyid={polygon_id}&start={start}&end={end}&appid={AGRO_API_KEY}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if isinstance(data, list) and len(data) > 0:
        return data[-1]  # latest entry
    return None

# ─── Streaming tasks ────────────────────────────────────

def weather_task():
    """Fetch weather for all farms and store in DB."""
    log.info("🌤️  Weather fetch cycle started")
    farms = get_all_farms()
    log.info(f"  Found {len(farms)} farms with polygons")

    for farm in farms:
        try:
            weather = fetch_weather(farm["polygonId"])
            if weather:
                # Extract soil moisture estimate from weather (humidity as proxy)
                humidity = weather.get("main", {}).get("humidity", None)
                soil_est = humidity * 0.6 if humidity else None  # rough estimate
                
                # Simple drought risk heuristic
                temp = weather.get("main", {}).get("temp", 0)
                rain = weather.get("rain", {}).get("1h", 0) if weather.get("rain") else 0
                drought_risk = min(1.0, max(0.0, (temp - 25) / 20 - rain / 10))
                
                upsert_farm_data(
                    farm["id"],
                    weather=weather,
                    soil_moisture=soil_est,
                    drought_risk=round(drought_risk, 3),
                )
        except Exception as e:
            log.error(f"  ⚠️ Weather fetch failed for {farm['name']}: {e}")


def ndvi_task():
    """Fetch NDVI for all farms and store in DB."""
    log.info("🛰️  NDVI fetch cycle started")
    farms = get_all_farms()
    log.info(f"  Found {len(farms)} farms with polygons")

    for farm in farms:
        try:
            ndvi_data = fetch_ndvi(farm["polygonId"])
            if ndvi_data and "data" in ndvi_data:
                mean_ndvi = ndvi_data["data"].get("mean", None)
                upsert_farm_data(farm["id"], ndvi=mean_ndvi)
                log.info(f"  📊 NDVI for {farm['name']}: {mean_ndvi}")
        except Exception as e:
            log.error(f"  ⚠️ NDVI fetch failed for {farm['name']}: {e}")

# ─── Scheduler ──────────────────────────────────────────

def run_scheduler():
    """Simple scheduler: runs weather every hour, NDVI every 5 days."""
    last_weather = 0
    last_ndvi = 0

    while True:
        now = time.time()

        if now - last_weather >= WEATHER_INTERVAL_SEC:
            try:
                weather_task()
            except Exception as e:
                log.error(f"Weather task error: {e}")
            last_weather = now

        if now - last_ndvi >= NDVI_INTERVAL_SEC:
            try:
                ndvi_task()
            except Exception as e:
                log.error(f"NDVI task error: {e}")
            last_ndvi = now

        # Sleep for 60 seconds between checks
        time.sleep(60)

# ─── Health check endpoint ──────────────────────────────

from http.server import HTTPServer, BaseHTTPRequestHandler

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "service": "pathway-streaming",
                "timestamp": datetime.utcnow().isoformat(),
            }).encode())
        elif self.path == "/trigger/weather":
            threading.Thread(target=weather_task, daemon=True).start()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Weather fetch triggered"}).encode())
        elif self.path == "/trigger/ndvi":
            threading.Thread(target=ndvi_task, daemon=True).start()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"message": "NDVI fetch triggered"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        log.info(f"HTTP: {args[0]}")

# ─── Main ───────────────────────────────────────────────

def main():
    log.info("=" * 50)
    log.info("🌿 GreenGuard AI — Pathway Streaming Service")
    log.info("=" * 50)

    if not DATABASE_URL:
        log.error("❌ DATABASE_URL not set!")
        return
    if not AGRO_API_KEY:
        log.error("❌ AGROMONITORING_API_KEY not set!")
        return

    log.info(f"📊 Weather interval: {WEATHER_INTERVAL_SEC}s ({WEATHER_INTERVAL_SEC//3600}h)")
    log.info(f"🛰️  NDVI interval: {NDVI_INTERVAL_SEC}s ({NDVI_INTERVAL_SEC//86400}d)")

    # Run initial fetch
    log.info("🚀 Running initial data fetch...")
    try:
        weather_task()
        ndvi_task()
    except Exception as e:
        log.error(f"Initial fetch error: {e}")

    # Start scheduler in background
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    log.info("⏰ Scheduler started")

    # Start health check HTTP server
    port = int(os.environ.get("PORT", "8081"))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    log.info(f"🌐 Health check server on http://0.0.0.0:{port}")
    log.info(f"   GET /health        — Service status")
    log.info(f"   GET /trigger/weather — Manual weather fetch")
    log.info(f"   GET /trigger/ndvi   — Manual NDVI fetch")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log.info("👋 Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
