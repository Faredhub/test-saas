# 🚀 TixelTech-ERP Deployment Guide

> Complete guide to deploy TixelTech-ERP on a production server using Docker + Coolify, or manually.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Port Configuration](#-port-configuration)
- [Prerequisites](#-prerequisites)
- [Method 1: Docker Compose Deployment (Recommended)](#-method-1-docker-compose-deployment-recommended)
- [Method 2: Coolify Deployment](#-method-2-coolify-deployment)
- [Method 3: Manual / Local Deployment](#-method-3-manual--local-deployment)
- [Environment Variables](#-environment-variables)
- [Database Management](#-database-management)
- [Admin Login Credentials](#-admin-login-credentials)
- [Troubleshooting](#-troubleshooting)
- [Useful Commands](#-useful-commands)

---

## 🏗️ Project Overview

| Component       | Technology            |
|-----------------|-----------------------|
| **Frontend**    | Next.js 16 + React 19 |
| **Backend**     | Next.js API Routes    |
| **Database**    | PostgreSQL 16         |
| **Cache**       | Redis 7               |
| **ORM**         | Prisma 7              |
| **Auth**        | NextAuth v5           |
| **UI**          | Shadcn/ui + Tailwind CSS |
| **Reverse Proxy** | Nginx              |
| **Containerization** | Docker           |

---

## 🔌 Port Configuration

### Project Ports (docker-compose.yml)

These are the ports used by **your application**:

| Host Port | Container Port | Service         | Purpose                       |
|-----------|----------------|-----------------|-------------------------------|
| **8088**  | 80             | Nginx           | HTTP reverse proxy            |
| **3001**  | 3000           | App (Next.js)   | Direct app access             |
| **5431**  | 5432           | PostgreSQL      | External database connection  |
| —         | 6379           | Redis           | Internal only (not exposed)   |

### Coolify Reserved Ports (DO NOT use these)

If deploying on a Coolify server, these ports are already taken:

| Port     | Service          | Purpose                 |
|----------|------------------|-------------------------|
| **80**   | Traefik          | HTTP / websites         |
| **443**  | Traefik          | HTTPS / SSL websites    |
| **8000** | Coolify          | Coolify dashboard       |
| **8080** | Traefik          | Traefik dashboard/API   |
| **6001** | Coolify Realtime | Realtime/WebSocket      |
| **6002** | Coolify Realtime | Realtime/WebSocket      |

> ⚠️ **Important:** The project ports have been specifically chosen to avoid conflicts with Coolify's reserved ports.

---

## ✅ Prerequisites

### For Docker Deployment
- Linux server (Ubuntu 22.04+ recommended)
- Docker Engine 24+
- Docker Compose v2+
- Git installed
- Minimum 2GB RAM, 20GB disk space

### For Manual / Local Deployment
- Node.js 22+ (LTS)
- PostgreSQL 16
- Redis 7 (optional for local dev)
- npm 10+

---

## 🐳 Method 1: Docker Compose Deployment (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/TixelTech-ERP.git
cd TixelTech-ERP
```

### Step 2: Create Environment File

```bash
cp .env.example .env
```

Edit the `.env` file with your production values:

```bash
nano .env
```

Set these **required** values:

```env
# Database (used by docker-compose internally)
DB_PASSWORD=your_strong_password_here

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-a-random-64-char-string

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

> 💡 **Tip:** Generate a secure NEXTAUTH_SECRET with:
> ```bash
> openssl rand -base64 64
> ```

### Step 3: Build and Start All Services

```bash
docker compose up -d --build
```

This will:
1. Build the Next.js app Docker image
2. Start PostgreSQL 16 database
3. Start Redis 7 cache
4. Run Prisma migrations automatically (via `docker-entrypoint.sh`)
5. Start the Next.js production server
6. Start Nginx reverse proxy

### Step 4: Verify All Services Are Running

```bash
docker compose ps
```

Expected output:

```
NAME              STATUS                    PORTS
tixelerp-app     Up (healthy)              0.0.0.0:3001->3000/tcp
tixelerp-db      Up (healthy)              0.0.0.0:5431->5432/tcp
tixelerp-redis   Up (healthy)              6379/tcp
tixelerp-nginx   Up                        0.0.0.0:8088->80/tcp
```

### Step 5: Check Application Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postgres
```

### Step 6: Seed the Admin User (First Time Only)

```bash
docker compose exec app npx prisma db seed
```

### Step 7: Access the Application

| URL                                | Purpose                    |
|------------------------------------|----------------------------|
| `http://your-server-ip:8088`       | App via Nginx (HTTP)       |
| `http://your-server-ip:3001`       | Direct app access          |

---

## ☁️ Method 2: Coolify Deployment

### Step 1: Connect Your Server to Coolify

1. Log into your Coolify dashboard at `http://your-server-ip:8000`
2. Go to **Servers** → Add your server or use localhost

### Step 2: Create a New Resource

1. Click **"+ New Resource"**
2. Select **"Docker Compose"**
3. Choose your server

### Step 3: Configure the Source

1. Select **"Git Repository"**
2. Enter your repository URL
3. Set the branch (e.g., `main`)

### Step 4: Set Environment Variables

In the Coolify dashboard, go to **Environment Variables** and add:

```
DB_PASSWORD=your_strong_password_here
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret-key
```

### Step 5: Configure Domain (Optional)

1. Go to your resource's **Settings**
2. Under **Domains**, add your custom domain (e.g., `trp.tpdemo.in`)
3. Coolify's Traefik will handle SSL automatically

### Step 6: Deploy

1. Click **"Deploy"**
2. Monitor the build logs
3. Wait for all services to become healthy

### Step 7: Seed Database (First Time)

1. Go to **Terminal** in Coolify dashboard
2. Select the `app` container
3. Run:
   ```bash
   npx prisma db seed
   ```

---

## 🖥️ Method 3: Manual / Local Deployment

### Step 1: Install PostgreSQL 16

#### Windows
1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer with these settings:
   - Components: Server, pgAdmin, Command Line Tools
   - Superuser password: `admin123`
   - Port: `5432`

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y postgresql-16 postgresql-client-16
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Create the Database

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE tixelerp;
CREATE USER tixelerp WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE tixelerp TO tixelerp;
\q
```

### Step 3: Install Redis (Optional)

```bash
# Ubuntu/Debian
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
# Should return: PONG
```

### Step 4: Clone and Install Dependencies

```bash
git clone https://github.com/your-org/TixelTech-ERP.git
cd TixelTech-ERP
npm ci
```

### Step 5: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://tixelerp:your_password@localhost:5432/tixelerp?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="my-super-secret-key-123"
```

### Step 6: Generate Prisma Client and Run Migrations

```bash
npx prisma generate
npx prisma migrate deploy
```

### Step 7: Seed the Admin User

```bash
npx prisma db seed
```

### Step 8: Build and Start

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Step 9: Access the Application

Open `http://localhost:3000` in your browser.

---

## 🔐 Environment Variables

### Required Variables

| Variable          | Description                    | Example                          |
|-------------------|--------------------------------|----------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string   | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL`    | Public URL of the app          | `https://your-domain.com`        |
| `NEXTAUTH_SECRET` | Random secret for auth tokens  | `openssl rand -base64 64`        |

### Docker-Specific Variables

| Variable      | Description           | Default                  |
|---------------|-----------------------|--------------------------|
| `DB_PASSWORD` | PostgreSQL password   | `tixelerp_prod_2026`    |

### Optional Variables

| Variable               | Description              | Default              |
|------------------------|--------------------------|----------------------|
| `REDIS_URL`            | Redis connection string  | `redis://redis:6379` |
| `SMTP_HOST`            | Email server host        | —                    |
| `SMTP_PORT`            | Email server port        | `587`                |
| `SMTP_USER`            | Email username           | —                    |
| `SMTP_PASS`            | Email password           | —                    |
| `SMTP_FROM`            | Sender email address     | `noreply@tixelerp.com` |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID   | —                    |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret      | —                    |
| `STRIPE_SECRET_KEY`    | Stripe payment key       | —                    |
| `S3_BUCKET`            | S3 storage bucket        | —                    |

---

## 🗄️ Database Management

### Connect to Database Externally

```bash
# Via Docker (host port 5431)
psql -h your-server-ip -p 5431 -U tixelerp -d tixelerp

# Or using a GUI tool (pgAdmin, DBeaver, etc.)
# Host: your-server-ip
# Port: 5431
# Database: tixelerp
# User: tixelerp
# Password: (your DB_PASSWORD)
```

### Run Migrations

```bash
# Docker
docker compose exec app npx prisma migrate deploy

# Local
npx prisma migrate deploy
```

### Reset Database (⚠️ Deletes all data)

```bash
# Local only
npx prisma migrate reset --force
```

### Backup Database

```bash
# Docker
docker compose exec postgres pg_dump -U tixelerp tixelerp > backup_$(date +%Y%m%d).sql

# Restore
cat backup_file.sql | docker compose exec -T postgres psql -U tixelerp tixelerp
```

---

## 🔑 Admin Login Credentials

After seeding the database, use these credentials to log in:

| Field        | Value                    |
|--------------|--------------------------|
| **Email**    | `kamkhya@tixelerp.com`   |
| **Password** | `Admin@123`              |
| **URL**      | `http://your-server:8088` (Docker) or `http://localhost:3000` (Local) |

> ⚠️ **Change the admin password immediately after first login!**

---

## 🔧 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs -f app

# Common fix: rebuild
docker compose down
docker compose up -d --build
```

### Database connection error

```bash
# Check if PostgreSQL is healthy
docker compose ps postgres

# Check PostgreSQL logs
docker compose logs postgres

# Test connection from app container
docker compose exec app sh -c "nc -zv postgres 5432"
```

### Port already in use

```bash
# Find what's using the port (Linux)
sudo lsof -i :8088
sudo lsof -i :3001
sudo lsof -i :5431

# Kill the process or change the port in docker-compose.yml
```

### Prisma migration fails

```bash
# Check migration status
docker compose exec app npx prisma migrate status

# Force reset (⚠️ deletes data)
docker compose exec app npx prisma migrate reset --force
```

### Redis connection error

```bash
# Check Redis health
docker compose exec redis redis-cli ping
# Should return: PONG
```

### Firewall Configuration

Make sure these ports are open on your server:

```bash
# Ubuntu (UFW)
sudo ufw allow 8088/tcp    # Caddy HTTP
sudo ufw allow 8443/tcp    # Caddy HTTPS
sudo ufw allow 3001/tcp    # Direct app access
sudo ufw allow 5431/tcp    # PostgreSQL (only if external access needed)
sudo ufw reload
```

---

## 📝 Useful Commands

### Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild and restart
docker compose up -d --build

# View running containers
docker compose ps

# View logs (follow mode)
docker compose logs -f

# Enter app container shell
docker compose exec app sh

# Enter PostgreSQL shell
docker compose exec postgres psql -U tixelerp -d tixelerp

# Enter Redis shell
docker compose exec redis redis-cli
```

### Application Commands

```bash
# Run database migrations
npx prisma migrate deploy

# Seed admin user
npx prisma db seed

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Development server
npm run dev

# Production build
npm run build
npm start

# Lint code
npm run lint
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Your Server                         │
│                                                         │
│  ┌─────────────┐     ┌─────────────────────────────┐   │
│  │   Coolify    │     │   Docker Compose Stack      │   │
│  │  (Traefik)   │     │                             │   │
│  │              │     │  ┌────────┐  ┌───────────┐  │   │
│  │  :80  (HTTP) │     │  │ Nginx  │──│ App       │  │
│  │  :443 (HTTPS)│     │  │ :8088  │  │ :3001     │  │   │
│  │  :8080 (API) │     │  └────────┘  └─────┬─────┘  │   │
│  │  :6001 (WS)  │     │                    │        │   │
│  │  :6002 (WS)  │     │         ┌──────────┴──────┐ │   │
│  └─────────────┘     │         │                 │ │   │
│                       │  ┌──────┴──┐  ┌──────────┐│ │   │
│                       │  │Postgres │  │  Redis   ││ │   │
│                       │  │ :5431   │  │ (internal)││ │   │
│                       │  └─────────┘  └──────────┘│ │   │
│                       │                            │ │   │
│                       └────────────────────────────┘ │   │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Redeployment Steps

When you need to redeploy after code changes:

### Docker Compose (Manual)

```bash
cd TixelTech-ERP
git pull origin main
docker compose down
docker compose up -d --build
```

### Coolify

1. Go to Coolify dashboard → Your project
2. Click **"Redeploy"**
3. Monitor build logs until all services are healthy

---

*Last updated: September 2026*
