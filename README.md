# 🎯 Interview & DSA Preparation Hub — Interactive Topic Checklist & Progress Tracker

A full-stack web application built with **Angular 22** and **Express.js** to track your learning and interview preparation progress across two comprehensive tracks:
1. **🎯 Full-Stack Interview Preparation (Linked Edition)**: 15 Domains · 312+ Topics with official documentation & tutorial resource links.
2. **🧠 Master DSA Practice Workbook**: 18 DSA foundation sections · 280+ beginner prompts with platform links · 93+ LeetCode problems categorized with difficulty ratings · 6-Stage Study Plan.

Includes full multi-user authentication (Sign In / Sign Up) so multiple candidates or team members can track their individual progress independently in the cloud.

---

## 🌟 Key Features

1. **🔐 Multi-User Authentication**:
   - Secure registration and login with hashed passwords (`bcryptjs`) and JWT sessions (`jsonwebtoken`).
   - Each user has completely isolated progress, checklist statuses, career targets, and personal notes.

2. **🔀 Dual-Track Learning Hub**:
   - Seamlessly switch between the **Full-Stack Interview Prep** and **Master DSA Practice Workbook** tabs.
   - Independent progress bars, mastery counters, and filters for each track.

3. **🎯 Track 1: Full-Stack Interview Prep (15 Domains · 312+ Topics)**:
   - Complete coverage: Java Fundamentals, Core & Advanced Java, DSA, SQL & Databases, Spring & Spring Boot, Microservices, Angular, Python & AI/RAG, System Design, Behavioral, DevOps & Cloud, Security, Testing, Soft Skills, Mock Interviews.
   - **Direct Resource Links**: Every topic includes a direct link to official docs, tutorials, or hands-on practice.
   - **My Target & Notes Planner**: Interactive career target (Role, Salary LPA, Interview Date, Current Focus) plus a dedicated **Personal Study Notes** scratchpad that auto-saves.

4. **🧠 Track 2: Master DSA Practice Workbook (18 Foundation Sections + LeetCode Roadmap)**:
   - **Part 1 — 18 Foundation Topics**: 280+ practice prompts with direct links to HackerRank, CodingBat, and LeetCode.
   - **Part 2 — LeetCode Interview Roadmap**: 93+ curated interview problems categorized by pattern with Easy/Medium/Hard tags and direct problem links.
   - **6-Stage Study Plan**: Visual overview from Java Basics to Blind 75 and Mock Interviews.

5. **⚡ Real-time Auto-Save**:
   - Ticking any checkbox immediately persists to the database.
   - Click any topic title for 1-click quick toggling.

6. **🎨 Clean Component Architecture**:
   - Strict separation of concerns with dedicated `.html`, `.scss`, and `.ts` files across all Angular components.
   - Responsive design with smooth animations, custom progress rings, and quick navigation.

---

## 🚀 How to Run the Application

### Option A: Run the unified full-stack server (Recommended)
The Express backend is pre-configured to serve the compiled Angular frontend directly on port **3000**:

```bash
cd s:\Job-check\backend
npm start
```
Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Option B: Run in Development Mode (Live Reloading)

If you are developing frontend and backend simultaneously:

**Terminal 1 — Express Backend**:
```bash
cd s:\Job-check\backend
npm run dev
# Starts on http://localhost:3000 with nodemon
```

**Terminal 2 — Angular Frontend**:
```bash
cd s:\Job-check\frontend
npm start
# Starts Angular CLI dev server on http://localhost:4200
```
Open **[http://localhost:4200](http://localhost:4200)** in your browser.

---

## 🧪 Run Tests

To verify all backend endpoints, authentication, user progress isolation, dual track sections, and static file serving:

```bash
cd s:\Job-check\backend
node test-all.js
```

---

## 📁 Architecture Overview

```
Job-check/
├── backend/
│   ├── data/
│   │   └── tracker.json            # Persistent JSON database (users & progress)
│   ├── data-source/
│   │   ├── interview-prep-linked.html # Original HTML source (Full-Stack Linked)
│   │   └── dsa-workbook.html          # Original HTML source (Master DSA)
│   ├── src/
│   │   ├── data/
│   │   │   ├── interviewTopics.json   # 15 sections, 312+ topics with resource links
│   │   │   └── dsaTopics.json         # 18 DSA sections, 93+ LeetCode problems, 6 stages
│   │   ├── db/
│   │   │   └── database.js         # Pure JS atomic database (users, progress, targets)
│   │   ├── middleware/
│   │   │   └── auth.js             # JWT verification middleware
│   │   ├── routes/
│   │   │   ├── auth.js             # /api/auth/register, /api/auth/login, /api/auth/me
│   │   │   ├── progress.js         # /api/progress, /api/progress/summary
│   │   │   ├── target.js           # /api/target (includes personalNotes)
│   │   │   ├── sections.js         # /api/sections (Full-stack topics)
│   │   │   └── dsa.js              # /api/dsa (DSA sections & LeetCode roadmap)
│   │   ├── server.js               # Express application entry point & static SPA host
│   │   └── .env                    # Port & JWT Secret configuration
│   ├── package.json
│   └── test-all.js                 # Automated end-to-end integration test suite
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── dashboard/      # dashboard.component.html / .scss / .ts
│   │   │   │   ├── login/          # login.component.html / .scss / .ts
│   │   │   │   └── register/       # register.component.html / .scss / .ts
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts   # Route guard protecting dashboard
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts # Attaches JWT to HTTP requests
│   │   │   ├── models/
│   │   │   │   ├── section.model.ts    # Full-Stack, DSA & LeetCode models
│   │   │   │   └── user.model.ts       # User & Target models
│   │   │   └── services/
│   │   │       ├── auth.service.ts
│   │   │       ├── progress.service.ts
│   │   │       ├── section.service.ts
│   │   │       └── target.service.ts
│   │   ├── environments/           # API endpoints configuration
│   │   └── styles.scss             # Design system styling matching the original checklist
│   ├── dist/frontend/browser/      # Compiled production distribution
│   └── package.json
│
└── package.json                    # Workspace root scripts
```
