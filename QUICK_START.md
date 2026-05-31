# 🚀 TixelERP - Quick Start Guide

## Current Status

✅ **COMPLETED:**
- Created `.env.local` with all necessary configuration
- Installed all npm dependencies (1,038 packages)
- Generated Prisma Client
- Created setup automation scripts

⏳ **PENDING:**
- Install PostgreSQL 16 locally
- Run database migrations
- Seed admin user
- Start the development server

---

## 📥 Installation: PostgreSQL 16 (ONE-TIME SETUP)

### Windows Installation

1. **Download PostgreSQL 16 for Windows**
   - URL: https://www.postgresql.org/download/windows/
   - Download the latest 16.x version for Windows x86-64

2. **Run the installer `postgresql-16.x-x64-setup.exe`**
   - When asked for **password**, enter: `admin123`
   - When asked for **port**, use: `5432` (default)
   - Click through remaining prompts with defaults
   - Wait for installation to complete

3. **Verify Installation** (Open PowerShell)
   ```powershell
   $env:PGPASSWORD='admin123'
   psql -U postgres -h localhost -d postgres -c 'SELECT version();'
   ```
   You should see PostgreSQL version information.

---

## 🏃 Quick Setup (AFTER PostgreSQL is installed)

### Option 1: Automated PowerShell Script (RECOMMENDED)

```powershell
cd "c:\Users\Subham\Desktop\Coding-page\TixelTech-ERP"
.\scripts\setup-local.ps1
```

The script will:
- ✅ Verify PostgreSQL is running
- ✅ Run database migrations
- ✅ Seed the admin user
- ✅ Show you the login credentials

### Option 2: Using npm commands

```powershell
cd "c:\Users\Subham\Desktop\Coding-page\TixelTech-ERP"
npm run db:migrate
npm run db:seed
npm run dev
```

### Option 3: Manual commands (if needed)

```powershell
cd "c:\Users\Subham\Desktop\Coding-page\TixelTech-ERP"
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

---

## 🌐 Access the Application

Once the dev server starts:

### URL
```
http://localhost:3000
```

### Admin Login Credentials
```
Email:    kamkhya@tixelerp.com
Password: Admin@123
```

### Login Page
The app will show a login screen. Use the credentials above.

---

## 📊 What You Get

After login, you'll have access to:

- **Dashboard** - Real-time analytics and KPIs
- **Sales** - CRM, leads, invoices, payments
- **Finance** - Accounting, payroll, expenses
- **HRM** - Employees, attendance, leaves
- **Projects** - Tasks, milestones, timesheets
- **Inventory** - Products, stock, warehouses
- **Marketing** - Campaigns, events, surveys
- **Organization** - Departments, branches, announcements
- **Reports** - Customizable business reports
- **Website** - CMS and website builder
- **And 5 more modules!**

---

## 🛠️ Helpful Commands

```powershell
# Development
npm run dev              # Start dev server on http://localhost:3000

# Database
npm run db:migrate      # Run migrations
npm run db:seed         # Seed admin user
npm run db:reset        # Reset database (⚠️ deletes all data)

# Build
npm run build           # Build for production
npm start               # Start production server

# Lint
npm run lint            # Check code quality
```

---

## ❓ Troubleshooting

### PostgreSQL Connection Error
**Problem:** "Connection refused" or "psql command not found"

**Solution:**
1. PostgreSQL might not be installed
2. PostgreSQL service might not be running
3. Try restarting your computer

### Port 5432 Already in Use
**Problem:** "Address already in use" on port 5432

**Solution:**
```powershell
# Find process using port 5432
Get-NetTCPConnection -LocalPort 5432

# Either:
# 1. Stop that service
# 2. Change DATABASE_URL port in .env.local
```

### npm dependencies error
**Problem:** Package install failed

**Solution:**
```powershell
cd "c:\Users\Subham\Desktop\Coding-page\TixelTech-ERP"
npm install
```

### Prisma Migration Issues
**Problem:** "Could not find migration" or migration fails

**Solution:**
```powershell
# Reset and try again
npm run db:reset
```

---

## 📝 Project Structure

```
TixelTech-ERP/
├── src/
│   ├── app/               # Next.js app directory
│   ├── components/        # Reusable React components
│   ├── lib/               # Utilities and helpers
│   ├── types/             # TypeScript types
│   └── hooks/             # Custom React hooks
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Database seeding script
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── scripts/               # Utility scripts
├── .env.local             # Environment variables (created)
├── package.json           # Dependencies
└── next.config.ts         # Next.js configuration
```

---

## 🎯 Next Steps

1. **Download & Install PostgreSQL 16**
   - https://www.postgresql.org/download/windows/
   
2. **Run the setup script**
   ```powershell
   .\scripts\setup-local.ps1
   ```

3. **Login with admin credentials**
   - Email: `kamkhya@tixelerp.com`
   - Password: `Admin@123`

4. **Start building!** 🚀

---

## 💡 Tips

- The first run will take a minute to start (Next.js compilation)
- Keep the terminal window open while developing
- Changes to files are hot-reloaded automatically
- Check the terminal for any errors
- Admin password is: `Admin@123` (capital A, capital A)

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Ensure PostgreSQL is running: `psql -U postgres -h localhost -d postgres -c 'SELECT 1;'`
3. Check error messages in the terminal
4. Verify all steps were completed

---

**Questions?** Check SETUP_GUIDE.md for more detailed information.
