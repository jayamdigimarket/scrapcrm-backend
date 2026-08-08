# ScrapCRM — Railway Deployment Guide
## Using Railway + Hostinger Subdomain

---

## PART 1: Deploy Backend on Railway

### Step 1: Prepare Backend for Railway

Create these files in D:\scrapcrm\backend\

**File: Procfile** (no extension)
```
web: node server.js
```

**File: .env** (for Railway environment variables — don't upload this, set in Railway dashboard)
```
PORT=5000
DB_HOST=your_railway_mysql_host
DB_USER=root
DB_PASSWORD=your_railway_db_password
DB_NAME=railway
JWT_SECRET=MVRPolyplast2026SecretKey!
NODE_ENV=production
```

### Step 2: Push Backend to GitHub

On your Windows PC:
```cmd
cd D:\scrapcrm\backend

# Initialize git (if not done)
git init
git add .
git commit -m "ScrapCRM backend initial deploy"

# Create repo on github.com → New Repository → scrapcrm-backend
git remote add origin https://github.com/YOUR_USERNAME/scrapcrm-backend.git
git push -u origin main
```

### Step 3: Deploy on Railway

1. Go to railway.app → Login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Select your `scrapcrm-backend` repo
5. Railway auto-detects Node.js ✅

### Step 4: Add MySQL Database on Railway

1. In your Railway project → Click **"+ Add Service"**
2. Select **"Database" → "MySQL"**
3. Railway creates MySQL automatically
4. Click on MySQL service → **"Variables"** tab
5. Copy: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT

### Step 5: Set Environment Variables in Railway

In your backend service → **"Variables"** tab → Add:
```
PORT = 5000
DB_HOST = <copy MYSQLHOST from MySQL service>
DB_PORT = <copy MYSQLPORT>
DB_USER = <copy MYSQLUSER>
DB_PASSWORD = <copy MYSQLPASSWORD>
DB_NAME = <copy MYSQLDATABASE>
JWT_SECRET = MVRPolyplast2026SecretKey!
NODE_ENV = production
```

### Step 6: Import Your Database to Railway MySQL

1. Install Railway CLI:
```cmd
npm install -g @railway/cli
railway login
```

2. Export your local DB first (MySQL Workbench):
   - Server → Data Export → scrapcrm → Export to Self-Contained File
   - Save as: `C:\scrapcrm_backup.sql`

3. Import to Railway:
```cmd
railway link  (select your project)
railway run mysql -h $MYSQLHOST -u $MYSQLUSER -p$MYSQLPASSWORD $MYSQLDATABASE < C:\scrapcrm_backup.sql
```

OR use a MySQL GUI tool — connect to Railway MySQL using the connection details and import.

### Step 7: Get Your Railway Backend URL

In Railway → your backend service → **"Settings"** tab → **"Domains"**
Click **"Generate Domain"**
You get: `https://scrapcrm-backend-production.up.railway.app`

---

## PART 2: Deploy Frontend on Railway

### Step 1: Create vite.config for production

In `D:\scrapcrm\frontend\vite.config.js` — already exists, just check it has:
```js
export default {
  build: {
    outDir: 'dist',
  }
}
```

### Step 2: Create railway.json in frontend folder

**File: D:\scrapcrm\frontend\railway.json**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npx serve dist -p $PORT",
    "healthcheckPath": "/"
  }
}
```

### Step 3: Push Frontend to GitHub

```cmd
cd D:\scrapcrm\frontend

# Create .env.production with Railway backend URL
echo VITE_API_URL=https://scrapcrm-backend-production.up.railway.app/api > .env.production

git init
git add .
git commit -m "ScrapCRM frontend"
git remote add origin https://github.com/YOUR_USERNAME/scrapcrm-frontend.git
git push -u origin main
```

### Step 4: Deploy Frontend on Railway

1. Railway → New Project → Deploy from GitHub
2. Select `scrapcrm-frontend`
3. Add variable: `VITE_API_URL = https://your-backend.up.railway.app/api`
4. Railway builds and deploys automatically ✅
5. Get frontend URL: `https://scrapcrm-frontend-production.up.railway.app`

---

## PART 3: Custom Subdomain on Hostinger

### Step 1: Add Subdomain in Hostinger

1. Login to **hPanel** (hpanel.hostinger.com)
2. Go to **Domains** → Click your main domain
3. Click **"Subdomains"**
4. Create subdomain:
   ```
   Subdomain: erp
   Domain:    mvrpolyplast.com
   → Creates: erp.mvrpolyplast.com
   ```
5. Click **"Create"**

### Step 2: Point Subdomain to Railway

1. In Hostinger hPanel → **DNS Zone Editor**
2. Find the `erp` subdomain record
3. **Delete** the default A record for `erp`
4. Add a **CNAME record**:
   ```
   Type:  CNAME
   Name:  erp
   Value: scrapcrm-frontend-production.up.railway.app
   TTL:   3600
   ```
5. Save

### Step 3: Add Custom Domain in Railway

1. Railway → your frontend service → Settings → Domains
2. Click **"Custom Domain"**
3. Enter: `erp.mvrpolyplast.com`
4. Railway shows you a CNAME value to point to
5. Railway auto-provisions SSL certificate ✅

### Step 4: Wait for DNS Propagation

DNS changes take 5-30 minutes. Then:
```
https://erp.mvrpolyplast.com → ScrapCRM Login ✅
```

---

## QUICK SUMMARY

```
Your Setup After Deployment:

erp.mvrpolyplast.com          ← Frontend (React)
    ↓ CNAME
Railway Frontend Service
    ↓ API calls
Railway Backend Service (Node.js)
    ↓ SQL queries  
Railway MySQL Database
```

---

## COSTS

| Service | Cost |
|---|---|
| Railway Backend | Free (500 hrs/mo) or $5/mo |
| Railway MySQL | Free (1GB) or $5/mo |
| Railway Frontend | Free (500 hrs/mo) |
| Hostinger Domain | Already have it ✅ |
| Subdomain | FREE (included in domain) |
| SSL Certificate | FREE (Railway provides it) |
| **Total** | **₹0 — FREE to start!** |

---

## AFTER DEPLOYMENT — UPDATE WORKFLOW

When you make changes to the app:
```cmd
# Update backend
cd D:\scrapcrm\backend
git add . && git commit -m "update" && git push
# Railway auto-deploys in 2 minutes ✅

# Update frontend
cd D:\scrapcrm\frontend
git add . && git commit -m "update" && git push
# Railway rebuilds and deploys automatically ✅
```

