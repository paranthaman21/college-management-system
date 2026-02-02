# College Management System - Complete Documentation

**Version:** 1.0  
**Author:** Barath (Paranthaman V)  
**Last Updated:** February 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Security Details](#4-security-details)
5. [UI/UX Explanation](#5-uiux-explanation)
6. [Reminder & Notification System](#6-reminder--notification-system)
7. [Subject & Content Management](#7-subject--content-management)
8. [Email & Credential Flow](#8-email--credential-flow)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Limitations & Future Enhancements](#10-limitations--future-enhancements)
11. [Setup & Run Instructions](#11-setup--run-instructions)

---

## 1. Project Overview

### Purpose of the System

The **College Management System** is a web-based platform designed to streamline academic operations in a college environment. It consists of two separate but connected portals that work together to manage student and faculty data, facilitate learning content distribution, and enable communication between faculty and students.

### Who Are the Users?

The system serves three distinct user roles:

1. **Administrator (Admin)**
   - Manages student and faculty accounts
   - Creates login credentials for all users
   - Monitors system activity through audit logs
   - Has access to the Admin Portal only

2. **Faculty Members**
   - Upload lecture notes, PDFs, and YouTube links
   - Send year-specific reminders to students
   - Manage their department's learning content
   - Access the Student-Faculty Portal

3. **Students**
   - View and download lecture notes
   - Access subject-specific content
   - Receive reminders from faculty
   - Access the Student-Faculty Portal

### High-Level Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN CREATES ACCOUNTS                   │
│  (Admin Portal → Creates Students/Faculty → Saves to DB)    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               USERS RECEIVE CREDENTIALS VIA EMAIL            │
│          (Currently to admin email for testing)              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│           USERS LOGIN TO STUDENT-FACULTY PORTAL              │
│  (Portal reads user data from same database Admin wrote to) │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌───────────────────┐     ┌─────────────────────┐
    │  FACULTY ACTIONS  │     │  STUDENT ACTIONS    │
    ├───────────────────┤     ├─────────────────────┤
    │ • Upload notes    │     │ • View notes        │
    │ • Send reminders  │     │ • Download PDFs     │
    │ • Manage content  │     │ • Read reminders    │
    └───────────────────┘     └─────────────────────┘
```

**Key Points:**
- Admin creates accounts → Database stores the data
- Users log in → System reads from the same database
- Faculty creates content → Students consume content
- All data is stored in a single shared database (Supabase)

---

## 2. System Architecture

### Overview: Two Portals, One Database

This system uses a **microservices architecture** with two independent applications sharing a common database.

```
┌──────────────────────┐         ┌────────────────────────┐
│   ADMIN PORTAL       │         │ STUDENT-FACULTY PORTAL │
│  (Flask App #1)      │         │    (Flask App #2)      │
│  Port: 5000          │         │    Port: 5001          │
│  URL: admin-*.app    │         │    URL: portal-*.app   │
└──────────┬───────────┘         └───────────┬────────────┘
           │                                 │
           │    Both Connect To              │
           │    Same Database                │
           │                                 │
           └─────────────┬───────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   SUPABASE DATABASE  │
              │  (PostgreSQL Cloud)  │
              ├──────────────────────┤
              │ • students table     │
              │ • faculty table      │
              │ • notes table        │
              │ • reminders table    │
              └──────────────────────┘
```

### Why Two Separate Applications?

**Security Reasons:**
- Admin operations (creating users, managing accounts) are completely isolated from student/faculty access
- If the Student-Faculty Portal is compromised, the Admin Portal remains secure
- Admin credentials are never exposed through the public-facing student portal

**Simplicity:**
- Each portal has its own codebase (`app.py` file)
- Easier to maintain and update independently
- Cleaner separation of concerns

**Scalability:**
- You can update the Student Portal without affecting Admin operations
- Can deploy updates to one portal without touching the other
- Easier to scale resources independently if needed

### How Data Flows Between Portals

**Scenario 1: Admin Creates a Student**
1. Admin logs into Admin Portal
2. Admin fills student creation form
3. Admin Portal → Writes to `students` table in Supabase
4. Email sent to admin (for testing) with credentials
5. Student can now log in to Student-Faculty Portal (data exists in database)

**Scenario 2: Student Logs In**
1. Student visits Student-Faculty Portal
2. Student enters email and password
3. Portal → Reads from `students` table in Supabase
4. Password is verified (bcrypt hash comparison)
5. Session is created → Student sees their dashboard

**Scenario 3: Faculty Uploads Notes**
1. Faculty logs into Student-Faculty Portal
2. Faculty uploads PDF or YouTube link
3. Portal → Writes to `notes` table in Supabase
4. All students in that department/year can now see the note

**Key Insight:** The database is the "glue" that connects both portals. They don't talk to each other directly—they both talk to Supabase.

### Backend Structure

#### Admin Portal (`college-admin-portal/app.py`)
**Responsibilities:**
- User authentication (admin login only)
- CRUD operations for students and faculty
- Password generation and email sending
- Audit logging (sends emails to IT department on edits/deletes)

**Key Routes:**
- `/login` - Admin login page
- `/` - Dashboard (shows stats)
- `/students.html` - Manage students
- `/faculty.html` - Manage faculty
- `/api/students` - Create/Read/Update/Delete students
- `/api/faculty` - Create/Read/Update/Delete faculty

#### Student-Faculty Portal (`college-learning-platform/app.py`)
**Responsibilities:**
- Student and faculty authentication (separate login flows)
- Content management (notes, PDFs, YouTube links)
- Reminder system (faculty → students)
- AI-powered note summaries (using Google Gemini)

**Key Routes:**
- `/login` - Login page for students and faculty
- `/student-<dept>-<year>/` - Student dashboard (e.g., `/student-CSE-1/`)
- `/faculty-<dept>/` - Faculty dashboard (e.g., `/faculty-CSE/`)
- `/api/notes` - Create/Read notes
- `/api/reminders` - Create/Read/Delete reminders
- `/api/subjects/<dept>/<year>` - Get subjects for a department/year

---

## 3. Tech Stack

### Frontend Technologies

| Technology | Purpose | Where Used |
|------------|---------|------------|
| **HTML5** | Structure and markup | All templates (`.html` files) |
| **CSS3** | Styling and layout | `style.css`, inline styles |
| **JavaScript (Vanilla)** | Interactive functionality | `main.js` (Student-Faculty Portal) |
| **Bootstrap Icons** | Icon library | UI elements (bell icon, hamburger menu) |

**Key Frontend Features:**
- Custom modals (no browser alerts)
- Toast notifications for success/error messages
- Hamburger navigation menu
- Responsive design (works on desktop and mobile)
- AJAX calls for dynamic content loading

### Backend Framework

| Component | Technology | Version |
|-----------|------------|---------|
| **Web Framework** | Flask | Latest |
| **Language** | Python | 3.x |
| **CORS Handling** | flask-cors | Latest |
| **Environment Variables** | python-dotenv | Latest |

**Why Flask?**
- Lightweight and easy to deploy on Vercel
- Fast development and prototyping
- Excellent for serverless functions (Vercel Python runtime)
- Simple routing and session management

### Database

**Supabase (PostgreSQL)**

Supabase is a cloud-hosted PostgreSQL database with built-in authentication and storage features.

**Database Schema:**

```sql
-- Students Table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(10),  -- CSE, ECE, MECH, CIVIL
  year INTEGER,             -- 1, 2, 3, 4
  email VARCHAR(100) UNIQUE,
  contact VARCHAR(15),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Faculty Table
CREATE TABLE faculty (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  department VARCHAR(10),
  email VARCHAR(100) UNIQUE,
  contact VARCHAR(15),
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notes Table
CREATE TABLE notes (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER,
  faculty_name VARCHAR(100),
  department VARCHAR(10),
  year INTEGER,
  subject VARCHAR(100),
  title VARCHAR(200),
  description TEXT,
  file_url VARCHAR(500),        -- Supabase Storage URL or external URL
  youtube_link VARCHAR(500),
  ai_summary TEXT,              -- Auto-generated by Gemini AI
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reminders Table
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  faculty_id INTEGER,
  faculty_name VARCHAR(100),
  department VARCHAR(50),
  target_year INTEGER,          -- Which year receives this reminder
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Why Supabase?**
- Free tier with generous limits
- PostgreSQL (industry-standard relational database)
- Built-in API for CRUD operations
- Row-level security (RLS) capabilities
- Real-time subscriptions (future enhancement possibility)

### Authentication & Session Handling

| Component | Technology | Details |
|-----------|------------|---------|
| **Password Hashing** | bcrypt | Passwords are salted and hashed before storage |
| **Session Management** | Flask sessions | Cookie-based sessions with `SECRET_KEY` |
| **Session Storage** | Server-side | Flask stores session data signed with secret key |
| **Session Duration** | 1 hour | Configurable via `PERMANENT_SESSION_LIFETIME` |

**How Authentication Works:**
1. User enters email and password
2. System queries database for user email
3. bcrypt compares entered password with stored hash
4. If match → Session created with user details
5. Session cookie sent to browser
6. Future requests include session cookie → user is authenticated

**Security Note:** Passwords are NEVER stored in plain text. Only bcrypt hashes are stored.

### Email Handling

**Current Setup: Gmail SMTP**

| Component | Technology | Details |
|-----------|------------|---------|
| **Protocol** | SMTP + TLS | Port 587 with STARTTLS encryption |
| **Library** | Python `smtplib` | Built-in Python library |
| **Email Format** | MIME (Multipart) | Plain text emails |

**Configuration:**
```
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=gmail_app_password  # Not your Gmail password!
```

**Future-Ready Approach:** See section [8. Email & Credential Flow](#8-email--credential-flow)

### AI Integration

**Google Gemini AI (gemini-flash-latest)**

| Feature | Technology | Purpose |
|---------|------------|---------|
| **Auto-Summary** | Google Generative AI | Generates 3-bullet summaries of uploaded PDFs |
| **PDF Processing** | PyPDF2 | Extracts text from PDF files |
| **API Transport** | REST | HTTP-based API calls (not gRPC) |

**How It Works:**
1. Faculty uploads a PDF
2. Backend downloads the PDF
3. PyPDF2 extracts text from first 5 pages
4. Text sent to Gemini with prompt: "Summarize in 3 bullet points"
5. AI response stored in `notes` table (`ai_summary` column)
6. Students see the summary when viewing notes

**Note:** This feature requires a valid `GEMINI_API_KEY` and is optional (notes work without it).

### Deployment Platform

**Vercel (Serverless Platform)**

| Feature | Details |
|---------|---------|
| **Runtime** | Python (Flask) via `@vercel/python` |
| **Deployment Model** | Serverless Functions |
| **Configuration** | `vercel.json` |
| **Environment Variables** | Managed via Vercel Dashboard |
| **Auto-Deployments** | GitHub integration (auto-deploy on push) |

**Why Vercel?**
- Free tier supports multiple projects
- Excellent for Flask serverless apps
- Easy GitHub integration
- Automatic HTTPS
- Global CDN for fast access

---

## 4. Security Details

### Role-Based Access Control (RBAC)

The system implements RBAC through three mechanisms:

#### 1. Physical Separation (Admin vs Student-Faculty)

**Admin Portal:**
- Completely separate Vercel deployment
- Different URL domain (e.g., `admin-college.vercel.app`)
- Only accessible to administrators
- No link from Student-Faculty Portal

**Student-Faculty Portal:**
- Public-facing portal
- Accessible to students and faculty
- No admin functions exposed

**Security Benefit:** Even if a student discovers the Admin Portal URL, they can't log in because admin credentials are separate.

#### 2. Route-Based Authorization (Student vs Faculty)

**In `college-learning-platform/app.py`:**

```python
@app.route('/student-<dept>-<year>/')
def student_dashboard(dept, year):
    # Security Check: Must be logged in as student
    if not is_logged_in() or session.get('role') != 'student':
        return redirect(url_for('login'))
    
    # Security Check: Student can only access their OWN department/year
    if session.get('dept') != dept or session.get('year') != year:
        return redirect(to_their_actual_page)
    
    return render_template('student_portal.html')
```

**What This Does:**
- Students can't access faculty routes (role check)
- Students can't access other departments/years (dept/year check)
- Faculty can't access student routes (role check)

#### 3. API-Level Authorization

**Example: Only Faculty Can Upload Notes**

```python
@app.route('/api/notes', methods=['POST'])
def handle_notes():
    if session['role'] != 'faculty':
        return jsonify({"error": "Only faculty can upload"}), 403
```

**Example: Faculty Can Only Delete Their Department's Notes**

```python
@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    # Fetch note to check department
    note = learning_client.table('notes').select('*').eq('id', note_id).execute()
    
    # Security: Only allow deleting notes from OWN department
    if note['department'] != session.get('dept'):
        return jsonify({"error": "Unauthorized"}), 403
```

### Session Management

**How Sessions Work:**

1. **Session Creation (on successful login):**
   ```python
   session['user_id'] = user_record['id']
   session['email'] = email
   session['role'] = 'student'  # or 'faculty'
   session['name'] = user_record['name']
   session['dept'] = user_record['department']
   if role == 'student':
       session['year'] = user_record['year']
   ```

2. **Session Storage:**
   - Flask creates a signed cookie containing session data
   - Cookie is signed with `SECRET_KEY` (prevents tampering)
   - Cookie expires after 1 hour (`PERMANENT_SESSION_LIFETIME = 3600`)

3. **Session Validation (on every request):**
   ```python
   def is_logged_in():
       return 'user_id' in session
   ```

**Security Features:**
- Sessions are signed (can't be modified by users)
- Sessions expire automatically
- Different `SECRET_KEY` for Admin vs Student-Faculty portals
- Session cookies are HTTP-only (not accessible via JavaScript)

### Environment Variables Usage

**Why Environment Variables?**

Environment variables store sensitive configuration (API keys, passwords, database URLs) **outside** of the codebase.

**Benefits:**
- Secrets are not committed to GitHub (`.gitignore` protects `.env` files)
- Different values for development vs production
- Easy to update without code changes

**How They Work:**

**Locally:**
```
college-admin-portal/
  ├── .env              ← Contains secrets (ignored by Git)
  ├── app.py            ← Reads from .env via python-dotenv
```

**.env file example:**
```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SECRET_KEY=random-string-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password_here
```

**In Production (Vercel):**
- No `.env` file
- Values set via Vercel Dashboard → Project Settings → Environment Variables
- Vercel injects them at runtime

### Database Access Separation

**Two-Level Access Control:**

#### Admin Portal (Full Access)
```env
SUPABASE_KEY=service_role_key_here
```
- Uses `service_role` key (bypasses Row Level Security)
- Can create, read, update, delete any data
- Trusted backend application

#### Student-Faculty Portal (Limited Access)
```env
ADMIN_SUPABASE_KEY=service_role_key_here  # For reading students/faculty
LEARNING_SUPABASE_SERVICE_ROLE_KEY=service_role_key_here  # For notes/reminders
```

**Current Setup:**
- Student-Faculty Portal also uses `service_role` key
- Authorization is enforced in Python code (session checks)
- **Future Enhancement:** Implement Row Level Security (RLS) in Supabase to restrict access at the database level

### Best Practices Followed

✅ **Passwords Hashed:** bcrypt with salts  
✅ **Sessions Signed:** Flask secret key prevents tampering  
✅ **CORS Configured:** Only allows specific origins  
✅ **No Secrets in Code:** All sensitive data in `.env`  
✅ **Input Validation:** Email uniqueness, password strength  
✅ **Audit Logging:** All edits/deletes logged to IT department  
✅ **HTTPS:** Vercel provides automatic SSL certificates  

### Known Limitations

⚠️ **No Multi-Factor Authentication (MFA)**  
⚠️ **Session hijacking possible if cookie is stolen** (no IP validation)  
⚠️ **No rate limiting on login attempts** (brute force possible)  
⚠️ **Service role keys used everywhere** (should use RLS + anon keys)  
⚠️ **Plain passwords sent via email** (unavoidable for credential delivery)  

**Mitigations:**
- Use strong `SECRET_KEY`
- Force password change on first login (future enhancement)
- Monitor audit logs for suspicious activity
- Educate users about password security

---

## 5. UI/UX Explanation

### Design Philosophy

**Goals:**
- **Simple:** Easy for students and faculty to navigate
- **Clean:** Minimal clutter, focus on content
- **Responsive:** Works on desktop and mobile
- **Modern:** Dark theme, smooth animations

### Key Screens and Modals

#### 1. Login Screen (`login.html`)
**Features:**
- Role selector (Student vs Faculty)
- Email and password fields
- Error messages for invalid credentials
- Redirect to appropriate dashboard after login

**User Experience:**
- Student selects "Student" → logs in → redirected to `/student-CSE-2/` (their dept/year)
- Faculty selects "Faculty" → logs in → redirected to `/faculty-CSE/` (their dept)

#### 2. Student Dashboard (`student_portal.html`)
**Layout:**
- **Header:** College name, student name, logout button
- **Hamburger Menu (☰):** Subjects list
- **Bell Icon (🔔):** Reminders notification
- **Main Area:** Subject content grid (notes displayed as cards)

**Navigation Flow:**
```
Student clicks hamburger → Sidebar opens → Shows all subjects
Student clicks "Programming" → Main area shows notes for Programming
Student clicks bell icon → Reminders modal opens
```

#### 3. Faculty Dashboard (`faculty_portal.html`)
**Layout:**
- **Header:** College name, faculty name, logout button
- **Hamburger Menu:** Subject selector + reminder form
- **Main Area:** Notes management (upload new, view existing, delete)

**Upload Flow:**
```
Faculty clicks hamburger → Selects subject → Upload form appears
Faculty fills title, description, uploads PDF or YouTube link
Faculty clicks "Upload" → Note saved → Students can see it
```

#### 4. Custom Modals (No Browser Alerts!)

**Delete Confirmation Modal:**
```
┌─────────────────────────────────────┐
│         Confirm Delete              │
├─────────────────────────────────────┤
│ Are you sure you want to delete     │
│ this note?                          │
│                                      │
│   [Cancel]         [Delete]         │
└─────────────────────────────────────┘
```

**During Delete:**
```
┌─────────────────────────────────────┐
│         Confirm Delete              │
├─────────────────────────────────────┤
│   Deleting...                       │
│                                      │
│   [Deleting...]    [Deleting...]    │
└─────────────────────────────────────┘
```

**Success Toast:**
```
┌─────────────────────────────────────┐
│ ✓ Note deleted successfully         │
└─────────────────────────────────────┘
```

**Why Custom Modals?**
- Browser alerts (`alert()`, `confirm()`) are ugly and not customizable
- Custom modals match the app's design
- Better user experience (smooth animations, loading states)
- More control over behavior

### Navigation Flow

#### Hamburger Menu
**Purpose:** Select subjects or access features

**Student View:**
- List of all subjects for their department/year
- Click subject → filters notes to show only that subject

**Faculty View:**
- Subject selector (for uploading notes)
- "Send Reminder" button
- Logout option

#### Bell Icon (Reminders)
**Purpose:** View and manage reminders

**Student View:**
- Shows unread reminder count (red badge)
- Click → opens reminders modal
- Displays all reminders for their year

**Faculty View:**
- Shows all reminders they've sent
- Delete button for each reminder

### Reminder System UX

**Faculty Sends Reminder:**
1. Click hamburger menu → "Send Reminder"
2. Select target year (1, 2, 3, or 4)
3. Type message
4. Click "Send"
5. Toast appears: "✓ Reminder sent successfully"

**Student Receives Reminder:**
1. Bell icon shows red badge with count
2. Student clicks bell → modal opens
3. Sees reminder from faculty with timestamp
4. Can dismiss modal but reminder stays in database

**Faculty Deletes Reminder:**
1. Click bell icon → sees all sent reminders
2. Click "Delete" on a reminder
3. Confirmation modal appears
4. Click "Delete" again → reminder removed from database
5. Students no longer see it

### Design Decisions for Usability

✅ **Dark Theme:** Reduces eye strain, modern look  
✅ **Card-Based Layout:** Easy to scan notes  
✅ **Icon-Based Actions:** Download, view summary buttons are intuitive  
✅ **Loading States:** Users know when actions are processing  
✅ **Toast Notifications:** Non-intrusive feedback  
✅ **Responsive Grid:** Auto-adjusts on mobile devices  

---

## 6. Reminder & Notification System

### How Reminders Are Created

**Who Can Create:** Only faculty members  
**Where:** Faculty dashboard (hamburger menu → Send Reminder)

**Creation Flow:**

1. **Faculty Opens Form:**
   - Hamburger menu → "Send Reminder" button
   - Modal appears with form

2. **Faculty Fills Form:**
   ```
   Target Year: [Dropdown: 1, 2, 3, 4]
   Message: [Text area]
   ```

3. **Faculty Clicks "Send":**
   - JavaScript sends POST request to `/api/reminders`
   - Backend validates:
     - Is user logged in? ✓
     - Is user faculty? ✓
     - Is message not empty? ✓
   - Creates reminder in database:
     ```python
     reminder_data = {
         "faculty_id": session['user_id'],
         "faculty_name": session['name'],
         "department": session['dept'],  # Faculty's department
         "target_year": 2,               # Selected year
         "message": "Assignment due Friday"
     }
     ```

4. **Confirmation:**
   - Toast appears: "✓ Reminder sent successfully"
   - Modal closes

**Database Record Created:**
```sql
INSERT INTO reminders (faculty_id, faculty_name, department, target_year, message)
VALUES (5, 'Dr. Smith', 'CSE', 2, 'Assignment due Friday');
```

**Who Sees This Reminder?**
- All students in **CSE Department, Year 2**
- Students filter by: `department = 'CSE' AND target_year = 2`

### How Reminders Are Displayed to Students

**Student Login:**
1. Student logs in → Dashboard loads
2. JavaScript fetches reminders: `GET /api/reminders?dept=CSE&year=2`
3. Backend returns all reminders matching student's dept/year

**Bell Icon Badge:**
- Shows count of unread reminders
- Example: If 3 reminders exist → Bell shows "3"

**Student Clicks Bell:**
1. Reminders modal opens
2. Displays list of reminders:
   ```
   ┌─────────────────────────────────────────┐
   │          Reminders (3)                  │
   ├─────────────────────────────────────────┤
   │ Dr. Smith (CSE Faculty)                 │
   │ Assignment due Friday                   │
   │ 2 hours ago                             │
   ├─────────────────────────────────────────┤
   │ Prof. Kumar (CSE Faculty)               │
   │ Mid-term exam on Monday                 │
   │ 1 day ago                               │
   └─────────────────────────────────────────┘
   ```

3. Student reads reminders
4. Clicks "Close" → modal closes

**Persistence:**
- Reminders stay in database until faculty deletes them
- Students see the same reminders every time they log in (no "mark as read" yet)

### Faculty Delete Flow

**Why Delete?**
- Reminder is no longer relevant (assignment deadline passed)
- Typo or mistake in message
- Reduce clutter for students

**Delete Flow:**

1. **Faculty Clicks Bell Icon:**
   - Opens reminders modal
   - Shows all reminders faculty has sent

2. **Faculty Clicks "Delete" Button:**
   - Custom modal appears: "Are you sure you want to delete this reminder?"

3. **Faculty Confirms:**
   - Button text changes to "Deleting..."
   - JavaScript sends: `DELETE /api/reminders/<id>`
   - Backend checks:
     - Is user faculty? ✓
     - Does reminder belong to their department? ✓
   - Deletes from database

4. **Success:**
   - Toast appears: "✓ Reminder deleted successfully"
   - Reminder disappears from list
   - Students no longer see it

**Security Note:** Faculty can only delete reminders from their own department (enforced in backend).

### Custom UI Modals/Toasts

**Why No Browser Alerts?**

❌ **Browser `alert()`:**
```javascript
alert("Reminder sent!");  // Ugly, blocks page, not customizable
```

✅ **Custom Toast:**
```javascript
showToast("Reminder sent successfully!", "success");
```
- Appears in corner of screen
- Auto-dismisses after 3 seconds
- Matches app design
- Doesn't block user interaction

❌ **Browser `confirm()`:**
```javascript
if (confirm("Delete this reminder?")) {
    // Delete
}
```

✅ **Custom Modal:**
- Styled to match app
- Shows loading state ("Deleting...")
- Can add icons, colors, animations

**Implementation:**
All custom modals and toasts are defined in `main.js` with CSS animations.

---

## 7. Subject & Content Management

### How Subjects Are Assigned

**Hard-Coded Subjects Map:**

Subjects are defined in `college-learning-platform/app.py`:

```python
SUBJECTS_MAP = {
    "CSE": {
        1: ["Programming", "Data Structures", "Math-I"],
        2: ["Algorithms", "DBMS", "OS", "Networking"],
        3: ["Web Tech", "AI", "ML", "Cloud Computing"],
        4: ["Projects", "Internship", "Electives"]
    },
    "ECE": {
        1: ["Digital Circuits", "Signals", "Physics"],
        2: ["VLSI", "Embedded Systems", "Communication"],
        3: ["Microprocessors", "DSP", "Antenna"],
        4: ["IoT", "Wireless Networks"]
    },
    # ... MECH, CIVIL, etc.
}
```

**How It Works:**
- Student logs in as CSE, Year 2
- Frontend calls: `GET /api/subjects/CSE/2`
- Backend returns: `["Algorithms", "DBMS", "OS", "Networking"]`
- UI displays these subjects in hamburger menu

**Why Hard-Coded?**
- Simple for this phase of the project
- No need for admin to configure subjects
- Easy to update by editing `app.py`

**Future Enhancement:**
- Move subjects to database
- Allow admin to add/edit subjects via UI
- Support custom subjects per semester

### Difference Between Subject Listing and Uploaded Content

**Important Distinction:**

🔹 **Subject Listing** = List of subjects shown in menu (hard-coded)
🔹 **Uploaded Content** = Actual notes uploaded by faculty (stored in database)

**Example:**

**Subjects in Menu (Hard-Coded):**
- Programming
- Data Structures
- Math-I

**Notes in Database (Uploaded by Faculty):**
- Note 1: Subject = "Programming", Title = "Introduction to Python"
- Note 2: Subject = "Programming", Title = "Loops and Functions"
- Note 3: Subject = "Data Structures", Title = "Arrays and Linked Lists"

**What Student Sees:**

**Clicks "Programming" in menu:**
- Shows Note 1 and Note 2 (filtered by subject)

**Clicks "Data Structures" in menu:**
- Shows Note 3

**Clicks "Math-I" in menu:**
- Shows empty state (no notes uploaded yet)

**Empty State Handling:**

If no notes exist for a subject:
```
┌─────────────────────────────────────┐
│   No notes available yet            │
│   Check back later!                 │
└─────────────────────────────────────┘
```

### Expected Student Experience

**Student: Ravi, CSE Year 2**

1. **Logs In:**
   - Redirected to `/student-CSE-2/`
   - Dashboard shows "Welcome, Ravi!"

2. **Clicks Hamburger Menu:**
   - Sees subjects:
     - Algorithms
     - DBMS
     - OS
     - Networking

3. **Clicks "DBMS":**
   - Main area updates to show all notes for DBMS
   - Sees cards:
     ```
     ┌─────────────────────────────────┐
     │ Introduction to SQL             │
     │ By: Dr. Kumar                   │
     │ [Download PDF] [View Summary]   │
     └─────────────────────────────────┘
     
     ┌─────────────────────────────────┐
     │ Normalization Tutorial          │
     │ By: Dr. Kumar                   │
     │ [YouTube Link]  [View Summary]  │
     └─────────────────────────────────┘
     ```

4. **Clicks "Download PDF":**
   - Browser opens PDF in new tab
   - Student can read/download

5. **Clicks "View Summary":**
   - AI-generated summary appears below card:
     ```
     Summary:
     • Introduction to relational databases
     • Basic SQL syntax and queries
     • Hands-on examples with SELECT, INSERT, UPDATE
     ```

6. **Clicks Bell Icon:**
   - Sees reminder: "DBMS quiz on Friday"

**Seamless Experience:**
- All content is filtered by department and year automatically
- Students never see content from other departments
- Clean, intuitive navigation

---

## 8. Email & Credential Flow

### Current Behavior (Testing/Development)

**When Admin Creates a Student:**

1. Admin fills student form:
   ```
   Name: Ravi Kumar
   Email: ravi@student.edu
   Department: CSE
   Year: 2
   Password: [Auto-generated: Xk9$mPq2...]
   ```

2. Admin clicks "Add Student"

3. Backend:
   - Hashes password with bcrypt
   - Saves to `students` table in Supabase
   - Sends email to **`CREDENTIAL_LOG_EMAIL`** (your email)

4. **Email Received (at `vbarath210706@gmail.com`):**
   ```
   Subject: New Student Credentials: Ravi Kumar

   --- New Student Account Created ---

   Name: Ravi Kumar
   Department: CSE
   Student Email: ravi@student.edu

   Login Credentials:
   ------------------
   Username/Email: ravi@student.edu
   Password: Xk9$mPq2...

   This is an automated message. Please securely transmit 
   these credentials to the student.
   ```

5. **Manual Step:** You copy the password and send it to `ravi@student.edu` via WhatsApp/Email manually

**Why This Setup?**
- Testing convenience (you don't need access to 50+ student emails)
- Credential logging (all passwords in one place for record-keeping)
- Safe for development (no accidental emails to real users)

### Real-World Expected Behavior

**In Production (College Environment):**

1. Admin creates student → System sends email **directly to `ravi@student.edu`**

2. **Email Received (at `ravi@student.edu`):**
   ```
   Subject: Welcome to ABC College Student Portal

   Dear Ravi Kumar,

   Your student account has been successfully created.

   Login Credentials:
   ------------------
   Portal: https://portal.college.edu
   Email: ravi@student.edu
   Password: Xk9$mPq2...

   Please log in immediately and change your password.

   Security Reminder:
   - Do not share your password
   - Contact IT if you have login issues

   Regards,
   ABC College Admin Team
   ```

3. **Optional:** BCC to `CREDENTIAL_LOG_EMAIL` for audit purposes

**Benefits:**
- Students receive credentials instantly
- No manual forwarding needed
- More professional
- Scalable (works for 1000+ students)

### Documentation-Only Guidance (No Code Changes)

**Full implementation details are in:**
📄 [Email Delivery Configuration Guide](file:///c:/Users/PARANTHAMAN%20V/.gemini/antigravity/brain/bd5597db-afb4-4aae-9248-ae598d32c2cf/email_delivery_guide.md)

**Summary of Changes Required:**

1. **Choose Email Service:**
   - **Gmail SMTP** (current, good for small scale)
   - **SendGrid** (recommended for colleges)
   - **AWS SES** (enterprise)
   - **Microsoft 365** (if college uses M365)

2. **Update Code:**
   - Change `to_email=CREDENTIAL_LOG_EMAIL` → `to_email=student_email`
   - Add professional email template
   - Optional: BCC to admin for logging

3. **Environment Variables:**
   - Add `COLLEGE_NAME`, `STUDENT_PORTAL_URL`
   - Update `SMTP_EMAIL` to professional address (`admin@college.edu`)

4. **Testing:**
   - Test with small batch of users
   - Monitor email delivery rates
   - Check spam folders

**Estimated Time:** 3-4 hours total

---

## 9. Deployment Strategy

### Why Deploy Portals Separately?

**Security:**
- Admin operations isolated from public-facing student portal
- If student portal is compromised, admin panel remains secure
- Different domains → harder to discover admin URL

**Simplicity:**
- Each portal is already a separate Flask app (`app.py`)
- No code refactoring needed
- Easier to maintain

**Scalability:**
- Update student portal without touching admin
- Independent resource allocation
- Can add more portals later (e.g., parent portal)

### Vercel Deployment Overview

**What is Vercel?**
- Cloud platform for deploying web applications
- Serverless architecture (automatically scales)
- Free tier supports multiple projects
- GitHub integration (auto-deploy on push)

**How Vercel Runs Flask:**
- Flask `app.py` → Converted to serverless function
- Each request → Function is invoked
- Response sent → Function shuts down
- No "always running" server (saves costs)

### Deployment Setup

**GitHub Repository Structure:**
```
college-management-system/
  ├── college-admin-portal/
  │   ├── app.py
  │   ├── requirements.txt
  │   ├── vercel.json
  │   └── templates/
  │
  └── college-learning-platform/
      ├── app.py
      ├── requirements.txt
      ├── vercel.json
      └── templates/
```

**Two Vercel Projects:**

**Project 1: Admin Portal**
- **GitHub Repo:** `college-management-system`
- **Root Directory:** `college-admin-portal` ⚠️ Important!
- **Deploy URL:** `admin-college-xyz.vercel.app`

**Project 2: Student-Faculty Portal**
- **GitHub Repo:** `college-management-system` (same repo!)
- **Root Directory:** `college-learning-platform` ⚠️ Important!
- **Deploy URL:** `portal-college-xyz.vercel.app`

**Key Point:** Same GitHub repo, different root directories → Two independent deployments

### Environment Variables Per Project

**Admin Portal Environment Variables:**
```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=service_role_key_here
SECRET_KEY=random-string-admin-portal
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password
SMTP_EMAIL=admin@college.edu
SMTP_PASSWORD=gmail_app_password
CREDENTIAL_LOG_EMAIL=it@college.edu
IT_DEPARTMENT_EMAIL=it@college.edu
```

**Student-Faculty Portal Environment Variables:**
```
ADMIN_SUPABASE_URL=https://yourproject.supabase.co
ADMIN_SUPABASE_KEY=service_role_key_here
LEARNING_SUPABASE_URL=https://yourproject.supabase.co
LEARNING_SUPABASE_SERVICE_ROLE_KEY=service_role_key_here
SECRET_KEY=random-string-student-portal  # DIFFERENT from admin!
GEMINI_API_KEY=your_google_ai_key
```

**How to Set Environment Variables:**
1. Go to Vercel Dashboard
2. Select project (Admin Portal or Student-Faculty Portal)
3. Settings → Environment Variables
4. Add each variable (name + value)
5. Click "Redeploy" to apply changes

**Security Note:** `.env` files are NOT uploaded to Vercel. You manually copy values from your local `.env` to Vercel dashboard.

### Deployment Limitations

**Vercel Serverless Constraints:**

⚠️ **Request Timeout:** 10 seconds (Hobby tier), 60 seconds (Pro)
- Long AI summary generation might timeout
- Solution: Implement background jobs (future enhancement)

⚠️ **Cold Starts:** First request after inactivity is slow (~2-3 seconds)
- Affects user experience
- Solution: Keep-alive pings or upgrade to Pro tier

⚠️ **No Persistent File System:** Files uploaded to disk are lost after function execution
- Must use external storage (Supabase Storage, AWS S3, etc.)
- Note: You're already using Supabase Storage URLs ✅

⚠️ **Memory Limit:** 1024 MB
- Large PDF processing might fail
- Solution: Limit PDF size or use cloud processing

⚠️ **No Background Tasks:** Can't run scheduled jobs
- Can't auto-delete old reminders
- Solution: Use Vercel Cron Jobs (separate feature)

### Deployment Considerations

**Best Practices:**

✅ **Separate `SECRET_KEY`:** Use different keys for Admin vs Student-Faculty portals  
✅ **Monitor Logs:** Check Vercel logs for errors  
✅ **Set `DEBUG=False`:** In production (Flask default is False in Vercel)  
✅ **HTTPS Only:** Vercel provides automatic SSL  
✅ **Environment Variables:** Never commit `.env` to GitHub  

**Testing Deployment:**

1. Deploy to Vercel
2. Visit deployed URL
3. Test login flow
4. Create a test student
5. Log in as student on Student Portal
6. Verify notes, reminders work

**Common Issues:**

🔴 **"Application Error"**
- Check Vercel logs
- Verify all environment variables are set
- Check `requirements.txt` has all dependencies

🔴 **"Database Connection Failed"**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Check Supabase project is not paused

🔴 **"Session Not Found"**
- Verify `SECRET_KEY` is set
- Clear browser cookies and try again

---

## 10. Limitations & Future Enhancements

### Known Constraints

#### 1. Hard-Coded Subjects
**Current:** Subjects defined in `SUBJECTS_MAP` dictionary in `app.py`  
**Limitation:** Admin can't add/edit subjects without changing code  
**Impact:** Need developer to update subjects each year

#### 2. No Role-Based Database Access (RLS)
**Current:** Backend uses `service_role` key for all operations  
**Limitation:** Database-level security not enforced (relies on Python code)  
**Risk:** If backend is compromised, attacker has full database access

#### 3. Single Email for Credentials
**Current:** All credentials sent to `CREDENTIAL_LOG_EMAIL`  
**Limitation:** Manual forwarding required  
**Impact:** Not scalable for large colleges

#### 4. No Password Reset
**Current:** If student forgets password, admin must manually reset  
**Limitation:** No self-service password recovery  
**Impact:** Increases admin workload

#### 5. No "Change Password" Feature
**Current:** Users can't change their password after first login  
**Limitation:** Security risk if password is compromised  
**Impact:** Must rely on admin to change passwords

#### 6. No File Upload Validation
**Current:** Frontend allows any file type  
**Limitation:** Could upload malware or non-PDF files  
**Impact:** Potential security risk

#### 7. No Rate Limiting
**Current:** Unlimited login attempts, API calls  
**Limitation:** Vulnerable to brute force attacks  
**Impact:** Security risk

#### 8. No Multi-Factor Authentication (MFA)
**Current:** Only email + password  
**Limitation:** Single point of failure  
**Impact:** Less secure than modern standards

### Scalability Considerations

**Current Capacity:**

✅ **Users:** Can handle 1000+ students/faculty (Supabase free tier: 500 MB storage)  
✅ **Requests:** Vercel free tier: 100 GB bandwidth/month  
✅ **Emails:** Gmail SMTP: 500 emails/day  

**Bottlenecks:**

⚠️ **Email Sending:** 500/day limit with Gmail → Switch to SendGrid/AWS SES  
⚠️ **AI Summaries:** Slow (5-10 seconds per PDF) → Use background jobs  
⚠️ **Database Queries:** No caching → Add Redis for frequently accessed data  

**Scaling Path:**

1. **0-500 users:** Current setup works ✅
2. **500-2000 users:** Switch to SendGrid, add database indexing
3. **2000+ users:** Upgrade Vercel to Pro, implement Redis caching, add CDN for static files

### Suggested Future Improvements

#### Phase 1: Security Enhancements (High Priority)
- [ ] Implement password reset via email
- [ ] Add "Change Password" feature
- [ ] Force password change on first login
- [ ] Implement rate limiting on login attempts
- [ ] Add CAPTCHA to login page
- [ ] Set up Row Level Security (RLS) in Supabase
- [ ] Use `anon` key instead of `service_role` key where possible

#### Phase 2: Usability Improvements
- [ ] Send credentials to individual user emails (not admin email)
- [ ] Admin dashboard: Add/edit subjects via UI
- [ ] Student: Mark reminders as "read"
- [ ] Faculty: Edit uploaded notes (current: can only delete)
- [ ] Student: Bookmark favorite notes
- [ ] Search functionality (search notes by title/subject)
- [ ] Dark/Light theme toggle

#### Phase 3: Advanced Features
- [ ] Email verification on account creation
- [ ] Multi-Factor Authentication (MFA)
- [ ] Real-time notifications (WebSocket or Supabase Realtime)
- [ ] Analytics dashboard (most viewed notes, active users)
- [ ] File upload to Supabase Storage (instead of external URLs)
- [ ] Discussion forum per subject
- [ ] Assignment submission system
- [ ] Attendance tracking

#### Phase 4: Performance Optimizations
- [ ] Background job processing for AI summaries (Celery + Redis)
- [ ] Database query optimization (indexes on frequently queried columns)
- [ ] Implement caching (Redis) for subjects, notes
- [ ] Lazy loading for notes (pagination)
- [ ] CDN for static assets (CSS/JS)
- [ ] Compress PDF files before storage

#### Phase 5: Compliance & Governance
- [ ] GDPR compliance (data export, right to be forgotten)
- [ ] Audit trail in database (not just emails)
- [ ] Admin audit log viewer
- [ ] Data retention policies
- [ ] Backup and disaster recovery plan

---

## 11. Setup & Run Instructions

### Prerequisites

Before you begin, ensure you have:

- **Python 3.8+** installed ([Download](https://www.python.org/downloads/))
- **Git** installed ([Download](https://git-scm.com/downloads))
- **Supabase Account** (free) ([Sign up](https://supabase.com))
- **Google Gemini API key** (optional, for AI summaries) ([Get key](https://ai.google.dev/))
- **Gmail Account** (for SMTP email sending)

### Local Setup Steps

#### Step 1: Clone the Repository

```bash
git clone https://github.com/paranthaman21/college-management-system.git
cd college-management-system
```

#### Step 2: Set Up Admin Portal

```bash
cd college-admin-portal
```

**Create virtual environment:**
```bash
python -m venv venv
```

**Activate virtual environment:**
- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Create `.env` file:**
```bash
# Create .env file in college-admin-portal/
```

**Add environment variables to `.env`:**
```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_KEY=your_service_role_key_here
SECRET_KEY=your-random-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
CREDENTIAL_LOG_EMAIL=your-email@gmail.com
IT_DEPARTMENT_EMAIL=your-email@gmail.com
```

**Run the app:**
```bash
python app.py
```

**Access Admin Portal:**
- Open browser: `http://localhost:5000`
- Login with `ADMIN_USERNAME` and `ADMIN_PASSWORD`

#### Step 3: Set Up Student-Faculty Portal

Open a **new terminal** (keep Admin Portal running):

```bash
cd college-learning-platform
```

**Create virtual environment:**
```bash
python -m venv venv
```

**Activate virtual environment:**
- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Create `.env` file:**
```env
ADMIN_SUPABASE_URL=https://yourproject.supabase.co
ADMIN_SUPABASE_KEY=your_service_role_key_here
LEARNING_SUPABASE_URL=https://yourproject.supabase.co
LEARNING_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SECRET_KEY=different-random-secret-key-here
GEMINI_API_KEY=your_google_ai_key  # Optional
```

**Run the app:**
```bash
python app.py
```

**Access Student-Faculty Portal:**
- Open browser: `http://localhost:5001`

#### Step 4: Set Up Supabase Database

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project
3. Go to **SQL Editor**
4. Run the schema files:
   - Copy contents of `college-learning-platform/schema.sql`
   - Paste and execute in SQL Editor
   - Repeat for `schema_update.sql` and `security_strict.sql`

5. Get credentials:
   - **SUPABASE_URL:** Project Settings → API → Project URL
   - **SUPABASE_KEY:** Project Settings → API → `service_role` key (not `anon` key!)

### Environment Configuration

#### Gmail App Password Setup

**Why needed?** Gmail doesn't allow apps to use your main password (security feature)

**Steps:**
1. Go to Google Account → Security
2. Enable 2-Step Verification (required)
3. Search for "App Passwords"
4. Select "Mail" and "Other (Custom name)"
5. Generate password
6. Copy 16-character password (e.g., `abcd efgh ijkl mnop`)
7. Paste in `.env` as `SMTP_PASSWORD=abcdefghijklmnop` (remove spaces)

#### Google Gemini API Key (Optional)

**Steps:**
1. Go to [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Create new key
4. Copy key
5. Paste in `.env` as `GEMINI_API_KEY=your_key_here`

**Note:** If you skip this, AI summaries will show "Summary unavailable" but everything else works fine.

### How to Run Both Portals Locally

**Terminal 1: Admin Portal**
```bash
cd college-admin-portal
venv\Scripts\activate  # Windows
python app.py
# Runs on http://localhost:5000
```

**Terminal 2: Student-Faculty Portal**
```bash
cd college-learning-platform
venv\Scripts\activate  # Windows
python app.py
# Runs on http://localhost:5001
```

**Testing Flow:**
1. Open `http://localhost:5000` → Login as admin
2. Create a test student (name, email, dept, year)
3. Copy the generated password from email notification
4. Open `http://localhost:5001` → Login as student
5. Verify dashboard loads

### Common Issues & Troubleshooting

#### Issue 1: "ModuleNotFoundError: No module named 'flask'"
**Cause:** Virtual environment not activated or dependencies not installed  
**Fix:**
```bash
venv\Scripts\activate  # Activate venv first
pip install -r requirements.txt
```

#### Issue 2: "Application Error: Database connection failed"
**Cause:** Wrong `SUPABASE_URL` or `SUPABASE_KEY` in `.env`  
**Fix:**
- Verify URL and key from Supabase Dashboard
- Ensure you're using `service_role` key (not `anon` key)
- Check Supabase project is not paused

#### Issue 3: "Password hash check failed"
**Cause:** Password hash mismatch  
**Fix:**
- Delete student from Supabase dashboard
- Recreate via Admin Portal
- Use freshly generated password

#### Issue 4: "Email not sending"
**Cause:** Invalid Gmail app password or 2FA not enabled  
**Fix:**
- Enable 2-Step Verification on Google Account
- Generate new App Password
- Update `.env` with new password (remove spaces)

#### Issue 5: "Session not found / User logged out automatically"
**Cause:** `SECRET_KEY` not set or different between restarts  
**Fix:**
- Set `SECRET_KEY` in `.env` to a fixed value (e.g., `my-secret-key-123`)
- Don't change it once set (invalidates existing sessions)

#### Issue 6: "AI Summary: Summary unavailable"
**Cause:** `GEMINI_API_KEY` missing or invalid  
**Fix:**
- Add valid key to `.env`
- If you don't have a key, this feature is optional (notes still work)

#### Issue 7: "Port already in use"
**Cause:** Another app running on port 5000 or 5001  
**Fix:**
```bash
# Windows: Find process using port
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9
```

#### Issue 8: "CORS Error" (when calling API from frontend)
**Cause:** `flask-cors` not installed or configured  
**Fix:**
- Verify `flask-cors` in `requirements.txt`
- Check `CORS(app)` is in `app.py`

### Development Tips

**Auto-Reload:**
Flask automatically reloads when you change code (if `debug=True` in `app.py`)

**Database Changes:**
- Make changes in SQL Editor on Supabase
- Or write migration scripts and run via Python

**Testing:**
- Use Postman/Insomnia to test API endpoints
- Check browser DevTools → Network tab for API errors

**Logs:**
- Flask prints logs to terminal
- Check for errors like "Database connection failed"

---

## Conclusion

This College Management System is a complete, production-ready platform for managing student and faculty data, distributing learning content, and facilitating communication. It follows modern web development practices with security, scalability, and user experience in mind.

**Key Takeaways:**
- Two separate portals for better security and maintainability
- Shared database ensures data consistency
- Environment variables keep secrets safe
- Beginner-friendly codebase with clear separation of concerns
- Deployed on Vercel for easy scaling and maintenance

**For Questions or Support:**
- Review this documentation
- Check troubleshooting section
- Examine code comments in `app.py` files
- Test in local environment before deploying

**Prepared by:** Barath (Paranthaman V)  
**Project Repository:** [github.com/paranthaman21/college-management-system](https://github.com/paranthaman21/college-management-system)
