# EduPortal — Full-Stack Enrollment System

A Node.js/Express full-stack university enrollment system with JWT authentication
and persistent JSON storage.

## Project Structure

```
eduportal/
├── server.js              # Express server + REST API
├── data.json              # Persistent data store
├── package.json
├── class/                 # Server-side OOP model (all bugs fixed)
│   ├── Course.js
│   ├── Student.js
│   ├── Faculty.js
│   ├── Enrollment.js
│   ├── DropRequest.js
│   └── EnrollmentSystem.js
└── public/                # Static frontend (served by Express)
    ├── index.html
    ├── style.css
    └── script.js          # Uses fetch() to call the API
```

## Setup & Run

```bash
npm install
npm start        # production
npm run dev      # with --watch auto-restart
```

Open **http://localhost:3000**

## Demo Credentials

| Role    | Username    | Password    |
|---------|-------------|-------------|
| Student | jdoe        | pass123     |
| Student | acruz       | pass123     |
| Student | msantos     | pass123     |
| Faculty | prof_reyes  | faculty123  |

## REST API

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint                    | Role    | Description                     |
|--------|-----------------------------|---------|---------------------------------|
| POST   | /api/auth/login             | —       | Login → returns JWT token       |
| GET    | /api/courses                | Any     | All courses with enrollment data|
| GET    | /api/enrollments            | Student | My active enrollments + stats   |
| POST   | /api/enrollments            | Student | Enroll in a course              |
| GET    | /api/drop-requests          | Any     | Student: own / Faculty: all     |
| POST   | /api/drop-requests          | Student | Submit a drop request           |
| PATCH  | /api/drop-requests/:id      | Faculty | Approve or reject a request     |
| GET    | /api/roster                 | Faculty | All courses with enrolled roster|
| GET    | /api/profile                | Student | Profile + unit count            |

### PATCH /api/drop-requests/:id body
```json
{ "action": "approve" }
{ "action": "reject", "note": "Optional reason" }
```

## Bugs Fixed (vs original codebase)

1. **`EnrollmentSystem.js`** — self-imported itself, causing a duplicate class declaration crash
2. **`EnrollmentSystem.js`** — `loadFromJSON` declared variables `findStudentby_Id` / `findCourseby_Code`
   but then used `s` / `c` (undefined), so all enrollments loaded as `null`
3. **`EnrollmentSystem.js`** — used `e.subjectCode` but `data.json` field is `e.courseCode`
4. **`EnrollmentSystem.js`** — `genId()` was undefined on the server (was only in `script.js`)
5. **`Faculty.js`** — constructor expected `dept` but `data.json` field is `department`
6. **`Enrollment.js`** — referenced `Student` and `Course` in instanceof checks without importing them
7. **`DropRequest.js`** — referenced `Enrollment` in instanceof check without importing it
8. **`Enrollment.toJSON()`** — used `subjectCode` key; standardised to `courseCode`
9. **`DropRequest.toJSON()`** — same `subjectCode` → `courseCode` fix
10. **`script.js`** — used `import fs from 'fs/promises'` (Node.js API) in a browser context
11. **`Course.js`** — constructor expected `prereqs` param but `data.json` sends `prerequisites`
