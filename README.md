# roboman2 — Robotic MAN 2 Kota Bekasi Management System

[![Release Year](https://img.shields.io/badge/Release_Year-2026-blue.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react&logoColor=black)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC.svg?logo=tailwind-css&logoColor=white)](#)
[![Supabase](https://img.shields.io/badge/Supabase-Database_%26_Auth-3ECF8E.svg?logo=supabase&logoColor=white)](#)
[![Privacy Compliance](https://img.shields.io/badge/Data_Privacy-PDP_UU_27%2F2022-success.svg)](#-data-security-privacy--pdp-compliance)
[![Organization](https://img.shields.io/badge/Organization-Robotic_MAN_2_Kota_Bekasi-emerald.svg)](#-credits--development-team)

An enterprise-grade, responsive, and secure club management platform designed specifically for the **Robotics Extracurricular Club at MAN 2 Kota Bekasi** (**roboman2**). The platform unifies student member rosters, laboratory session attendance tracking, treasury cash dues accounting, challenge submissions & grading, academic workshop schedules, and official announcement broadcasts.

---

## 📑 Table of Contents

1. [Executive Overview & Architecture](#-executive-overview--architecture)
2. [Role-Based Access Control (RBAC) & Hierarchy](#-role-based-access-control-rbac--hierarchy)
3. [NISN & Student Identity Verification Workflow](#-nisn--student-identity-verification-workflow)
4. [Environment Variables & Configuration](#-environment-variables--configuration)
5. [Supabase Cloud Database Setup](#-supabase-cloud-database-setup)
6. [Local Development & Installation](#-local-development--installation)
7. [Subdomain & Production Deployment Guide](#-subdomain--production-deployment-guide)
8. [CSV Import Specification & Universal Parser](#-csv-import-specification--universal-parser)
9. [Data Security, Privacy & PDP Compliance](#-data-security-privacy--pdp-compliance)
10. [Core Functional Modules](#-core-functional-modules)
11. [Credits & Development Team](#-credits--development-team)

---

## 🏛️ Executive Overview & Architecture

**roboman2** bridges administration, faculty advisors, executive student committees, and enrolled club members into a unified, high-density digital workspace. It combines modern SaaS ergonomics with zero-trust security and full offline resilience.

```
+-----------------------------------------------------------------------------------+
|                              roboman2 Unified Portal                              |
+-----------------------------------------+-----------------------------------------+
|        Administrative Workspace         |          Student Member Portal          |
|  (Admin, Executive Board, Advisors)     |           (Enrolled Students)           |
+-----------------------------------------+-----------------------------------------+
| - Real-time KPI Analytics Dashboard     | - NISN + Date of Birth Verification     |
| - Student Master Directory (CRUD)       | - Self Attendance Check-In              |
| - Laboratory Attendance Engine          | - Challenges & Assignment Submissions   |
| - Club Treasury & Monthly Dues Matrix   | - Personal Attendance Recaps            |
| - Curriculum, Challenges & Grading      | - Official Announcements Feed           |
| - Academic Calendar & Workshop Agenda   | - Attendance Recaps & Activity Feed     |
| - Role Access Control (RBAC) & SOP      | - Profile & Account Settings            |
+-----------------------------------------+-----------------------------------------+
|                  Persistence & Realtime Synchronization Layer                    |
|      Supabase PostgreSQL + Row Level Security (RLS) + Local Offline Fallback     |
+-----------------------------------------------------------------------------------+
```

### Key Architectural Strengths
- **Dual Interface Modes**: Dedicated *Administrative Workspace* for operators and a streamlined *Student Member Portal* (`StudentAssignmentsView`, `AttendanceTab`, `CalendarTab`) for enrolled students.
- **Strict Role Isolation**: Students cannot access administrative dashboards, financial ledgers, or promotion controls; faculty advisors hold supervisory audit rights; executive board members manage day-to-day club sessions.
- **Offline Resilience**: Local storage caching ensures attendance checks and transaction entries can continue even during intermittent workshop network connectivity.
- **Real-Time Data Streaming**: Supabase Realtime channels push live attendance records and roster updates across connected devices instantly.

---

## 🛡️ Role-Based Access Control (RBAC) & Hierarchy

The application enforces a formal role hierarchy mapped to standard operating procedures (SOP):

```
                        +----------------------------+
                        |      Super Administrator   |
                        |          (`admin`)         |
                        +--------------+-------------+
                                       |
                        +--------------v-------------+
                        |       Executive Board      |
                        |    (`executive_board`)     |
                        +--------------+-------------+
                                       |
                        +--------------v-------------+
                        |       Faculty Advisor      |
                        |        (`advisor`)         |
                        +--------------+-------------+
                                       |
                        +--------------v-------------+
                        |        Club Member         |
                        |        (`member`)          |
                        +----------------------------+
```

### Detailed Role Permission Matrix

| Feature / Action | Super Admin (`admin`) | Executive Board (`executive_board`) | Faculty Advisor (`advisor`) | Club Member (`member`) |
|:---|:---:|:---:|:---:|:---:|
| **Analytics Dashboard** | Full Access | Full Access | Supervisory Overview | Hidden |
| **Member Directory Management** | Full CRUD + Export | Full CRUD + Export | Read-Only Audit | Hidden |
| **Attendance Check-ins** | Full Management | Full Management | Read-Only Audit | Self Check-in Only |
| **Reset Date / Bulk Attendance** | Yes | Yes | No | No |
| **Treasury & Monthly Dues Ledger** | Full CRUD | Full CRUD | Audit View | Hidden |
| **Assignment Creation & Grading** | Full CRUD | Full CRUD | Review & Audit | Submit Solution Only |
| **Broadcast Announcements** | Create & Delete | Create & Delete | Read-Only | Read-Only |
| **Academic Calendar Setup** | Full Control | Full Control | Review | Read-Only |
| **RBAC Role Demotion / Promotion**| Full Control | No | No | No |
| **Pre-Registration CSV Staging** | Full Control | Full Control | No | No |
| **Bypass NISN Verification** | Yes | Yes | Yes | No (Mandatory) |

### Canonical Role Definitions
1. **Super Administrator (`admin`)**: Master system operator. Manages database synchronization, oversees user authentication, audits financial logs, and controls system-level permissions. Authorized to broadcast and delete club announcements.
2. **Executive Board (`executive_board`)**: Student officers (President/Ketua, Vice President/Wakil Ketua, Secretary/Sekretaris, Treasurer/Bendahara, Public Relations/Humas). Manages daily meetings, marks attendance, tracks club dues, creates challenges, and broadcasts official announcements.
3. **Faculty Advisor (`advisor`)**: School mentors and supervising teachers (*Pembina Ekstrakurikuler*). Holds supervisory clearance to inspect attendance records, gradebooks, and financial ledgers. Has read-only clearance on announcements.
4. **Club Member (`member`)**: Enrolled students of MAN 2 Kota Bekasi. Verified via their NISN and date of birth, allowing them to participate in meetings, log attendance, and submit project challenges. Strictly read-only for announcements and treasury.

> 🔒 **Fatal Security Constraint (Announcements & Treasury)**:
> Club members can **never** create, broadcast, or delete announcements, nor view the club treasury cashbook. Only authenticated Administrators and Executive Board officers have clearance to manage these sections.

---

## 🔍 NISN & Student Identity Verification Workflow

To safeguard student privacy and prevent unauthorized account takeovers, the platform implements a zero-trust verification gate:

```
[Student Signs Up / Logs In via NISN & Password or Google OAuth]
                       │
                       ▼
         [Check Membership Status]
          Is user an Admin/Executive?
          ├── YES ──► Bypass verification ──► Enter Administrative Workspace
          └── NO  ──► Check `isVerified` status in Database
                       │
                       ├─► Already Verified ──► Enter Member Portal
                       │
                       ▼
      [StudentVerificationModal Triggered]
                       │
                       ├─► Student enters 10-digit NISN
                       │   (Nomor Induk Siswa Nasional)
                       │
                       ├─► Student enters Date of Birth
                       │   (Format: YYYY-MM-DD or DD/MM/YYYY)
                       │
                       ▼
       [Cross-Validation Against Master Roster]
       Does NISN match student roster AND
       Does Date of Birth match record?
                       │
       ├── NO  ──► Display detailed mismatch error; restrict access
       │
       └── YES ──► 1. Mark account as `isVerified: true`
                   2. Link profile ID to `id_member`
                   3. Unlock access to Student Member Portal
```

### Verification & Account Recovery Security Rules
- **10-Digit NISN Validation**: Validates that the entered identifier consists of exactly 10 numeric digits according to the Indonesian Ministry of Education standard.
- **Dual-Factor Cross Check**: Even if a student's NISN is known to peers, the date of birth prevents fraudulent identity takeover.
- **One-Account Claim Rule**: Each NISN can only be tied to a single verified user session.
- **Self-Service 4-Digit Recovery PIN**: Students configure a personal 4-digit PIN upon initial account activation. If password is forgotten, students recover and reset credentials independently using NISN + PIN without requiring external email/SMTP servers.
- **Admin Emergency Override**: System administrators can manually verify students, correct date-of-birth records, or reset student passwords via the *Member Directory* detail modal if both password and PIN are lost.
- **Demo Sandbox Mode**: Sandbox demo accounts allow instant testing without locking out reviewers, maintaining isolated local mock storage (`robotics_demo_sandbox_*`).

---

## ⚙️ Environment Variables & Configuration

Create a `.env` file in the project root directory. An annotated `.env.example` file is provided:

```bash
cp .env.example .env
```

### Complete Environment Specification

```ini
# ==============================================================================
# SERVER & SELF-HOSTING CONFIGURATION
# ==============================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# ==============================================================================
# PRIMARY ADMINISTRATOR CREDENTIALS & SESSION SECURITY (SERVER-ONLY)
# ==============================================================================
# Master admin email used for initial authentication and verification
ADMIN_EMAIL=roboticman2kotabekasi@gmail.com

# Strong master admin password (minimum 12 characters, server-only)
ADMIN_PASSWORD=your_secure_admin_password_min_12_chars

# Secret for HMAC-SHA256 HttpOnly session cookie signing (minimum 32 random chars)
SESSION_SECRET=replace_with_32_plus_random_characters_for_session_signing

# ==============================================================================
# SUPABASE DATABASE & AUTHENTICATION CONFIGURATION (OPTIONAL / CLOUD)
# ==============================================================================
# Obtain from: Supabase Dashboard -> Project Settings -> API -> Project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Obtain from: Supabase Dashboard -> Project Settings -> API -> anon public key
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================================================
# MYSQL DATABASE CONFIGURATION (CPANEL / DOMAINESIA / SHARED HOSTING)
# ==============================================================================
DB_HOST=localhost
DB_PORT=3306
DB_NAME=robotakman2kotbek
DB_USER=robotakman2kotbek
DB_PASSWORD=robodih
```

### Server vs. Client Variable Propagation

| Variable Name | Scope | Default Value | Purpose |
|:---|:---|:---|:---|
| `NODE_ENV` | Backend (`server.ts`) | `development` | Set to `production` when serving compiled `dist/` bundle |
| `PORT` / `HOST` | Backend (`server.ts`) | `3000` / `0.0.0.0` | HTTP bind host & port |
| `ADMIN_EMAIL` | Backend (`api/_auth.ts`) | `roboticman2kotabekasi@gmail.com` | Master administrative login email for `/api/auth/login` |
| `ADMIN_PASSWORD` | Backend (`api/_auth.ts`) | *First-run claim if unset* | Server-side master password (never prefix with `VITE_`) |
| `SESSION_SECRET` | Backend (`api/_auth.ts`) | *Random per process if unset* | Persistent secret for HMAC-SHA256 `HttpOnly` cookie verification |
| `VITE_SUPABASE_URL` | Frontend (`supabase.ts`) | *Empty* | Supabase cloud endpoint URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`supabase.ts`) | *Empty* | Supabase anonymous API key for queries and auth |
| `DB_HOST` / `DB_PORT` | Backend (`api.php`) | `localhost` / `3306` | MySQL host & port on cPanel hosting |
| `DB_NAME` / `DB_USER` | Backend (`api.php`) | `robotakman2kotbek` | MySQL database name & user credentials |
| `DB_PASSWORD` | Backend (`api.php`) | `robodih` | MySQL database access password |

> ⚠️ **Important Security Note**: Never commit the `.env` file with production secrets to public version control. Keep `.env` listed in `.gitignore`.

---

## 🗄️ Database Architecture & Setup

The platform supports both **MySQL/MariaDB** (standard for XAMPP / local evaluation) and **PostgreSQL / Supabase** (for cloud synchronization and production hosting). Pre-configured SQL files are included in the repository root:

* 🐬 **`database_mysql.sql`**: Full schema and seed data for **MySQL / MariaDB / XAMPP / phpMyAdmin**.
* 🐘 **`database_postgresql.sql`** (or **`schema.sql`**): Full 3rd Normal Form (3NF) relational design with Row Level Security (RLS) for **PostgreSQL / Supabase Cloud**.

### Option A: MySQL / XAMPP / phpMyAdmin Setup
1. Start Apache and MySQL in XAMPP.
2. Open phpMyAdmin (`http://localhost/phpmyadmin`).
3. Click **Import**, select `database_mysql.sql`, and execute.

### Option B: Supabase Cloud Database Setup (PostgreSQL)
1. Log in to [supabase.com](https://supabase.com/) and create a new project.
2. Select your preferred region (e.g., `Singapore - ap-southeast-1` for low latency in Indonesia).
3. Copy the **Project URL** and **anon public API Key** into your `.env` file (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
4. In the Supabase Dashboard, open **SQL Editor**, paste the contents of `schema.sql` (or `database_postgresql.sql`), and click **Run**.

```sql
-- 1. Members Master Table
CREATE TABLE IF NOT EXISTS public.members (
    id_member VARCHAR(20) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    email VARCHAR(100) DEFAULT '',
    full_name VARCHAR(150) NOT NULL,
    grade VARCHAR(10) DEFAULT 'X',
    class_room VARCHAR(10) DEFAULT '',
    gender VARCHAR(20) DEFAULT 'Male',
    nik VARCHAR(30) DEFAULT '',
    nisn VARCHAR(30) DEFAULT '',
    address TEXT DEFAULT '',
    personal_phone VARCHAR(30) DEFAULT '',
    parent_phone VARCHAR(30) DEFAULT '',
    birth_date VARCHAR(20) DEFAULT '',
    status VARCHAR(30) DEFAULT 'Active',
    account_username VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Attendance Ledger
CREATE TABLE IF NOT EXISTS public.attendance (
    id VARCHAR(50) PRIMARY KEY,
    tanggal DATE NOT NULL,
    id_member VARCHAR(20) NOT NULL REFERENCES public.members(id_member) ON UPDATE CASCADE ON DELETE CASCADE,
    nisn VARCHAR(30) DEFAULT '',
    nama_anggota VARCHAR(150) DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Hadir',
    notes TEXT DEFAULT '',
    account_username VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_attendance_date_member UNIQUE (tanggal, id_member),
    CONSTRAINT chk_attendance_status CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpha', 'Present', 'Excused', 'Sick', 'Unexcused'))
);

-- 3. Club Treasury & Cash Ledger
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id VARCHAR(50) PRIMARY KEY,
    tanggal DATE NOT NULL,
    id_member VARCHAR(20) REFERENCES public.members(id_member) ON UPDATE CASCADE ON DELETE SET NULL,
    nisn VARCHAR(30) DEFAULT '',
    nama_anggota VARCHAR(150) DEFAULT '',
    jenis VARCHAR(20) NOT NULL DEFAULT 'Masuk',
    jumlah NUMERIC(12, 2) NOT NULL DEFAULT 0,
    keterangan TEXT DEFAULT '',
    account_username VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_cash_jenis CHECK (jenis IN ('Masuk', 'Keluar', 'Inflow', 'Outflow'))
);

-- 4. Official Announcements Feed
CREATE TABLE IF NOT EXISTS public.announcements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(100) NOT NULL DEFAULT 'Executive Board',
    author_role VARCHAR(50) DEFAULT 'executive_board',
    category VARCHAR(50) DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Curriculum Materials & Challenges Table
CREATE TABLE IF NOT EXISTS public.materials_assignments (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL DEFAULT 'assignment',
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(50) DEFAULT 'Hardware',
    due_date VARCHAR(50) DEFAULT '',
    passing_score NUMERIC(5, 2) DEFAULT 75,
    instructions TEXT DEFAULT '',
    resource_link TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Student Assignment Submissions Table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id VARCHAR(50) PRIMARY KEY,
    assignment_id VARCHAR(50) NOT NULL REFERENCES public.materials_assignments(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL,
    student_email VARCHAR(100) DEFAULT '',
    student_name VARCHAR(150) NOT NULL,
    submission_text TEXT DEFAULT '',
    submission_link TEXT DEFAULT '',
    file_name VARCHAR(255),
    file_data TEXT,
    status VARCHAR(30) DEFAULT 'submitted',
    score_numeric NUMERIC(5, 2),
    feedback TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignment_submissions;
```

---

## 💻 Local Development & Installation

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **Package Manager**: `npm` (v10+), `bun`, or `pnpm`

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/roboticman2kotabekasi.git
cd roboticman2kotabekasi

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start the full-stack development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### Available Scripts

| Command | Action |
|:---|:---|
| `npm run dev` | Runs the development server with TSX & Vite (`server.ts` on port 3000) |
| `npm run build` | Compiles production assets into the `dist/` directory |
| `npm run preview` | Previews the compiled production build locally |
| `npm run lint` | Runs TypeScript typecheck (`tsc --noEmit`) to validate the codebase |

---

## 🌐 Self-Hosting & Production Deployment Guide

Deploy `roboticman2kotabekasi` on your own VPS, dedicated server, home server, or container host under a custom subdomain (e.g., `robotik.man2kotabekasi.sch.id`). `server.ts` serves both the compiled `dist/` frontend and `/api/*` backend in a single Node.js 22+ process.

### Option 1: VPS / Bare-Metal (Node.js 22 + PM2 + Nginx SSL)

#### Step 1: DNS Configuration
Add an `A` record in your DNS provider:
- **Type**: `A`
- **Name / Host**: `robotik` (or full subdomain `robotik.man2kotabekasi.sch.id`)
- **Target / Value**: `<YOUR_SERVER_PUBLIC_IP>`

#### Step 2: Build the Application on the Server
```bash
cd /var/www/roboticman2kotabekasi
cp .env.example .env
# Edit .env and set ADMIN_PASSWORD, SESSION_SECRET, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

npm ci
npm run build
```

#### Step 3: Run with PM2 or Docker
```bash
npm install -g pm2
pm2 start npm --name "roboman2" -- start
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx Reverse Proxy with HTTPS
Create `/etc/nginx/sites-available/robotik.man2kotabekasi.sch.id`:

```nginx
server {
    listen 80;
    server_name robotik.man2kotabekasi.sch.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name robotik.man2kotabekasi.sch.id;

    ssl_certificate /etc/letsencrypt/live/robotik.man2kotabekasi.sch.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/robotik.man2kotabekasi.sch.id/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and issue free SSL via Certbot:
```bash
sudo ln -s /etc/nginx/sites-available/robotik.man2kotabekasi.sch.id /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d robotik.man2kotabekasi.sch.id
```

### Option 2: Docker Self-Hosting (`Dockerfile` included)

```bash
# Build image (pass Supabase public config at build time if Vite bakes env vars)
docker build -t roboticman2 .

# Run container with persistent server secrets
docker run -d \
  --name roboticman2 \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  roboticman2
```

### Option 3: cPanel / Domainesia Shared Hosting (Apache + MySQL via `api.php`)

Deploy `roboman2` on standard cPanel shared hosting (e.g., Domainesia, Niagahoster, Hostinger cPanel):

1. **Database Setup**:
   - Open cPanel ➔ **MySQL Databases**.
   - Create database & user (e.g., `robotakman2kotbek` or `mankota1_robotik`).
   - Open **phpMyAdmin**, select the database, and click **Import** ➔ choose `database_mysql.sql`.
2. **Web Bundle Upload**:
   - Compile production assets locally: `npm run build`.
   - Upload the contents of the `dist/` directory (or extract `roboman2-dist-cpanel.zip`) into your cPanel `public_html` directory via File Manager or FTP.
3. **Automated Dual-Sync Architecture**:
   - The included `public/api.php` automatically connects to MySQL `localhost` with self-healing table verification.
   - The included `.htaccess` automatically routes all React SPA URLs to `index.html` preventing 404 errors on page refresh.
   - Frontend interactions (member registrations, attendance check-ins, cash entries) automatically sync in real-time to both the MySQL database and cloud storage.

---

## 📊 CSV Import Specification & Universal Parser

Full column specifications, formatting rules, and validation guides are documented in [docs/CSV_IMPORT_SCHEMA.md](docs/CSV_IMPORT_SCHEMA.md).

### Built-in Universal Parser Features (`src/utils/universalDataParser.ts`)
1. **Multi-Format Ingestion**: Parses `.csv`, `.tsv`, `.xlsx`, `.xls`, digital `.pdf` tabular documents, and structured `.json` emergency backup files.
2. **Native JSON Backup Restoration**: Direct 1-click import and restoration of emergency system backups (`backup_darurat_*.json`) for members, cash transactions, or attendance records.
3. **Flexible Header Mapping**: Automatically recognizes English and Indonesian header aliases (e.g. `Full Name`, `Nama Lengkap`, `Date of Birth`, `Tanggal Lahir`, `Student Phone`, `No HP Siswa`, `Jumlah`, `Keterangan`).
4. **Formula Injection Sanitization (CWE-1236)**: Strips and neutralizes unsafe leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a safe apostrophe (`'`) while preserving valid numeric signs and telephone prefixes (`+62`).
5. **Interactive Column Mapper**: Operators can manually review, re-map, and adjust header fields before committing rows.
6. **Upsert vs. Replace Modes**: Operators can selectively merge new student rows or perform a full table reset.

### Downloadable CSV Template Examples
- **Member Roster Template**: `template_members_robotics.csv`
  ```csv
  NISN,Full Name,Class,Gender,Date of Birth,Role,Position,Status,Student Phone,Parent Phone,Email,National ID,Address
  0110000001,Ahmad Fauzan Pratama,X-A,Male,2009-05-14,member,member,Active,081234567890,081987654321,student1@man2kotabekasi.sch.id,3275012345670001,Bekasi Selatan
  ```
- **Treasury Cash Template**: `template_treasury_robotics.csv`
  ```csv
  Date,NISN,Member Name,Type,Amount,Description
  2026-09-12,0110000001,Ahmad Fauzan Pratama,Inflow,5000,Club Dues September Week 1
  ```
- **Attendance Template**: `template_attendance_robotics.csv`
  ```csv
  Date,NISN,Member Name,Status
  2026-09-12,0110000001,Ahmad Fauzan Pratama,Present
  ```

---

## 🔒 Data Security, Privacy & PDP Compliance

1. **PDP Law Compliance (UU No. 27/2022)**: Designed in accordance with Indonesia's Personal Data Protection Act. Student telephone numbers, parent contacts, national ID numbers (NIK), and dates of birth are protected against unauthorized public exposure with granular masking toggles.
2. **Server-Side Credential Isolation & Rate Limiting**: Administrative passwords are kept strictly on the backend (`server.ts` via `process.env.ADMIN_PASSWORD`) and never exposed in client bundles. Login routes enforce IP-based rate limiting and temporary lockouts after 5 consecutive failed attempts.
3. **Hardened Row-Level Security (RLS)**: Public `anon` users cannot delete or modify treasury entries, attendance records, or student rosters. Anonymous password dumping from `user_accounts` is blocked.
4. **Emergency Auto-Download Snapshot**: Before executing any destructive reset (cash ledger wipe, roster clear, or attendance history reset), the application automatically generates and triggers a client download of a timestamped JSON backup (`backup_darurat_*.json`) directly to the operator's computer.
5. **PBKDF2 Password Hashing**: Passwords use PBKDF2-SHA256 salted hashing with 100,000 iterations via the WebCrypto API.
6. **Role Escalation Guards**: Client session states are sanitized against tampered local storage values. Regular students cannot elevate their clearance to `admin` or `executive_board`.
7. **Formula Injection Defense (CWE-1236)**: All inputs from CSV, Excel, and spreadsheet uploads are sanitized upon ingestion to eliminate spreadsheet formula execution risks.
8. **WIB Timezone Synchronization**: All date inputs, attendance windows, and ledger stamps synchronize accurately to the `Asia/Jakarta` (WIB, UTC+7) timezone to prevent cross-day rollover discrepancies.
9. **Clean Telemetry Boundary**: Zero third-party trackers, external ad scripts, or telemetry trackers.

---

## 🚀 Core Functional Modules

### 1. Member Directory & Roster Management
- **Universal Import**: Import rosters from CSV or Excel (`.xlsx`) files with auto-detection of column headers.
- **Student Profile & Roster**: Comprehensive student member profiles with department/division mapping, contact details, and status tracking.
- **Export Capabilities**: Export filtered rosters to formatted PDF tables or spreadsheet files.

### 2. Daily Attendance Engine
- **Smart Attendance Window**: Configurable session time windows (e.g. Wednesday 16:00–19:00 WIB) with real-time countdown timer and automated lock upon conclusion.
- **Relational Integrity**: Attendance records are bound to student NISN keys with cascade integrity.
- **Quick Actions**: One-click *Mark All Present*, rapid status filtering, custom notes for excused/sick absences, and schedule bypass toggles for emergency sessions.
- **Auditing & History**: Complete attendance logs with timestamps and operator signatures.

### 3. Treasury & Cash Ledger
- **12-Month Matrix**: Visual grid representing student dues payments across all 12 calendar months.
- **Financial Categorization**: Explicit categorization of operational inflows and outflows (microcontrollers, sensors, 3D printing filaments, competition registrations).
- **Automated Balances**: Real-time balance recalculation with downloadable financial statements.

### 4. Course Tasks, Challenges & Grading
- **Robotics Curriculum**: Practical assignments covering Arduino, ESP32, IoT sensors, line follower algorithms, and CAD mechanics.
- **Student Submission Hub**: Students submit cloud links (Google Drive, GitHub, Tinkercad) and file attachments directly in `StudentAssignmentsView`.
- **Evaluation Matrix**: Executive board and advisors award points and provide qualitative feedback in `AdminTasksGradingView`.

### 5. Intelligent Analytics & Automation Algorithms
- **Attendance Dropout & Irregularity Risk Analysis** (`src/utils/attendanceAnalytics.ts`): Automatically calculates individual attendance rates and consecutive absence streaks to flag students at risk of becoming inactive (< 70% threshold) with guided intervention recommendations.
- **Cash Arrears & Dues Recovery Analysis** (`src/utils/cashAnalytics.ts`): Analyzes payment lags against expected dues, identifying top debtor balances and generating instant WhatsApp reminder templates for treasury managers.
- **Fuzzy Search Engine** (`src/utils/smartSearch.ts`): Tolerates character typos, phonetic variations, and swapped letters using Levenshtein distance across member names, classes, divisions, and NISN queries.
- **Automated Academic Rollover Engine** (`src/utils/academicRollover.ts`): Seamlessly executes batch promotion for students advancing to the next academic level (Grade X $\rightarrow$ XI $\rightarrow$ XII) and automatically graduates senior Grade XII students to verified Alumni status.

---

## 👥 Credits & Development Team

Developed for the **2026 Term** of **Robotic MAN 2 Kota Bekasi**:

* **Public Relations 1 (2026)**: Inashaura Azkazola Ridalistiyanti
* **Public Relations 2 (2026)**: Daeniesh Raeisya Achmad
* **Supervising Mentors & Advisors**: Abdul Khoir, S.Kom.
* **Organization**: Robotic Club MAN 2 Kota Bekasi, West Java, Indonesia

---

*© 2026 Robotic MAN 2 Kota Bekasi. All rights reserved.*
