# ScrapCRM — Setup Guide
## Scrap & Recycling Industry ERP
## Developed by Jayamm Technologies | +91-9445155934

---

## PROJECT STRUCTURE

```
scrapcrm/
├── backend/          ← Node.js + Express API
│   ├── server.js
│   ├── schema.sql
│   ├── .env
│   ├── config/
│   │   ├── db.js
│   │   └── docNumber.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── dashboard.js
│       ├── parties.js
│       ├── transactions.js
│       ├── notes.js
│       └── operations.js
└── frontend/         ← React Web App + Android APK
    ├── src/
    │   ├── App.jsx   ← Complete UI
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── capacitor.config.json
```

---

## STEP 1 — VPS Server Setup

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PM2 (keeps app running)
npm install -g pm2

# Install Nginx (web server)
sudo apt install nginx -y
```

---

## STEP 2 — Database Setup

```bash
mysql -u root -p
# Enter your MySQL password

# Run this:
source /path/to/schema.sql

# Verify:
USE scrapcrm;
SHOW TABLES;
```

---

## STEP 3 — Backend Deployment

```bash
# Upload backend folder to VPS
scp -r backend/ root@YOUR_VPS_IP:/var/www/scrapcrm-backend/

# On VPS:
cd /var/www/scrapcrm-backend
cp .env.example .env
nano .env  # Fill in your MySQL credentials

npm install

# Start with PM2
pm2 start server.js --name scrapcrm-backend
pm2 save
pm2 startup

# Test:
curl http://localhost:5000/health
```

---

## STEP 4 — Frontend Deployment

```bash
# On your Windows machine:
cd frontend

# Update API URL in src/App.jsx:
# Change: YOUR_VPS_IP:5000/api
# To:     http://YOUR_VPS_IP:5000/api

npm install
npm run build

# Upload dist/ folder to VPS:
scp -r dist/ root@YOUR_VPS_IP:/var/www/scrapcrm-frontend/
```

---

## STEP 5 — Nginx Configuration

```nginx
# /etc/nginx/sites-available/scrapcrm
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Frontend
    root /var/www/scrapcrm-frontend;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/scrapcrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## STEP 6 — Android APK Build

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android

# Build web first
npm run build

# Add Android platform
npx cap add android
npx cap copy android
npx cap open android

# In Android Studio:
# Build → Generate Signed Bundle/APK → APK
# File will be at: android/app/build/outputs/apk/release/
```

---

## DEFAULT LOGIN

| Field | Value |
|-------|-------|
| Email | admin@mvrpolyplast.com |
| Password | Admin@1234 |
| Role | Super Admin |

⚠️ Change password immediately after first login!

---

## API BASE URL

- Development: http://localhost:5000/api
- Production:  http://YOUR_VPS_IP:5000/api

---

## DOCUMENT NUMBER FORMAT

| Document | Format | Example |
|----------|--------|---------|
| Invoice | MVR/INV/001/26-27 | MVR/INV/001/26-27 |
| Purchase Order | MVR/PO/001/26-27 | MVR/PO/001/26-27 |
| Credit Note | MVR/CN/001/26-27 | MVR/CN/001/26-27 |
| Debit Note | MVR/DN/001/26-27 | MVR/DN/001/26-27 |
| Delivery Challan | MVR/DC/001/26-27 | MVR/DC/001/26-27 |
| Receipt | MVR/REC/001/26-27 | MVR/REC/001/26-27 |

---

ScrapCRM v1.0 | Jayamm Technologies | +91-9445155934
