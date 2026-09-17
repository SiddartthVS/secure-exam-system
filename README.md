# Secure Question Paper Distribution

A secure web-based examination platform designed to prevent question paper leakage across regional paper-setting bodies, central examination authorities, and exam distribution centres.

---

## 1. Project Description

In large-scale academic examinations, question paper leakage is a critical security vulnerability. Leaks often happen during transmission between regions or through premature access at exam centres before the test date.

This system provides an end-to-end controlled release mechanism with three strictly separated user roles:

1. **Question Paper Setting Regions (Regions 1 to 5)**:
   - Five independent regions author and submit candidate question papers.
   - Each region can upload a PDF in **Draft** state, view its details, replace it, or remove it.
   - Once finalized, clicking **Confirm Submission** permanently locks the paper. No further modifications or uploads are allowed.
   - Regions cannot access each other's dashboards or submissions.

2. **Central Admin / Exam Authority**:
   - Views a real-time status matrix of all 5 regions (Submitted vs. Pending). Regional drafts cannot be modified by the admin.
   - Manually uploads the verified **Master Question Paper** PDF.
   - Releases the master paper using a **Two-Step Double Confirmation** safeguard.

3. **Exam Centres**:
   - Act as test venue endpoints.
   - Prior to publication, the master paper is completely inaccessible and the download button is locked.
   - After the Central Admin publishes the paper, authorized centres can download it via a secure, time-limited **Private Signed URL**.

4. **Audit Trail**:
   - Automatically records all critical actions (logins, uploads, replacements, locks, publications, and downloads) with user identity and timestamp.

---

## 2. Technologies & Tools Used

* **Frontend**: React (v19) + Vite
* **Database & Authentication**: Supabase (PostgreSQL database & Supabase Auth)
* **Storage**: Supabase Storage (Private buckets for question papers and master papers)
* **Security Layer**: PostgreSQL Row Level Security (RLS) policies
* **Styling**: Vanilla CSS (clean, responsive, light theme)
* **Version Control**: Git & GitHub

---

## 3. How to Install and Run the Project

### Prerequisites
* Node.js (v18 or higher)
* npm

