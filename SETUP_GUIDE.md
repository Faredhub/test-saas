# 🚀 TixelTech-ERP Local Setup Guide

## ✅ What's Already Done
- ✅ Created `.env.local` configuration file
- ✅ Installed all npm dependencies (1038 packages)
- ✅ Generated Prisma client

## 📋 Next Steps: PostgreSQL Installation (REQUIRED)

### Step 1: Download & Install PostgreSQL 16

1. **Go to:** https://www.postgresql.org/download/windows/
2. **Download:** PostgreSQL 16 installer (Windows x86-64)
3. **Run installer** `postgresql-16.x-x64-setup.exe`
4. **Installation Settings:**
   - Installation directory: Keep default (C:\Program Files\PostgreSQL\16)
   - Components: Keep all checked (Server, pgAdmin, Command Line Tools)
   - Data directory: Keep default
   - Database superuser password: `admin123` ← **IMPORTANT**
   - Port: `5432` ← **IMPORTANT**
   - Locale: Default
5. **Complete installation** - let it finish fully

### Step 2: Verify Installation

After installation, PostgreSQL service should auto-start.

Open PowerShell and run:
```powershell
$env:PGPASSWORD='admin123'
psql -U postgres -h localhost -d postgres -c 'SELECT version();'
```

You should see PostgreSQL version info.

### Step 3: Initialize Database (I'll run these commands)

Once you confirm PostgreSQL is installed and running, I'll automatically execute:

```bash
# Create database
npx prisma migrate deploy

# Seed admin user
npx prisma db seed

# Start development server
npm run dev
```

---

## 🔐 Admin Login Credentials (After Setup)

Once everything is running:

- **Email:** `kamkhya@tixelerp.com`
- **Password:** `Admin@123`
- **URL:** `http://localhost:3000`

---

## 📊 Database Configuration

- **Database URL:** `postgresql://postgres:admin123@localhost:5432/tixelerp?schema=public`
- **Host:** localhost
- **Port:** 5432
- **User:** postgres
- **Password:** admin123
- **Database:** tixelerp (will be created automatically)

---

## 🛠️ Quick Commands Reference

```powershell
# Navigate to project
cd "c:\Users\Subham\Desktop\Coding-page\TixelTech-ERP"

# Test DB connection
$env:PGPASSWORD='admin123'; psql -U postgres -h localhost -d postgres -c 'SELECT 1'

# Run migrations
npx prisma migrate deploy

# Seed database with admin user
npx prisma db seed

# Start dev server
npm run dev

# Build for production
npm run build
npm start
```

---

## 🎯 Project Structure

- **Frontend:** Next.js 16 with React 19
- **Backend:** Next.js API routes
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Auth:** NextAuth v5
- **UI:** Shadcn/ui with Tailwind CSS
- **Modules:** 15 business modules (Sales, HRM, Finance, Projects, etc.)

---

## ✨ Features

- Multi-tenant ERP system
- Role-based access control (RBAC)
- 15+ business modules
- Comprehensive analytics dashboard
- REST API with Swagger documentation
- Real-time notifications
- Document management
- And much more!

---

## 📞 Support

Once PostgreSQL is running, let me know and I'll:
1. Run database migrations
2. Seed the admin user
3. Start the development server
4. Verify everything is working

**Please download and install PostgreSQL, then reply with "PostgreSQL installed"**

