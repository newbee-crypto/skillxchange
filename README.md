<div align="center">

# ⚡ SkillXchange

### AI-Powered Real-Time Skill Exchange & Micro-Service Marketplace

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A full-stack MERN application where users can **create profiles**, **discover skills**, **chat in real-time**, **video call peer-to-peer**, **book sessions**, and get **AI-powered suggestions** — all in one beautiful dark-themed interface.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Quick Start](#-quick-start) · [API Reference](#-api-reference) · [Architecture](#-architecture) · [Contributing](#-contributing)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **JWT Authentication** | Secure signup/login with hashed passwords and token-based auth |
| 👤 **User Profiles** | Bio, avatar upload, location, skill management with categories & levels |
| 🔍 **Smart Search** | Full-text search + filter by skill name and proficiency level |
| 💬 **Real-Time Chat** | Instant messaging with typing indicators, read receipts & notifications |
| 📹 **Video Calls** | WebRTC peer-to-peer video with mute, camera toggle & picture-in-picture |
| 📅 **Booking System** | Create, accept, reject, cancel sessions with provider workflows |
| 💳 **Payments** | Mock Stripe-compatible checkout (production-swap ready) |
| 🤖 **AI Assistant** | Chat summarization & personalized skill suggestions via OpenAI |
| 🟢 **Live Presence** | Real-time online/offline status powered by Redis |
| 📱 **Fully Responsive** | Mobile-first design with hamburger menu & adaptive layouts |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** + **Vite** | Fast SPA with HMR |
| **Tailwind CSS** | Utility-first styling with custom dark theme |
| **Zustand** | Lightweight global state management |
| **Socket.io Client** | Real-time communication |
| **WebRTC** | Peer-to-peer video/audio |
| **Axios** | HTTP client with JWT interceptors |
| **Lucide React** | Beautiful icon library |
| **React Hot Toast** | Toast notifications |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js** + **Express** | REST API server |
| **MongoDB** + **Mongoose** | Database with ODM |
| **Socket.io** | Real-time events (chat, signaling, presence) |
| **Redis** (Upstash) | Online presence caching |
| **JWT** + **bcryptjs** | Authentication & password hashing |
| **Multer** | Avatar image uploads |
| **OpenAI API** | AI chat summarization & skill suggestions |
| **Helmet** + **Rate Limiter** | Security middleware |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **MongoDB** running locally or [MongoDB Atlas](https://www.mongodb.com/atlas) URI
- **Redis** (optional) — Free cloud instance at [Upstash](https://upstash.com/)
- **OpenAI API Key** (optional) — Mock fallback included

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/newbee-crypto/skillxchange.git
cd skillxchange
```

### 2️⃣ Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3️⃣ Set Up Environment Variables

Create a `server/.env` file (copy from the example):

```bash
cd ../server
cp .env.example .env
```

Then edit `server/.env` with your values:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://localhost:27017/skillexchange

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Redis (Optional — app works without it)
REDIS_URL=redis://localhost:6379
# For Upstash (recommended):
# REDIS_URL=rediss://default:your-password@your-endpoint.upstash.io:6379

# OpenAI (Optional — mock fallback included)
OPENAI_API_KEY=sk-your-openai-key-here

# Stripe (Optional — mock payment included)
STRIPE_SECRET_KEY=sk_test_your-stripe-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### 4️⃣ Start Development Servers

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd server
npm run dev
```

```bash
# Terminal 2 — Frontend
cd client
npm run dev
```

### 5️⃣ Open the App

Navigate to **http://localhost:5173** in your browser 🎉

---

## 📁 Project Structure

```
skillxchange/
│
├── client/                          # ⚛️  React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx           # Responsive navbar with hamburger menu
│   │   ├── pages/
│   │   │   ├── Login.jsx            # Login with glassmorphism UI
│   │   │   ├── Signup.jsx           # Registration page
│   │   │   ├── Dashboard.jsx        # Stats, AI suggestions, user discovery
│   │   │   ├── Profile.jsx          # Profile editing + avatar upload + skills
│   │   │   ├── Search.jsx           # Search users by skill/level with filters
│   │   │   ├── Chat.jsx             # Real-time messaging with AI summarize
│   │   │   ├── VideoCall.jsx        # WebRTC P2P video with controls
│   │   │   ├── Bookings.jsx         # Session booking management
│   │   │   └── Payment.jsx          # Mock Stripe checkout
│   │   ├── services/
│   │   │   ├── api.js               # Axios client + JWT interceptor
│   │   │   └── socket.js            # Socket.io singleton
│   │   ├── store/
│   │   │   └── authStore.js         # Zustand auth state + persistence
│   │   ├── App.jsx                  # Routes + protected route wrapper
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Tailwind + glassmorphism + animations
│   ├── index.html
│   ├── vite.config.js               # Dev proxy to backend
│   ├── tailwind.config.js           # Custom dark theme
│   └── package.json
│
├── server/                          # 🟢 Node.js Backend
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   └── redis.js                 # Redis client (Upstash-ready)
│   ├── controllers/
│   │   ├── authController.js        # Signup / Login / GetMe
│   │   ├── userController.js        # Profile CRUD, skills, search
│   │   └── bookingController.js     # Create, list, update status
│   ├── middleware/
│   │   └── auth.js                  # JWT verification + token generator
│   ├── models/
│   │   ├── User.js                  # User schema + password hashing
│   │   ├── Message.js               # Chat message schema
│   │   └── Booking.js               # Session booking schema
│   ├── routes/
│   │   ├── auth.js                  # POST /signup, /login, GET /me
│   │   ├── users.js                 # GET/PUT profile, skills, search
│   │   ├── bookings.js              # POST/GET/PATCH bookings
│   │   ├── messages.js              # GET chat history
│   │   ├── ai.js                    # POST /summarize, GET /suggest-skills
│   │   ├── payments.js              # POST /create, /confirm
│   │   └── upload.js                # POST /avatar (multer)
│   ├── services/
│   │   ├── aiService.js             # OpenAI integration + mock fallback
│   │   └── paymentService.js        # Mock Stripe payment
│   ├── socket/
│   │   └── index.js                 # Chat, presence & WebRTC signaling
│   ├── uploads/avatars/             # User-uploaded profile images
│   ├── server.js                    # Express entry + Socket.io boot
│   ├── .env.example                 # Environment template
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 📡 API Reference

### 🔐 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/auth/signup` | ❌ | Create new account |
| `POST` | `/api/auth/login` | ❌ | Login, returns JWT |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |

### 👤 Users

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/users` | ✅ | List all users (paginated) |
| `GET` | `/api/users/search?q=react&level=advanced` | ✅ | Search by skill/name |
| `GET` | `/api/users/:id` | ✅ | Get user by ID |
| `PUT` | `/api/users/profile` | ✅ | Update own profile |
| `POST` | `/api/users/skills` | ✅ | Add a skill |
| `DELETE` | `/api/users/skills/:skillId` | ✅ | Remove a skill |

### 📅 Bookings

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/bookings` | ✅ | Create a booking |
| `GET` | `/api/bookings` | ✅ | Get my bookings |
| `PATCH` | `/api/bookings/:id/status` | ✅ | Accept / Reject / Cancel |

### 💬 Messages

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/messages/:roomId` | ✅ | Get chat history (paginated) |

### 🤖 AI

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/ai/summarize` | ✅ | Summarize chat conversation |
| `GET` | `/api/ai/suggest-skills` | ✅ | Get personalized skill suggestions |

### 💳 Payments

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/payments/create` | ✅ | Create payment intent |
| `POST` | `/api/payments/confirm` | ✅ | Confirm payment |

### 📸 Upload

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/upload/avatar` | ✅ | Upload profile image (max 5MB) |

---

## 🔌 Socket.io Events

### Chat Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `chat:join` | Client → Server | `roomId` | Join a chat room |
| `chat:leave` | Client → Server | `roomId` | Leave a chat room |
| `chat:message` | Bidirectional | `{ roomId, receiverId, content }` | Send/receive message |
| `chat:typing` | Client → Server | `{ roomId }` | User started typing |
| `chat:stop-typing` | Client → Server | `{ roomId }` | User stopped typing |
| `chat:notification` | Server → Client | `{ from, message }` | New message notification |

### Presence Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `users:online` | Server → Client | `[userId, ...]` | Initial online user list |
| `user:online` | Server → Client | `{ userId }` | User came online |
| `user:offline` | Server → Client | `{ userId }` | User went offline |

### WebRTC Signaling

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `webrtc:offer` | Bidirectional | `{ to, offer, roomId }` | Send WebRTC offer |
| `webrtc:answer` | Bidirectional | `{ to, answer }` | Send WebRTC answer |
| `webrtc:ice-candidate` | Bidirectional | `{ to, candidate }` | Exchange ICE candidate |
| `webrtc:end-call` | Bidirectional | `{ to }` | End the call |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React + Vite)                    │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│   │  Zustand  │  │  Axios   │  │Socket.io │  │   WebRTC     │   │
│   │  Store    │  │  Client  │  │  Client  │  │ PeerConnection│  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│        │              │              │               │           │
└────────┼──────────────┼──────────────┼───────────────┼───────────┘
         │              │              │               │
         │         REST API       WebSocket        P2P Media
         │              │              │               │
┌────────┼──────────────┼──────────────┼───────────────┼───────────┐
│        │              │              │               │           │
│   ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌──────▼───────┐   │
│   │   JWT    │  │ Express  │  │Socket.io │  │   STUN/TURN  │   │
│   │  Auth    │  │ Router   │  │  Server  │  │   Servers    │   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────┘   │
│        │              │              │                           │
│        ├──────────────┤              │                           │
│   ┌────▼──────────────▼─────┐  ┌────▼──────────────┐            │
│   │      Controllers        │  │  Socket Handlers   │            │
│   │  auth · user · booking  │  │  chat · presence   │            │
│   └────────────┬────────────┘  │  webrtc signaling  │            │
│                │               └────────┬───────────┘            │
│   ┌────────────▼────────────┐           │                        │
│   │       Services          │           │                        │
│   │   AI · Payment · Upload │           │                        │
│   └────────────┬────────────┘           │                        │
│                │                        │                        │
│   ┌────────────▼────────────────────────▼───────┐               │
│   │              Data Layer                      │               │
│   │  ┌──────────┐  ┌──────────┐  ┌───────────┐  │               │
│   │  │ MongoDB  │  │  Redis   │  │  Uploads  │  │               │
│   │  │ (Mongoose)│  │(Upstash) │  │  (Multer) │  │               │
│   │  └──────────┘  └──────────┘  └───────────┘  │               │
│   └──────────────────────────────────────────────┘               │
│                     Server (Node.js + Express)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|:--------:|---------|-------------|
| `PORT` | ❌ | `5000` | Server port |
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs |
| `JWT_EXPIRE` | ❌ | `7d` | Token expiry duration |
| `REDIS_URL` | ❌ | `redis://localhost:6379` | Redis connection (Upstash supported) |
| `OPENAI_API_KEY` | ❌ | — | OpenAI key for AI features (mock fallback) |
| `STRIPE_SECRET_KEY` | ❌ | — | Stripe key (mock included) |
| `CLIENT_URL` | ❌ | `http://localhost:5173` | Frontend URL for CORS |

### Feature Fallbacks

This app is designed to run with **zero external services** beyond MongoDB:

| Service | If Missing | Fallback |
|---------|------------|----------|
| **Redis** | App runs fine | In-memory presence tracking |
| **OpenAI** | AI features use mock data | Pre-built suggestions & summaries |
| **Stripe** | Payments still work | Mock payment processing |

---

## 🧪 Testing the App

### Quick Test Flow

1. **Sign up** two users in different browser tabs (or one in incognito)
2. **Add skills** to both profiles (e.g., "React" and "Python")
3. **Search** for the other user by skill name
4. **Chat** — Click "Chat" on a user's profile → send messages in real-time
5. **Video Call** — Go to Video tab → click "Start Video Call" on online user
6. **Book a Session** — Go to Bookings → select a user → choose a skill → set price
7. **Accept Booking** — Switch to the other user → accept the booking
8. **Pay** — Click the pay button → complete mock checkout
9. **AI Summary** — In chat, click the ✨ sparkle icon to summarize the conversation

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙋‍♂️ Author

**Aditya Srivastav**

---

<div align="center">
  
⭐ **If you found this project helpful, give it a star!** ⭐

</div>
