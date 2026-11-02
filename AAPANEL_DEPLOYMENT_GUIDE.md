# 🚀 aaPanel Par Sellvro Deploy Karne Ka Mukammal Guide

Yeh guide aapko step-by-step batata hai ke **Sellvro** application ko **aaPanel** par kaise deploy karna hai, konsi files upload karni hain, aur Nginx / Node.js settings kaise karni hain.

---

## 📦 1. Konsi Files Deploy Karni Hain?

Aapke project root directory mein humne ek ready-made **`sellvro_aapanel.zip`** bana di hai. 

Agar aap manually upload karna chahein, to sirf yeh **8 cheezein** upload karni hoti hain:

| File / Folder | Description |
| :--- | :--- |
| **`dist/`** | Frontend ka compiled production build (HTML, JS, CSS, Assets). |
| **`server/`** | Backend ka sara code (Routes, Controllers, Models, Config). |
| **`app.cjs`** | Main Node.js production startup file (Passenger / PM2 / aaPanel compatible). |
| **`app.js`** | Alternate entry point. |
| **`package.json`** | Dependencies list aur start scripts. |
| **`package-lock.json`** | Exact dependency versions lockfile. |
| **`ecosystem.config.cjs`** | PM2 process manager configuration (Port 5001 par run karta hai). |
| **`.env`** | Production database URL, JWT secret aur domain settings. |

> [!WARNING]
> **Yeh cheezein server par upload NAHI karni:**
> - ❌ `node_modules/` (yeh server par `npm install` ke zariye install hon gi)
> - ❌ `.git/`
> - ❌ `src/` (yeh already `dist/` ke andar compile ho chuka hai)

---

## 🛠️ 2. Deployment Steps (aaPanel Node Project Manager)

### Step 1: Zip File Server Par Upload Karein
1. **aaPanel** mein login karein.
2. Left menu se **"Files"** par click karein.
3. Apne domain ke folder mein jayein, misal ke tor par:
   `/www/wwwroot/yourdomain.com`
   *(Agar folder nahi bana to pehle Website mein ja kar domain create kar lein)*.
4. Upar **"Upload"** button dabayein aur project root se **`sellvro_aapanel.zip`** upload karein.
5. Upload hone ke baad `sellvro_aapanel.zip` par right-click karein aur **"Uncompress"** (Extract) kar dein.

---

### Step 2: Environment Variables (.env) Setup Karein
1. Extracted files mein se **`.env`** file ko double-click karke open karein.
2. Apne production credentials check / update karein:
   ```ini
   NODE_ENV=production
   PORT=5001
   
   # MongoDB Atlas Connection String
   MONGODB_URI=mongodb+srv://AJAY_Chauhan:Sellvro123@cluster0.se51g8e.mongodb.net/sellvro?retryWrites=true&w=majority

   # JWT Auth
   JWT_SECRET=sellvro_production_secret_key_9876543210
   JWT_EXPIRES_IN=7d

   # Aapka Live Domain
   CLIENT_URL=https://yourdomain.com

   # WMS Integration URL
   WMS_BASE_URL=https://wmsbysellvro.com
   ```
3. File **Save** kar dein.

> [!IMPORTANT]
> **MongoDB Atlas IP Whitelist:**
> Make sure karein ke aapne MongoDB Atlas dashboard (`https://cloud.mongodb.com`) mein:
> - **Security** ➔ **Network Access** mein ja kar apne aaPanel server ka IP whitelist kiya ho (ya testing ke liye `0.0.0.0/0` - Allow Access from Anywhere kiya ho).

---

### Step 3: aaPanel Node Project Create Karein
1. aaPanel ke left menu se **"Website"** par click karein.
2. Upar tabs mein **"Node project"** par click karein.
   *(Agar Node project tab na ho to App Store se **"Node.js Version Manager"** install karein aur Node v18 ya v20 install karein)*.
3. **"Add Node project"** button dabayein aur yeh settings fill karein:
   - **Project Name:** `sellvro`
   - **Path:** `/www/wwwroot/yourdomain.com` (jahan files extract ki hain)
   - **Run Opt:** `node` (ya `npm`)
   - **Run Command / File:** `app.cjs` (ya Run script: `start`)
   - **Port:** `5001`
   - **Node Version:** `v18.x` ya `v20.x`
   - **Run as:** `www`
4. **"Submit"** par click karein.

---

### Step 4: Dependencies Install Karein
1. Node project create hone ke baad project row mein **"Module"** / **"Install Dependencies"** par click karein.
2. aaPanel automatically `package.json` par `npm install --omit=dev` run kar dega.
3. *Alternative (Terminal ke zariye):*
   aaPanel ke **Terminal** mein ja kar yeh run karein:
   ```bash
   cd /www/wwwroot/yourdomain.com
   npm install --omit=dev
   ```

---

### Step 5: Domain Mapping & Reverse Proxy
1. Node project row mein **"Domain mapping"** par click karein.
2. Apna domain daalein (e.g., `yourdomain.com` aur `www.yourdomain.com`) aur submit karein.
3. aaPanel automatically Nginx reverse proxy bana dega jo incoming requests ko Node.js port `5001` par bhej dega.

---

### Step 6: Free SSL Certificate (HTTPS) Lagayein
1. aaPanel ➔ **Website** ➔ Apne domain par click karein.
2. **"SSL"** tab par jayein.
3. **"Let's Encrypt"** select karein, domain select karein aur **"Apply"** dabayein.
4. SSL activate hone ke baad **"Force HTTPS"** toggle on kar dein.

---

### Step 7: Check & Test Karein
1. Browser mein API health check karein:
   `https://yourdomain.com/api/health`
   *(Yeh response `status: "ok"` aur database `connected` return kare ga).*
2. Website open karein:
   `https://yourdomain.com`
3. Admin portal login check karein:
   `https://yourdomain.com/login`

---

## 💡 Troubleshooting & Common Fixes

1. **MongoDB Connection Failed:**
   - Error: `ServerSelectionError` / `IP not whitelisted`.
   - **Solution:** MongoDB Atlas ➔ Network Access ➔ Add IP Address ➔ `0.0.0.0/0` allow karein.

2. **Page Refresh Par 404 Error (React Router):**
   - Hamare `server/server.js` mein already SPA wildcard fallback shamil hai, is liye Nginx reverse proxy ke sath kisi bhi sub-page (e.g. `/supplier/dashboard`, `/admin/suppliers`) pr refresh krne se 404 nahi aayega.

3. **Port Conflict:**
   - Agar Port 5001 already use ho raha ho to `.env` aur aaPanel Node settings dono mein port `5002` ya `5000` set kar lein.

