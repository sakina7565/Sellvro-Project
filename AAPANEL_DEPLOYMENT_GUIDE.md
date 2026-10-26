# aaPanel Par Sellvro Deploy Karne Ka Asan Guide

Yeh application production-ready hai aur aaPanel ke **Node Project Manager** ya **PM2 Manager** ke zariye 5 minute mein deploy ho jati hai.

---

### Step 1: aaPanel Mein File Upload Karein
1. aaPanel login karein.
2. Left menu se **"Files"** par jayein.
3. Path kholen jahan website host karni hai, misal ke tor par:
   `/www/wwwroot/your-domain.com`
4. **"Upload"** button dabayein aur `sellvro_aapanel.zip` upload karein.
5. Zip file par right-click karke **"Uncompress"** (Extract) kar dein.

---

### Step 2: Environment Variables (.env) Check Karein
1. Extracted files mein `.env` file ko open karein.
2. Check karein ke yeh values mojood hain:
   ```env
   MONGODB_URI=mongodb+srv://AJAY_Chauhan:Sellvro123@cluster0.se51g8e.mongodb.net/sellvro?appName=Cluster0
   JWT_SECRET=sellvro_jwt_secret_change_me_in_production
   JWT_EXPIRES_IN=7d
   PORT=5001
   CLIENT_URL=https://your-domain.com
   NODE_ENV=production
   WMS_BASE_URL=https://wmsbysellvro.com
   ```
   *(Apne domain ka naam `CLIENT_URL` mein daal dein)*.

---

### Step 3: aaPanel Node Project Create Karein
1. Left menu se **"Website"** par jayein.
2. Upar tabs mein **"Node project"** par click karein.
3. **"Add Node project"** button dabayein:
   - **Project Name:** `sellvro`
   - **Path:** `/www/wwwroot/your-domain.com`
   - **Run Opt:** `node` (ya `npm`)
   - **Run Command:** `app.cjs` (ya `node app.cjs`)
   - **Port:** `5001`
   - **Node Version:** `v18.x` ya `v20.x` (agar install nahi to Node Version Manager se install kar lein)
   - **Run as:** `www`
4. **"Submit"** par click karein.

---

### Step 4: Dependencies Install Karein (agar pehli dafa ho)
Node project list mein aapke project ke samne:
- **"Module"** / **"Install Dependencies"** par click karein taake `npm install --omit=dev` run ho jaye.
- Ya terminal mein ja kar run karein:
  ```bash
  cd /www/wwwroot/your-domain.com
  npm install --omit=dev
  ```

---

### Step 5: Domain & SSL Map Karein
1. Node project row mein **"Domain mapping"** par click karein aur apna domain add karein (e.g. `your-domain.com`).
2. aaPanel automatically Nginx reverse proxy set kar dega.
3. Domain par click karke **"SSL"** -> **"Let's Encrypt"** select karein aur free SSL certificate activate kar lein.

---

### Step 6: Verify Deployment
1. Browser mein apna domain open karein:
   `https://your-domain.com`
2. Backend health check:
   `https://your-domain.com/api/health`
