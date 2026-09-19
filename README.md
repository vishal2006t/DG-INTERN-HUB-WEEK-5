# 🛡️ SecureAuth – Full-Stack Authentication & Admin Dashboard

> **DG Interns Hub — Week 5 Full-Stack Web Application Submission**  
> An enterprise-grade, modern, secure authentication and role-based access control (RBAC) web application built strictly with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express, and MongoDB**.

---

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Security Architecture & Controls](#-security-architecture--controls)
4. [Technology Stack](#-technology-stack)
5. [Directory Structure](#-directory-structure)
6. [Environment Variables](#-environment-variables)
7. [Installation & Setup](#-installation--setup)
8. [MongoDB Atlas Setup Guide](#-mongodb-atlas-setup-guide)
9. [How to Run the Application](#-how-to-run-the-application)
10. [REST API Documentation](#-rest-api-documentation)
11. [Admin Account Provisioning](#-admin-account-provisioning)
12. [Testing & Verification Guide](#-testing--verification-guide)
13. [Future Enhancements](#-future-enhancements)

---

## 🚀 Project Overview

**SecureAuth** is a full-stack security platform developed for the DG Interns Hub Week 5 assignment. It demonstrates how modern web applications protect user identity, defend against automated brute-force attacks, manage session integrity, and enforce strict role boundaries between regular users and administrators.

The project strictly follows the specification constraint: **zero frontend frameworks** (No React, Next.js, Vue, Tailwind, Firebase, or Supabase). All presentation, reactive UI state, and client-side guards are powered by clean **HTML5, CSS3, and Vanilla JavaScript (ES6+)**, integrated with an **Express.js** REST API and **MongoDB Mongoose** database layer.

---

## ✨ Key Features

### 1. Public Landing Page (`index.html`)
- Modern cybersecurity dark-theme design with responsive layouts.
- Interactive security feature cards detailing password hashing, JWT, rate limiting, and RBAC.
- Dynamic navigation bar that updates dynamically when a user is authenticated.

### 2. User Registration (`signup.html`)
- Fields: Full Name, Email, Password, Confirm Password.
- Real-time **Password Strength Meter** evaluating length, uppercase, lowercase, numbers, and special symbols.
- Strict client-side and server-side validation using `express-validator`.
- Role assignment is locked to `'user'` on the backend to prevent malicious privilege escalation.

### 3. User Authentication (`login.html`)
- Rate-limited login endpoint to prevent automated brute-force attacks.
- Cryptographic password verification with `bcryptjs`.
- Issues signed HMAC SHA-256 **JSON Web Tokens (JWT)**.
- **Smart Redirection**: Admins are directed to `admin.html`, standard users to `dashboard.html`.
- **Quick-Fill Demo Buttons**: Pre-populates Admin and User credentials for instant testing.

### 4. User Dashboard (`dashboard.html`)
- Protected route: unauthorized users are immediately redirected to `login.html`.
- Displays user profile information, verified email, account registration timestamp, and last login time.
- **Security Health Card**: Real-time checklist of account security parameters.
- **Recent Security Activity Log**: Audit timeline capturing user actions, IP addresses, and user-agent details.
- Admin shortcut banner shown if an administrator visits the user dashboard.

### 5. Admin Dashboard (`admin.html`)
- Strictly protected by `authMiddleware` and `adminMiddleware` (returns `403 Forbidden` to standard users).
- **Live System Analytics**: Total users, admin count, standard user count, and registrations in the last 24h.
- **Live User Directory Table**:
  - Displays: User Avatar & ID, Name, Email, Role badge, Registration Date, Last Active Session.
  - **Live Search**: Instant real-time filtering by name or email.
  - **Role Filter Tabs**: Filter between All, Users, and Admins.
  - **Role Toggle**: Promote standard users to admin or demote admins with instant confirmation.
  - **Account Deletion Modal**: Irreversible deletion with verification dialog.
  - **Self-Protection Safeguard**: Prevents the logged-in administrator from deleting or demoting their own active account.

### 6. Profile & Security Settings (`profile.html`)
- Edit account holder name.
- Choose from 5 cybersecurity avatar styles (Cyan, Emerald, Indigo, Amber, Rose).
- Change password with mandatory current-password verification and strength enforcement.

### 7. 404 & Access Denied Handler (`404.html`)
- Dedicated security error page for missing routes (`404`) and unauthorized access attempts (`403 Access Denied`).
- Quick recovery buttons to return to the Home page or Dashboard.

---

## 🔒 Security Architecture & Controls

| # | Security Feature | Implementation Details |
|---|---|---|
| **1** | **bcrypt Password Hashing** | Salted with 12 rounds before database persistence via Mongoose pre-save hooks. Passwords are never stored or logged in plain text. |
| **2** | **JWT Authentication** | Stateless HMAC SHA-256 tokens carrying user ID and role, verified server-side on every protected API call. |
| **3** | **Protected API Routes** | `protect` middleware extracts Bearer token, validates signature, checks expiration, and attaches the sanitized user model to `req.user`. |
| **4** | **Role-Based Authorization (RBAC)** | `adminOnly` middleware strictly blocks non-admin users from accessing administrative endpoints with `403 Forbidden`. |
| **5** | **Input Validation & Sanitization** | `express-validator` validates email formats, name lengths, and password strength; escapes HTML tags to neutralize injection attacks. |
| **6** | **XSS & Content Security Policy** | Helmet configures strict `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN`. |
| **7** | **Rate Limiting** | `express-rate-limit` throttles login attempts (15 per 15 min window) and registration attempts to protect against brute-force attacks. |
| **8** | **Zero Password Exposure** | Schema-level `toJSON` transform automatically deletes the `password` and internal `__v` fields from all JSON outputs. |
| **9** | **Environment Variables** | Secrets (`MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`) are loaded via `dotenv` and excluded via `.gitignore`. |
| **10** | **Privilege Escalation Prevention** | The registration route explicitly ignores any client-submitted `role` field and hardcodes new accounts to `'user'`. |

---

## 💻 Technology Stack

- **Frontend**:
  - Semantic HTML5
  - Modern CSS3 (CSS Variables, Flexbox, Grid, Glassmorphism backdrop-filter)
  - Vanilla JavaScript (Async/Await, Fetch API, DOM manipulation)
  - Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*)
- **Backend**:
  - Node.js (v18+)
  - Express.js (v4.19+)
- **Database & Modeling**:
  - MongoDB Atlas
  - Mongoose ODM (v8.4+)
- **Security & Utilities**:
  - `bcryptjs`: Salting & hashing
  - `jsonwebtoken`: Token creation and verification
  - `express-validator`: Server-side sanitization
  - `express-rate-limit`: Brute-force throttling
  - `helmet`: Security HTTP headers & CSP
  - `cors`: Safe origin handling
  - `dotenv`: Configuration management
  - `mongodb-memory-server`: Local development/testing fallback

---

## 📁 Directory Structure

```text
secureauth/
│
├── frontend/
│   ├── index.html            # Landing page with security highlights
│   ├── login.html            # Sign in page with demo credentials helper
│   ├── signup.html           # Registration with real-time password meter
│   ├── dashboard.html        # Normal user dashboard & activity telemetry
│   ├── admin.html            # Administrator dashboard & user management
│   ├── profile.html          # Profile settings & password change
│   ├── 404.html              # 404 Not Found & 403 Access Denied page
│   ├── style.css             # Unified dark cybersecurity design system
│   └── script.js             # Client auth state, API client & UI events
│
├── backend/
│   ├── server.js             # Express app, Helmet, static serving & routes
│   ├── config/
│   │   └── db.js             # MongoDB connection with Atlas & memory fallback
│   ├── models/
│   │   └── User.js           # User schema, bcrypt hooks, activity logging
│   ├── middleware/
│   │   ├── authMiddleware.js # JWT verification & user session validation
│   │   ├── adminMiddleware.js# RBAC role verification (Admin only)
│   │   └── errorMiddleware.js# 404 & global error response formatters
│   ├── routes/
│   │   ├── authRoutes.js     # Signup, Login, Logout (rate-limited)
│   │   ├── userRoutes.js     # User profile, name/avatar update, password change
│   │   └── adminRoutes.js    # Directory query, delete user, role toggle, stats
│   └── scripts/
│       └── seedAdmin.js      # CLI script for safe initial admin provisioning
│
├── .env.example              # Sample environment variable template
├── .env                      # Local environment configuration
├── .gitignore                # Git exclusions
├── package.json              # Project dependencies and npm scripts
└── README.md                 # Complete documentation
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Server Port
PORT=5000

# Environment Mode
NODE_ENV=development

# MongoDB Connection String
# Leave empty for automatic local in-memory MongoDB, or paste your MongoDB Atlas URI:
MONGODB_URI=

# JWT Configuration
JWT_SECRET=secureauth_jwt_super_secret_dg_interns_key_9837429873498
JWT_EXPIRES_IN=24h

# Initial Administrator Credentials (provisioned via `npm run seed:admin` or auto-init)
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@secureauth.io
ADMIN_PASSWORD=Admin@Secure2026!
```

---

## 📦 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher)
- [npm](https://www.npmjs.com/) (version 9.0.0 or higher)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### 1. Clone or Open the Workspace
```bash
cd "d:\DG INTERNS HUB\WEEK 5\WEEK 5 WEB"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Admin & Demo Users
Run the secure CLI seed script to initialize the Administrator and Demo accounts:
```bash
npm run seed:admin
```

---

## 🍃 MongoDB Atlas Setup Guide

SecureAuth is fully compatible with **MongoDB Atlas** cloud clusters:

1. Visit [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and log in or create a free account.
2. Create a free **M0 Sandbox Cluster**.
3. Under **Security → Database Access**, create a database user with username and password.
4. Under **Security → Network Access**, add `0.0.0.0/0` (allow access from anywhere) for development.
5. Go to **Database → Connect → Drivers → Node.js** and copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/secureauth?retryWrites=true&w=majority
   ```
6. Open `.env` and paste your string into `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://admin_user:YourStrongPassword@cluster0.xxxxx.mongodb.net/secureauth?retryWrites=true&w=majority
   ```

> [!NOTE]
> **Zero-Config Local Fallback**: If `MONGODB_URI` is left blank during development, SecureAuth automatically launches an embedded in-memory MongoDB instance. This enables immediate testing and grading without requiring an internet connection or pre-configured cloud database!

---

## 🚦 How to Run the Application

### Development Mode (with hot-reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Accessing the Web Application
Open your browser and navigate to:
```text
http://localhost:5000
```
*(Both the frontend static pages and backend REST APIs run on the same unified port for effortless local testing).*

---

## 📡 REST API Documentation

### Base URL: `http://localhost:5000/api`

### 1. Authentication Routes (`/auth`)

#### `POST /api/auth/signup`
- **Access**: Public (Rate-Limited)
- **Description**: Registers a new standard user account.
- **Request Body**:
  ```json
  {
    "name": "Alex Chen",
    "email": "alex.chen@secureauth.io",
    "password": "User@Secure2026!",
    "confirmPassword": "User@Secure2026!"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Account created successfully! Welcome to SecureAuth.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "65f8a7e2b10a9b001a123456",
      "name": "Alex Chen",
      "email": "alex.chen@secureauth.io",
      "role": "user",
      "avatar": "shield-cyan",
      "createdAt": "2026-09-18T16:30:00.000Z"
    }
  }
  ```

#### `POST /api/auth/login`
- **Access**: Public (Rate-Limited)
- **Description**: Verifies credentials and generates a signed JWT.
- **Request Body**:
  ```json
  {
    "email": "admin@secureauth.io",
    "password": "Admin@Secure2026!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Authentication successful. Welcome back!",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "65f8a7e2b10a9b001a654321",
      "name": "System Administrator",
      "email": "admin@secureauth.io",
      "role": "admin"
    }
  }
  ```

#### `POST /api/auth/logout`
- **Access**: Public / Bearer Protected
- **Description**: Logs logout telemetry in the database audit record.

---

### 2. User Routes (`/users`)

#### `GET /api/users/profile`
- **Access**: Protected (`Authorization: Bearer <token>`)
- **Description**: Fetches current user profile and activity audit history.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "_id": "...",
      "name": "Alex Chen",
      "email": "alex.chen@secureauth.io",
      "role": "user",
      "avatar": "shield-cyan",
      "createdAt": "2026-09-18T16:30:00.000Z",
      "lastLogin": "2026-09-18T16:35:00.000Z"
    },
    "activityLog": [
      {
        "action": "User Logged In",
        "ip": "127.0.0.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2026-09-18T16:35:00.000Z"
      }
    ]
  }
  ```

#### `PUT /api/users/profile`
- **Access**: Protected
- **Description**: Updates user display name and avatar preference.
- **Request Body**:
  ```json
  {
    "name": "Alexander Chen",
    "avatar": "shield-emerald"
  }
  ```

#### `PUT /api/users/change-password`
- **Access**: Protected
- **Description**: Verifies current password and updates to a new bcrypt-hashed password.
- **Request Body**:
  ```json
  {
    "currentPassword": "User@Secure2026!",
    "newPassword": "NewStrongPassword@2026!"
  }
  ```

---

### 3. Administrator Routes (`/admin`)

#### `GET /api/admin/users?search=&role=`
- **Access**: Protected (`Admin Role Required`)
- **Description**: Returns user directory list with search and role filters.

#### `GET /api/admin/analytics`
- **Access**: Protected (`Admin Role Required`)
- **Description**: Provides aggregated statistics (total users, admin count, standard user count, 24h registrations).

#### `PATCH /api/admin/users/:id/role`
- **Access**: Protected (`Admin Role Required`)
- **Description**: Changes user role to `'admin'` or `'user'`. Admin cannot demote themselves.

#### `DELETE /api/admin/users/:id`
- **Access**: Protected (`Admin Role Required`)
- **Description**: Deletes a user account. Admin cannot delete themselves.

---

## 🛡️ Admin Account Provisioning

### Security Justification
Exposing a public "Register as Admin" checkbox or endpoint allows any attacker to escalate their privileges to root administrator. In accordance with enterprise security standards:
1. **Public Signup is strictly locked to `role: 'user'`**.
2. **Administrator accounts must be provisioned out-of-band** via the server CLI or automated backend bootstrap.

### Provisioning Command
```bash
npm run seed:admin
```
This executes `backend/scripts/seedAdmin.js`, which securely provisions:
- **Admin**: `admin@secureauth.io` / `Admin@Secure2026!` (Role: `admin`)
- **Demo User**: `alex.chen@secureauth.io` / `User@Secure2026!` (Role: `user`)
- Three additional sample users for the admin directory table.

---

## 🧪 Testing & Verification Guide

### Test Flow 1: New User Registration & Validation
1. Open `http://localhost:5000/signup.html`.
2. Enter a weak password (e.g. `12345`). Notice the real-time strength meter turns red and displays "Weak".
3. Enter `Alex Test`, a valid email, and `Secret@2026!`.
4. Click **Create Free Account**.
5. Observe the toast notification and automatic redirection to `dashboard.html`.

### Test Flow 2: Standard User Dashboard & Boundary Verification
1. On `dashboard.html`, review your account information, role badge (`user`), and recent activity log.
2. In the browser address bar, try manually navigating to `http://localhost:5000/admin.html`.
3. Verify that SecureAuth immediately intercepts the unauthorized request and redirects you to `404.html?denied=true` (HTTP 403 Access Restricted).

### Test Flow 3: Administrator Directory & Analytics
1. Click **Sign Out** to end the standard user session.
2. On `login.html`, click the quick-fill button **🛡️ Admin Account**.
3. Click **Authenticate & Sign In**.
4. Observe automatic redirection to `admin.html`.
5. Review the 4 live analytics cards.
6. Type a name in the search bar (e.g., `Marcus` or `Alex`) to verify real-time search filtering.
7. Click the **Admins Only** tab to filter administrators.
8. Click **Promote/Demote** to test role modifications.
9. Click **Delete** on a sample user, confirm the modal prompt, and observe the user being removed from the database.
10. Note that the delete and demote buttons are disabled for your own active administrator account.

### Test Flow 4: Profile Customization & Password Update
1. Navigate to `http://localhost:5000/profile.html`.
2. Change your name or select a new avatar color (e.g., Green or Indigo) and click **Save Profile Details**.
3. Under Change Password, enter your current password and a new strong password.
4. Verify success toast and confirm the activity log updates on `dashboard.html`.

---

## 🔮 Future Enhancements
- Multi-Factor Authentication (TOTP via Google Authenticator).
- Email verification via Nodemailer / SendGrid.
- OAuth 2.0 / Social Login integrations (GitHub & Google).
- Docker containerization (`Dockerfile` and `docker-compose.yml`).
- Dark / Light theme toggle.

---

## 👨‍💻 Author & Submission Details
- **Project**: DG Interns Hub — Week 5 Full-Stack Web Application Task
- **Title**: SecureAuth – Full-Stack Authentication & Admin Dashboard
- **Submission Date**: September 2026
- **Status**: Complete & Ready for Evaluation
