# DMless — Skill-First Hiring Platform

> Stop screening DMs. Start screening skills. DMless lets recruiters create shareable hiring links with MCQ challenges, anti-cheat proctoring, and an AI-powered candidate pipeline — so you hire based on proof, not promises.

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3-blue?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?logo=supabase)

---

## 📖 What is DMless?

DMless is a modern hiring platform that replaces the traditional "send me your resume" workflow with **skill-based assessments**. Recruiters create a hiring link, share it with candidates, and let the platform handle screening — automatically.

### The Problem
Recruiters are flooded with DMs, resumes, and unqualified applicants. There's no scalable way to verify skills before investing time in interviews.

### The Solution
DMless generates **shareable hiring links** containing timed MCQ challenges. Candidates take the test, and the platform automatically scores, ranks, and filters them — complete with anti-cheat monitoring.

---

## ✨ Features

### For Recruiters
- **🔗 Hiring Link Creation** — Create job-specific assessment links with a title, description, and custom MCQ questions.
- **🤖 AI Question Generator** — Auto-generate relevant MCQ questions based on job title and description.
- **🛡️ Anti-Cheat Proctoring** — Configurable tab-switch limits; candidates are knocked out if they exceed the threshold.
- **⏱️ Timed Assessments** — Set time limits (5–120 minutes) per assessment.
- **💀 Knockout Questions** — Mark critical questions where a wrong answer instantly disqualifies the candidate.
- **📊 Passing Score Threshold** — Set a minimum percentage score candidates must achieve to qualify.
- **📋 Candidate Pipeline** — Move candidates through stages: `Qualified → Shortlisted → Interview → Offered → Hired / Rejected`.
- **✅ Bulk Actions** — Select multiple candidates and update their status in one click.
- **📈 Analytics Dashboard** — Visualize hiring funnel, score distributions, completion rates, and submissions over time.
- **🔍 Search & Sort** — Filter candidates by name, email, score, or status.
- **📥 CSV Export** — Download all candidate submission data as a CSV file.
- **🚫 Duplicate Detection** — Prevents the same candidate from taking the same assessment twice.
- **📅 Interview Scheduling** — Schedule interviews with qualified candidates directly from the platform.
- **🤖 AI Recruiter Assistant** — AI-powered assistant to help recruiters with hiring decisions.
- **🏢 Company Branding** — Add company name and logo to hiring links.

### For Candidates
- **📝 Take Assessments** — Answer MCQs within a timed, proctored environment.
- **📄 Resume Upload** — Upload resume as part of the application.
- **🎥 Video Introduction** — Optional video intro upload.
- **📧 Email Notifications** — Receive confirmation emails after submission.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript 5, Vite 5 |
| **Styling** | Tailwind CSS  |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |


---


---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- **npm** or **bun**
- A [Supabase](https://supabase.com) project set up

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/dmless.git

# 2. Navigate to the project directory
cd dmless

# 3. Install dependencies
npm install

# 4. Create your environment file
cp .env.example .env
# Fill in your Supabase credentials (see below)

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:8080**.

### Environment Variables

Create a `.env` file in the root of the project:

```env
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
```

You can find these values in your Supabase project under **Settings → API**.

---

## 🗄️ Database Schema

| Table | Description |
|---|---|
| `profiles` | Recruiter profiles (display name, company, logo, etc.) |
| `hiring_links` | Job assessments with settings (time limit, tab switches, passing score) |
| `questions` | MCQ questions linked to hiring links (options, correct answer, knockout flag) |
| `candidate_submissions` | Candidate responses, scores, proctoring data, and pipeline status |


---

## 🔐 Security

- **Row-Level Security (RLS)** enabled on all Supabase tables
- Recruiters can only access their own hiring links and submissions
- Candidate submissions are public for insert (via assessment link) but restricted for updates
- Duplicate candidate detection enforced at both application and database level
- Anti-cheat tab-switch monitoring with configurable thresholds

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---
