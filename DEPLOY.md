# AECE Checkpoint — Docker Deployment Guide

This guide walks through running AECE Checkpoint on any machine using Docker.

---

## Prerequisites

Install these on the target machine:

- **Docker Desktop** (Windows / Mac) — https://www.docker.com/products/docker-desktop
- **Docker Engine** (Linux) — https://docs.docker.com/engine/install
- Docker Compose is included with both of the above.

---

## Quick Start

### 1. Get the code

Clone or copy the project folder to the target machine.

```bash
git clone <your-repo-url> aece-checkpoint
cd aece-checkpoint
```

Or simply copy the project folder via USB / file transfer.

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and set a strong database password:

```
DB_PASSWORD=use_something_strong_here
APP_URL=http://localhost:5000
```

If you want password reset emails to work, also add your Postmark token:

```
POSTMARK_SERVER_TOKEN=your-postmark-token-here
```

### 3. Build and start

```bash
docker compose up --build
```

The first build takes a few minutes. After that, the app will be available at:

```
http://localhost:5000
```

To run it in the background (after the first build):

```bash
docker compose up -d
```

---

## Accessing the App

| URL | What it is |
|-----|------------|
| `http://localhost:5000` | Main app (worker + admin portal) |
| `http://localhost:5000/admin` | Admin dashboard directly |

Default admin login: **tim@h2s.co.za** / **Admin123!**  
*(Change this immediately after first login via Settings → User Groups)*

---

## What Happens on First Start

The startup script automatically:

1. Waits for PostgreSQL to be ready
2. Creates all database tables (runs `drizzle-kit push`)
3. Starts the Node.js server

No manual database setup is required.

---

## Updating to a New Version

Pull or copy the new code, then:

```bash
docker compose down
docker compose up --build -d
```

The database tables are updated automatically on startup. Your data is preserved in the `postgres_data` Docker volume.

---

## Changing the Port

To run on a different port (e.g. 8080), edit `.env`:

```
PORT=8080
```

Then restart:

```bash
docker compose down && docker compose up -d
```

---

## Running Behind a Domain (Nginx / Reverse Proxy)

If you have a domain name (e.g. `aece.yourdomain.com`), update `.env`:

```
APP_URL=https://aece.yourdomain.com
```

Then set up Nginx to proxy requests to port 5000. A basic Nginx config:

```nginx
server {
    listen 80;
    server_name aece.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Use Certbot for free HTTPS: https://certbot.eff.org

---

## Backing Up Your Data

### Database backup (via the app)

Log in as admin → **Database Backup** in the sidebar → **Download Backup**.
This saves all data as a `.json` file you can restore from later.

### Docker volume backup (full PostgreSQL dump)

```bash
docker compose exec postgres pg_dump -U aece aece_checkpoint > backup.sql
```

To restore:

```bash
cat backup.sql | docker compose exec -T postgres psql -U aece aece_checkpoint
```

---

## Stopping the App

```bash
docker compose down
```

Your data is kept in the `postgres_data` volume and will be there when you start again.

To stop AND delete all data (full reset):

```bash
docker compose down -v
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Port already in use | Change `PORT=` in `.env` |
| App won't start — DB error | Check `DB_PASSWORD` matches in `.env` |
| Database schema error on startup | Run `docker compose down -v` then `docker compose up --build` for a clean start |
| Can't log in | Check you're using the correct admin email/password |
| Build fails | Make sure Docker has enough disk space (needs ~3GB for the build) |

View live logs:

```bash
docker compose logs -f app
```
