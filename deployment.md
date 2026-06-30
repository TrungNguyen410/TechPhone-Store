# TechPhone Store Deployment Guide

## Local Docker Deployment

Run the full system from the repository root:

```bash
docker compose up -d
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Swagger: http://localhost:5000/api/docs
- MongoDB: mongodb://localhost:27017/techphone_store

Seed demo data after the backend is running:

```bash
docker compose exec backend npm run seed
```

Demo accounts:

- Admin: `admin@gmail.com` / `123456`
- Customer: `user@gmail.com` / `123456`

## Frontend: Netlify

Build settings:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist`

Environment variables:

```bash
VITE_USE_MOCK=false
VITE_API_URL=https://YOUR_RENDER_BACKEND_URL/api
```

Add a Netlify redirect file if needed:

```text
/* /index.html 200
```

The current Nginx Docker config already supports SPA fallback for container deployment.

## Backend: Render

Create a new Web Service from the repository.

Settings:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`

Environment variables:

```bash
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/techphone_store
JWT_ACCESS_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=https://YOUR_NETLIFY_SITE.netlify.app
UPLOAD_DIR=uploads
```

After first deploy, run the seed command from Render Shell if demo data is required:

```bash
npm run seed
```

## Database: MongoDB Atlas

1. Create an Atlas project and cluster.
2. Create a database user with read/write permissions.
3. Add Render outbound IPs or allow temporary setup access while configuring.
4. Copy the connection string into `MONGO_URI`.
5. Use database name `techphone_store`.

## Production Checklist

- Replace all sample JWT secrets.
- Set CORS `FRONTEND_URL` to the deployed frontend URL.
- Confirm `/api/health` and `/api/docs` respond.
- Seed data only for demo or course defense environments.
- Store uploaded files in persistent storage for long-term production use.
- Run `npm test` in `backend/` and `npm run build` in `frontend/` before release.
