# Secure Question Paper Management & Controlled Exam Distribution System

🔗 **Live Link**:[ https://github.com/SiddartthVS/secure-exam-system](https://secure-exam-system-git-main-siddartth-vs-s-projects.vercel.app/)

---

## 1. Project Description

This project is a secure web application designed to prevent question paper leaks in examinations.

In regular examination setups, papers can leak when sent between regions or when exam halls receive them too early. This system prevents leakages by dividing users into three separate roles:

1. **Question Paper Setting Regions (5 Regions)**:
   - Regions 1 to 5 write and upload question papers in PDF format.
   - Each region can upload a draft, view its file size and name, replace it, or delete it.
   - When finished, clicking "Confirm Submission" permanently locks the paper. Once locked, it cannot be edited, replaced, or deleted.
   - Regions cannot see each other's papers or access other regions' accounts.

2. **Central Admin (Exam Authority)**:
   - Views a live table showing which regions have submitted and which are still pending.
   - Central Admin cannot modify regional question papers.
   - Uploads the final combined Master Question Paper.
   - Releases the master paper using a two-step confirmation popup to avoid accidental publishing.

3. **Exam Centres**:
   - Represents exam halls and test centres.
   - Before publishing: The download button is locked and disabled.
   - After publishing: The download button unlocks, allowing verified exam centres to download the paper using private signed URLs.

4. **Audit Logs**:
   - The system automatically records every action (logins, uploads, replacements, locks, publications, and downloads) with user details and timestamps.

---

## 2. Technologies Used

* Frontend: React (v19) + Vite
* Database & Authentication: Supabase (PostgreSQL Database + Supabase Auth)
* Storage: Supabase Storage (Private storage buckets for PDFs)
* Security: PostgreSQL Row Level Security (RLS)
* Styling: Clean Vanilla CSS
* Version Control: Git & GitHub

---

## 3. How to Install and Run Locally

### Prerequisites
* Install Node.js (version 18 or above)
* npm

### Step 1: Clone the repository
git clone https://github.com/SiddartthVS/secure-exam-system.git
cd secure-exam-system

### Step 2: Install dependencies
npm install

### Step 3: Setup Environment Variables
Create a .env file in the project folder (or copy .env.example):
cp .env.example .env

Open .env and add your Supabase credentials:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key

(Note: If you run the project without Supabase keys, it automatically starts in Demo Mode, so you can test all screens and buttons right away!)

### Step 4: Setup Supabase Database
1. Go to your Supabase project dashboard and click SQL Editor.
2. Open supabase/schema.sql, copy everything, and click Run.
3. Open supabase/seed_users.sql, copy everything, and click Run to create the test accounts.

### Step 5: Start the Development Server
npm run dev

Open http://localhost:5173 in your browser.

---

## 4. Project Structure and Modules
