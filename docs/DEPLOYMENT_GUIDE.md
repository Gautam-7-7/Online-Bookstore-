# Deployment and Environment Setup Guide

This document provides complete instructions for configuring, deploying, and verifying the Online Bookstore system across local, containerized, and cloud environments.

---

## 1. Environment Architecture

The system consists of three primary tiers:
- **Client Tier**: React / Vite single-page application served via static host or preview server.
- **API Tier**: Node.js / Express REST API running on port 5000 with JWT authentication and Razorpay integration.
- **Data Tier**: MongoDB 7.0 database (local instance or MongoDB Atlas cluster).

---

## 2. Local Containerized Deployment (Docker Compose)

The repository provides a complete multi-container setup via `docker-compose.yml`.

### Prerequisites
- Docker Engine 24.0+ and Docker Compose v2.

### Launching the Stack
1. Clone the repository and navigate to root:
   ```bash
   git clone https://github.com/Gautam-7-7/Online-Bookstore-.git
   cd Online-Bookstore-
   ```
2. Start the services:
   ```bash
   docker compose up --build -d
   ```
3. Check running containers:
   ```bash
   docker compose ps
   ```
4. Access services:
   - **Frontend**: `http://localhost:3000`
   - **Backend API**: `http://localhost:5000`
   - **Health Check**: `http://localhost:5000/api/health`
   - **MongoDB**: `localhost:27017`

5. Stopping the stack:
   ```bash
   docker compose down
   ```

---

## 3. Local Bare-Metal Setup

### Prerequisites
- Node.js 22.x LTS
- MongoDB 7.0 running locally on port 27017

### Server Setup
```bash
cd server
npm ci
cp .env.example .env
# Configure MONGODB_URI and JWT_SECRET
npm start
```

### Client Setup
```bash
cd client
npm ci
npm run dev
```

---

## 4. Production Cloud Deployment (Render + MongoDB Atlas)

The repository root includes a `render.yaml` specification for Render Blueprints:

1. **MongoDB Atlas**:
   - Provision a MongoDB Atlas M0 (Free Tier) cluster.
   - Whitelist `0.0.0.0/0` or Render egress IPs.
   - Create a database user and obtain the connection string (`mongodb+srv://...`).

2. **Render Web Service**:
   - Connect the GitHub repository to Render.
   - Choose Blueprint deployment using `render.yaml`.
   - Provide required environment variables:
     - `MONGODB_URI`: MongoDB Atlas connection URI.
     - `JWT_SECRET`: Secure random string.
     - `RAZORPAY_KEY_ID`: Razorpay Test Key ID.
     - `RAZORPAY_KEY_SECRET`: Razorpay Test Key Secret.
     - `RAZORPAY_WEBHOOK_SECRET`: Configured webhook secret.
     - `EMAIL_PROVIDER`: `brevo` or `smtp`.

3. **Razorpay Webhook Configuration**:
   - In Razorpay Dashboard -> Settings -> Webhooks:
   - Webhook URL: `https://<your-render-app>.onrender.com/api/payments/razorpay/webhook`
   - Secret: Enter value matching `RAZORPAY_WEBHOOK_SECRET`.
   - Events enabled:
     - `payment.captured`
     - `payment.failed`
     - `refund.processed`
     - `refund.failed`

---

## 5. Verification and Diagnostics

Verify the running API through the health check endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected JSON response:
```json
{
  "status": "healthy",
  "uptime": 12.34,
  "timestamp": "2026-11-12T18:30:00.000Z"
}
```
