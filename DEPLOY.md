# Deployment (Railway + Vercel)

## 1. MongoDB Atlas
In **Network Access**, allow `0.0.0.0/0` (required for Railway).

## 2. Backend → Railway
1. Go to https://railway.app → New Project → Deploy from GitHub (or empty service + CLI).
2. Set **Root Directory** to this repo root.
3. Start command: `npm start`
4. Add variables:

```
MONGODB_URI=mongodb+srv://USER:PASS@cluster0.se51g8e.mongodb.net/sellvro?appName=Cluster0
JWT_SECRET=a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=https://YOUR-VERCEL-APP.vercel.app
```

5. Deploy and copy the public URL, e.g. `https://sellvro-api.up.railway.app`

## 3. Frontend → Vercel
1. Go to https://vercel.com → Add New Project → import this repo.
2. Framework: Vite · Build: `npm run build` · Output: `dist`
3. Add env var:

```
VITE_API_URL=https://YOUR-RAILWAY-APP.up.railway.app/api
```

4. Deploy.
5. Copy the Vercel URL and update Railway `CLIENT_URL` to that URL (comma-separate if you keep localhost too), then redeploy Railway.

## CLI (optional)

```bash
# Backend
npx @railway/cli login
npx @railway/cli init
npx @railway/cli variables set MONGODB_URI="..." JWT_SECRET="..." CLIENT_URL="..."
npx @railway/cli up

# Frontend
npx vercel login
npx vercel --prod
```
