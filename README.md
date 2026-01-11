# 🎥 VTube – Backend for a YouTube-like Video Platform

VTube is a **production-grade backend** for a YouTube-style social video platform built with **Node.js, Express, MongoDB, and Cloudinary**.  
It supports secure authentication, video uploads, subscriptions, playlists, comments, likes, tweets, watch history, and creator analytics.

---

## 🚀 Live API & Documentation

**Live Backend (Render)**  
👉 https://vtube-d9az.onrender.com  

**Public API Documentation (Postman)**  
👉 https://documenter.getpostman.com/view/46274146/2sBXVfir3J  

---

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Varun1911/VTube.git
cd VTube
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create a `.env` file
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string

ACCESS_TOKEN_SECRET=your_access_secret
ACCESS_TOKEN_EXPIRY=15m

REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CORS_ORIGIN=http://localhost:3000
```

### 4. Run the server
```bash
npm run dev
```

API base URL:
```
http://localhost:8000/api/v1
```

---

## 🧠 System Architecture

VTube follows a client-server architecture with CDN-based media delivery.

**Architecture Diagram**  
👉 https://drive.google.com/file/d/1UKVziWincK5Nk6mApPIRmI1HzHlli1DL/view?usp=sharing  

**Flow**
```
Client → VTube API → MongoDB
Client ← Cloudinary CDN
VTube API → Cloudinary (media uploads)
```

---

## 📊 Database Schema

The database is designed to support a full video-sharing social platform.

**Data Model Diagram**  
👉 https://app.eraser.io/workspace/xCmrQlSaVExfTHMIOOHd  

Collections:
- Users
- Videos
- Comments
- Likes
- Subscriptions
- Playlists
- Tweets

---

## 🚀 Features

### 🔐 Authentication
- JWT access & refresh tokens
- HttpOnly cookies & bearer token support
- Password hashing with bcrypt
- Route-level authorization middleware

### 👤 Users & Channels
- Registration with avatar & cover image
- Channel profiles with subscriber count
- Watch history
- Profile updates

### 📹 Video Platform
- Upload videos & thumbnails via Cloudinary
- Publish / unpublish videos
- View tracking
- Ownership-based access control

### 💬 Comments
- Add, edit, delete comments
- Paginated comment feeds
- Like count & isLiked status

### ❤️ Likes
- Like videos, comments & tweets
- Toggle-based system
- Fetch all liked videos

### 🧵 Tweets
- Create, update, delete tweets
- Like tweets
- Fetch tweets by user

### 📁 Playlists
- Create, update, delete playlists
- Add / remove videos
- Prevent duplicates
- Compute total duration & video count

### 📺 Subscriptions
- Subscribe / unsubscribe channels
- Fetch channel subscribers
- Fetch user’s subscribed channels

### 📊 Creator Dashboard
- Total videos
- Total views
- Total subscribers
- Likes on videos, comments & tweets
- Total comments
- Paginated video list

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express  
- **Database:** MongoDB Atlas  
- **Authentication:** JWT (Access & Refresh Tokens)  
- **Media Storage:** Cloudinary  
- **File Uploads:** Multer  
- **Search & Aggregation:** MongoDB Aggregation Pipelines  
- **API Docs:** Postman  

---

## 🗂 Project Structure

```
src/
├── controllers/        # Business logic
├── models/             # MongoDB schemas
├── routes/             # API endpoints
├── middlewares/        # Auth & uploads
├── utils/              # Helpers & error handling
├── db/                 # Database connection
├── app.js
└── index.js
```

---

## 📌 Why This Project

VTube demonstrates how a real video platform backend is built:
- Secure authentication
- Media storage via CDN
- Social interactions
- Scalable MongoDB aggregation
- Creator analytics

---

## 🧾 License

MIT