### 1. Clone the repository
```bash
git clone https://github.com/your-username/secure-exam-system.git
cd secure-exam-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
Add your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

*(Note: If you run the app without Supabase credentials, it automatically falls back to an offline demo simulation mode so you can test all features immediately.)*

### 4. Setup Supabase Database & Storage
1. Open your Supabase project dashboard and go to the **SQL Editor**.
2. Run the script in [`supabase/schema.sql`](supabase/schema.sql) to create all tables, RLS policies, and private storage buckets.
3. Run the script in [`supabase/seed_users.sql`](supabase/seed_users.sql) to populate the demo login accounts.

### 5. Start the development server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 4. Project Structure & Modules

```
secure-exam-system/
├── src/
│   ├── components/
│   │   ├── ConfirmationModal.jsx      # Reusable confirmation dialogs
│   │   ├── Navbar.jsx                 # Top header with status indicator & profile
│   │   └── StatusBadge.jsx            # Status badges (Draft, Locked, Published)
│   ├── context/
│   │   └── AuthContext.jsx            # Authentication and role authorization
│   ├── data/
│   │   └── predefinedData.js          # Predefined accounts and credentials
│   ├── lib/
│   │   └── supabase.js                # Supabase client configuration
│   ├── services/
│   │   ├── examService.js             # Data operations for submissions and downloads
│   │   └── mockStorage.js             # Local fallback storage for demo mode
│   ├── views/
│   │   ├── LoginView.jsx              # Role selection & credential verification
│   │   ├── RegionDashboard.jsx        # Regional paper submission & locking
│   │   ├── CentralAdminDashboard.jsx  # Regional tracker & master paper release
│   │   └── ExamCentreDashboard.jsx    # Controlled distribution gate & download
│   ├── App.jsx                        # Role-based page routing
│   ├── App.css                        # Application styling
│   └── main.jsx                       # React entry point
├── supabase/
│   ├── schema.sql                     # Database schema, RLS, and storage setup
│   └── seed_users.sql                 # Demo user accounts seed script
├── .env.example                       # Environment variables template
├── package.json
└── README.md
```

### Module Purposes
* **`LoginView.jsx`**: Handles authentication for the three roles with strict Region Code validation.
* **`RegionDashboard.jsx`**: Allows regions to upload a PDF in draft state, replace it, or permanently confirm and lock it.
* **`CentralAdminDashboard.jsx`**: Shows the submission status of all 5 regions, handles master paper upload, double-confirmation publish, and displays audit activity.
* **`ExamCentreDashboard.jsx`**: Controls question paper access for exam centres, unlocking downloads only after central publication.
* **`examService.js`**: Central API service handling database queries, uploads, and signed URL generation.

---

## 5. Sample Input and Output

### Scenario 1: Region Login with Code Verification
* **Input**: Select `Region 1 (North)`, enter wrong code `REG-999`
* **Output**: `Access Denied: Invalid Region Code for Region 1 (North). Access denied.`
* **Input**: Select `Region 1 (North)`, enter valid code `REG-101`
* **Output**: Successfully logged in and redirected to Region 1 Dashboard.

---

### Scenario 2: Regional Question Paper Draft and Lock
* **Input (Upload)**: Select and upload `Computer_Networks_Paper.pdf`
* **Output**: Status changes to `Draft – You can replace your question paper`. Filename and size are displayed.
* **Input (Replace)**: Click **Replace PDF** and select `Computer_Networks_Final.pdf`
* **Output**: File is updated to `Computer_Networks_Final.pdf` while remaining in draft state.
* **Input (Confirm)**: Click **Confirm Submission** and accept warning modal
* **Output**: Status changes to **`Submitted – LOCKED`**. Upload and Replace buttons are permanently disabled, and submission timestamp is saved.

---

### Scenario 3: Central Admin Live Matrix & Master Paper Release
* **Input**: Log in as Central Admin (`admin@exam.gov.in`)
* **Output**: Live table displays all regions:
  ```
  Region 1 (North)     [ Submitted – LOCKED ]    Computer_Networks_Final.pdf    10:14 AM
  Region 2 (South)     [ Pending Submission ]    Awaiting Upload                -
  Region 3 (East)      [ Pending Submission ]    Awaiting Upload                -
  Region 4 (West)      [ Pending Submission ]    Awaiting Upload                -
  Region 5 (Central)   [ Pending Submission ]    Awaiting Upload                -
  ```
* **Input (Upload Master)**: Upload `Master_Exam_Paper_2026.pdf`
* **Output**: Banner: `Master Question Paper uploaded successfully.`
* **Input (Publish)**: Click **Publish Master Question Paper** $\to$ Confirm Step 1 $\to$ Confirm Step 2
* **Output**: Status updates to **`PUBLISHED`** with publication timestamp.

---

### Scenario 4: Exam Centre Controlled Download
* **Input**: Log in as Exam Centre 1 (`CENTRE-901`) before publication
* **Output**: Status shows `Master Question Paper is not yet available`. Download button is locked and disabled.
* **Input**: Log in as Exam Centre 1 after Central Admin publishes
* **Output**: Status shows `Master Question Paper Available`. Download button is active.
* **Input (Download)**: Click **Download Master Question Paper**
* **Output**: Authenticated signed URL is generated, PDF file downloads to browser, and download event is logged in Audit Trail.

---

### Scenario 5: Audit Activity Log
* **Output in Central Admin**:
  ```
  Timestamp     Event Type                  User Identity            Details
  ---------------------------------------------------------------------------------------------
  10:18 AM      master_paper_downloaded     centre1@exam.gov.in      {"centre": "CENTRE-901"}
  10:16 AM      master_paper_published      admin@exam.gov.in        {"status": "published"}
  10:15 AM      master_paper_uploaded       admin@exam.gov.in        {"file": "Master_2026.pdf"}
  10:14 AM      submission_confirmed        region1@exam.gov.in      {"status": "locked"}
  10:12 AM      question_paper_uploaded     region1@exam.gov.in      {"file": "Draft.pdf"}
  10:11 AM      region_login                region1@exam.gov.in      {"code": "REG-101"}
  ```

---

## 6. Predefined Demo Accounts

| Role | Account Name | Code | Email | Password |
|---|---|---|---|---|
| **Region 1** | Region 1 (North) | `REG-101` | `region1@exam.gov.in` | `Region@12345` |
| **Region 2** | Region 2 (South) | `REG-102` | `region2@exam.gov.in` | `Region@12345` |
| **Region 3** | Region 3 (East) | `REG-103` | `region3@exam.gov.in` | `Region@12345` |
| **Region 4** | Region 4 (West) | `REG-104` | `region4@exam.gov.in` | `Region@12345` |
| **Region 5** | Region 5 (Central) | `REG-105` | `region5@exam.gov.in` | `Region@12345` |
| **Central Admin** | Exam Authority | `ADMIN-SECURE-999` | `admin@exam.gov.in` | `Admin@12345` |
| **Exam Centre 1** | Central Exam Centre 01 | `CENTRE-901` | `centre1@exam.gov.in` | `Centre@12345` |
| **Exam Centre 2** | City Campus Exam Centre 02 | `CENTRE-902` | `centre2@exam.gov.in` | `Centre@12345` |

---

## 7. Security Highlights

* **Role Isolation**: Regions, Central Admin, and Exam Centres operate in separate silos.
* **Submission Locking**: Once a region confirms its paper, the database prevents updates and deletions.
* **Private Storage**: All question papers are stored in private Supabase Storage buckets, preventing direct public URL leaks.
* **Signed URLs**: Exam centres receive short-lived signed tokens only after official publication.
* **Audit Logging**: Every sensitive action is logged with user details and timestamps.
