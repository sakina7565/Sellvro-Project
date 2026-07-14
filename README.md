# Sellvro / Urbanoas

React + Vite frontend with a Node.js / Express / MongoDB Atlas backend.

## Setup

1. Copy `.env.example` to `.env` and set your MongoDB Atlas URI.
2. In MongoDB Atlas → **Network Access**, allow your current IP (or `0.0.0.0/0` for local development).
3. Install dependencies:

```bash
npm install
```

4. Run frontend + backend together:

```bash
npm run dev:all
```

Or separately:

```bash
npm run dev:server
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000/api/health

## Auth flow

1. Everyone registers on `/register` (role: admin | supplier | user).
2. **Admin** lands on `/admin/dashboard` immediately (only admins can open `/admin/*`).
3. **Supplier** lands on `/supplier/business/details`, submits business info, waits for admin approval, then can access `/supplier/dashboard`.
4. **User** lands on `/user/business/detail`, same verification flow, then `/user/dashboard`.

Admin approves accounts from **Pending Suppliers** and **Pending Users**.
