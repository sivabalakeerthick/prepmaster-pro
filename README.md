# 🚀 PrepMaster Pro — Developer Interview & DSA Mastery Platform

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://careermaster.vercel.app)
[![Render](https://img.shields.io/badge/Render-Backend%20API-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![UptimeRobot](https://img.shields.io/badge/UptimeRobot-24%2F7%20Monitoring-3BD671?style=for-the-badge&logo=uptimerobot&logoColor=white)](https://uptimerobot.com)

A high-performance, full-stack developer preparation platform built with **Angular 22** and **Express.js** to track end-to-end software engineering and interview readiness across two rich learning tracks.

---

## 🌐 Live Deployments

| Component | Provider | Live URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | [https://careermaster.vercel.app](https://careermaster.vercel.app) | Angular 22 Single-Page Application (Global Edge CDN) |
| **Backend REST API** | **Render** | `https://<your-backend-app>.onrender.com` | Node.js Express server with JWT auth and progress APIs |
| **Health Check & Keep-Alive** | **UptimeRobot** | `https://<your-backend-app>.onrender.com/api/health` | Pinged every 5 min to keep Render warm 24/7 (zero cold starts) |

---

## 🌟 Key Capabilities

### 1. 🔀 Dual-Track Curriculum
* **Track 1 — Full-Stack Interview Preparation**:
  * **15 Specialized Domains** with **312+ interactive topics**.
  * Direct links to official documentation, tutorials, and practical guides.
  * Comprehensive coverage: *Java Core & Advanced, DSA, SQL & Databases, Spring Boot, Microservices, Angular, Python & AI/RAG, System Design, Behavioral, DevOps & Cloud, Security, Testing, Soft Skills, and Mock Interviews*.
  * Built-in **Career Planner** (Target Role, LPA Salary Goal, Target Date, Current Focus) and auto-saving **Personal Study Scratchpad**.
* **Track 2 — Master DSA Practice Workbook**:
  * **18 Foundation Sections** featuring **280+ beginner coding prompts** with direct practice links to HackerRank, CodingBat, and LeetCode.
  * **LeetCode Interview Roadmap**: 93+ curated interview problems categorized by algorithmic pattern with difficulty tags (*Easy*, *Medium*, *Hard*).
  * **6-Stage Study Plan**: Structured progression from Java basics to Blind 75 and mock whiteboard coding.

### 2. 🔐 Multi-User Authentication & Progress Isolation
* **Private Credentials in `.env`**: Add users directly using the `ALLOWED_USERS` JSON array in your private environment file without exposing credentials to GitHub.
* **Single Sign-On (OAuth 2.0)**: Supports one-click sign-in via **Google Identity** and **GitHub OAuth 2.0**.
* **Isolated User State**: Every checkmark, career target, and note is tied to a unique `user_id`. Multiple users or team members can track their progress independently.

### 3. 📱 Ultra-Responsive UX
* Optimized for **all screen sizes**: Desktop ($\ge 1200\text{px}$), Laptops ($1024\text{px} - 1199\text{px}$), Tablets ($768\text{px} - 1023\text{px}$), and Smartphones ($\le 480\text{px}$).
* Features a sticky **Mobile Track Switcher**, sliding off-canvas drawer navigation, responsive table scrolling wrappers, and touch targets compliant with mobile safe-area insets.

### 4. ⚡ Real-Time Auto-Save with Atomic Persistence
* Ticking any checkbox persists immediately to the database.
* Features atomic file writes (`.tmp` + rename) to safeguard against data corruption.

---

## 🏗️ Architecture & Project Structure

```
prepmaster-pro/
├── .gitignore                      # Exhaustive git exclusion rules
├── package.json                    # Workspace root scripts
├── README.md                       # Platform documentation
├── vercel.json                     # Vercel deployment & Render /api proxy config
│
├── backend/
│   ├── .env.example                # Public template for environment variables
│   ├── .gitignore                  # Backend secrets & database exclusions
│   ├── package.json                # Express backend dependencies
│   ├── data/
│   │   └── tracker.json            # Local JSON database (users & progress - git ignored)
│   └── src/
│       ├── .env                    # Active private environment credentials (git ignored)
│       ├── server.js               # Express application entry & API router
│       ├── db/database.js          # Pure JS atomic database driver
│       ├── middleware/auth.js      # JWT verification middleware with fallback secret
│       ├── routes/
│       │   ├── auth.js             # /api/auth (Login, Register, OAuth, Me)
│       │   ├── progress.js         # /api/progress (Get, Update, Summary)
│       │   └── target.js           # /api/target (Career targets & notes)
│       └── data/
│           ├── interviewTopics.json# 15 domains, 312+ topics with documentation links
│           └── dsaTopics.json      # 18 DSA sections, 93+ LeetCode problems, 6 stages
│
└── frontend/
    ├── .editorconfig               # Code formatting rules
    ├── .gitignore                  # Frontend build & angular cache exclusions
    ├── .npmrc                      # Angular npm peer-dependency rules
    ├── angular.json                # Angular 22 workspace build configuration
    ├── package.json                # Angular 22 dependencies & CLI scripts
    ├── tsconfig.json               # TypeScript base config
    ├── tsconfig.app.json           # Application TypeScript config
    ├── vercel.json                 # Frontend-scoped Vercel config
    ├── public/favicon.ico          # Application favicon
    └── src/
        ├── index.html              # Shell HTML with viewport-fit=cover
        ├── main.ts                 # Angular application bootstrap
        ├── styles.scss             # Design tokens & responsive styles
        ├── environments/           # Environment configs (development & production)
        └── app/
            ├── app.component.*     # Root component
            ├── app.routes.ts       # HTML5 client routes & redirects
            ├── app.config.ts       # Application providers & HTTP interceptor
            ├── components/
            │   ├── dashboard/      # Main interactive checklist & planner
            │   ├── login/          # Email/Password & OAuth sign-in screen
            │   └── register/       # Sign-up screen with OAuth single-sign-on
            ├── guards/auth.guard.ts# Protected route authentication guard
            ├── interceptors/       # JWT bearer token & session interceptor
            ├── models/             # TypeScript data contracts & interfaces
            └── services/           # Data & API communication services
```

---

## 🔒 Environment Secrets & `.env` Management

All sensitive secrets, database records, and user passwords remain **strictly local and private**:

* [`.gitignore`](.gitignore) is pre-configured to exclude all `.env` files and `backend/data/tracker.json`.
* [`backend/.env.example`](backend/.env.example) is committed to GitHub as a safe, clean reference template:

```env
PORT=3000
JWT_SECRET=your-secure-jwt-secret-key-replace-this
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://xxxxxxxxxxxx.vercel.app

# Multi-User JSON Array
ALLOWED_USERS=[{"name":"Your Name","email":"your.email@example.com","password":"your_password"}]

# Google OAuth 2.0 (Optional - https://console.cloud.google.com)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://xxxxxxxxxxxx/api/auth/google/callback

# GitHub OAuth 2.0 (Optional - https://github.com/settings/developers)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://xxxxxxxxxxxxx/api/auth/github/callback
```

### Adding Users to Your Local or Cloud App:
To add users, edit `ALLOWED_USERS` in your `backend/src/.env` (locally) or in your Render environment variables tab (cloud):

```json
ALLOWED_USERS=[
  {"name": "Developer 1", "email": "dev1@example.com", "password": "secure_password_1"},
  {"name": "Developer 2", "email": "dev2@example.com", "password": "secure_password_2"}
]
```

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* **Node.js**: v18+ or v20+ or v22+
* **npm**: v9+ or v10+

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-username/prepmaster-pro.git
cd prepmaster-pro

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Local `.env`
Create `backend/src/.env` (copy from `backend/.env.example`):

```bash
cd ../backend/src
copy ..\.env.example .env
```

### 4. Run Development Servers
Open two terminal windows:

**Terminal 1 — Express Backend**:
```bash
cd backend
npm run dev
# Running on http://localhost:3000
```

**Terminal 2 — Angular Frontend**:
```bash
cd frontend
npm start
# Running on http://localhost:4200
```

Open **`http://localhost:4200`** in your browser.

---

## ☁️ Cloud Deployment Setup (Vercel + Render + UptimeRobot)

### 1. Backend on Render
1. Create a **Web Service** on [Render](https://render.com) connected to your GitHub repository.
2. Root Directory: `backend`
3. Build Command: `npm install`
4. Start Command: `node src/server.js`
5. Add your Environment Variables: `ALLOWED_USERS`, `JWT_SECRET`, `JWT_EXPIRES_IN`.
6. Live Backend URL: `https://<your-backend-app>.onrender.com`

### 2. Frontend on Vercel
1. Import the repository on [Vercel](https://vercel.com).
2. Vercel automatically reads [`vercel.json`](vercel.json), builds the Angular 22 app, and proxies all `/api/*` requests to Render.
3. Live Frontend URL: [https://careermaster.vercel.app](https://careermaster.vercel.app)

### 3. UptimeRobot Keep-Alive
1. Create a free HTTP(s) monitor on [UptimeRobot](https://uptimerobot.com).
2. URL: `https://<your-backend-app>.onrender.com/api/health`
3. Interval: **Every 5 minutes**.
4. Result: Render's free tier stays awake 24/7 with zero cold starts!

---

## 📄 License
This project is licensed under the MIT License.
