# 🎓 Interakt: University Student Social & Academic Platform
## Master Project Roadmap & Module Tracking Board

> **Project Vision:** A digital campus where university students connect, collaborate, discover events, participate in academic communities, find opportunities, and stay informed about everything happening around their university.
>
> **Core Architecture Principle:** Strictly mapped to institutional academic hierarchy:  
> `Institution` ➔ `Faculty` ➔ `Department` ➔ `Programme` ➔ `Level` ➔ `Courses` ➔ `Students`

---

## 📊 Roadmap Overview & Progress Tracker

| Module | Name | Focus Area | Cards | Status |
| :--- | :--- | :--- | :---: | :--- |
| **MOD-00** | **Foundation, Database & Core API** | Monorepo, DB Schema, Auth & Tenant Guard | 4/4 | 🟢 Completed |
| **MOD-01** | **Academic Hierarchy & Course Communities** | Faculty/Dept tree, Course Hubs, 6-tab space | 4/4 | 🟢 Completed |
| **MOD-02** | **Campus Feed & Social Networking** | Scoped Feeds, Rich Posts, Reactions, Comments | 0/4 | 🟡 Next Up |
| **MOD-03** | **Student Groups & Campus Clubs (Orgs)** | Study Squads, Official Societies, Join Requests | 0/4 | ⚪ Planned |
| **MOD-04** | **Academic Q&A & Peer Knowledge Hub** | Q&A Forum, LaTeX/Code, Best Answer, Rep | 0/4 | ⚪ Planned |
| **MOD-05** | **Course Materials & Digital Library** | Past Questions, Lecture Notes, S3 Storage | 0/4 | ⚪ Planned |
| **MOD-06** | **Campus Calendar, Timetables & Events** | Lecture Schedules, RSVPs, Unified Calendar | 0/4 | ⚪ Planned |
| **MOD-07** | **Student Opportunities Board** | Internships, Scholarships, Research, Deadlines | 0/4 | ⚪ Planned |
| **MOD-08** | **Direct Messaging & Real-Time Chat** | WebSockets, 1-on-1, Study Group Chats | 0/4 | ⚪ Planned |
| **MOD-09** | **Campus Announcements & Alerts** | Emergency broadcasts, Target audiences | 0/4 | ⚪ Planned |
| **MOD-10** | **Student Verification & Identity** | .edu Domain, ID Upload, Badges, Profiles | 0/4 | ⚪ Planned |
| **MOD-11** | **University Admin Portal** | Verification Queue, Course Manager, Moderation | 0/4 | ⚪ Planned |
| **MOD-12** | **Production Hardening, E2E & Telemetry** | Security Audits, In-depth Testing, CI/CD | 0/4 | ⚪ Planned |

---

## 🏗️ Detailed Module Breakdown & Task Cards

### 🟢 MODULE 00: Foundation, Infrastructure & Multi-Tenancy (Completed)
*Objective: Build the scalable bedrock, multi-tenant database schema, JWT auth, and dev environment.*

- [x] `CARD-M00-01`: **Monorepo Setup & Workspace Configuration**  
  - **Stack:** Turborepo, Next.js 14 App Router, NestJS 10 Fastify, Prisma 5, Tailwind CSS.  
  - **Status:** Completed.

- [x] `CARD-M00-02`: **Full Relational Campus Data Model (Prisma)**  
  - **Stack:** PostgreSQL 16 with 30+ relational models covering institutions, faculties, departments, courses, posts, comments, resources, questions, events, calendar items, groups, messages, and audit logs.  
  - **Status:** Completed & Synchronized.

- [x] `CARD-M00-03`: **Multi-Tenant Security Architecture**  
  - **Stack:** `JwtAuthGuard`, `TenantGuard`, `RolesGuard`, Fastify CORS, Helmet, and password hashing via `bcryptjs`.  
  - **Status:** Completed & Tested.

- [x] `CARD-M00-04`: **Database Provisioning & Institutional Seeding**  
  - **Stack:** Docker Compose dev stack (PostgreSQL 16 on 5434, Redis 7 on 6380, MinIO S3 on 9000). Seed script for platform super admin, University of Lagos, and CSC 101–401 courses.  
  - **Status:** Completed & Seeded.

---

### 🟢 MODULE 01: Academic Hierarchy & Course Communities (Completed)
*Objective: Enable students to browse their university's academic tree, enroll in courses per semester, and collaborate in rich 6-tab Course Hubs.*

#### 🗂️ Card `CARD-M01-01`: Academic Structure Explorer & Course Catalog
- **Priority:** P0 (Critical Path)
- **Target Area:** Backend API (`courses`, `programmes`, `faculties`) & Web Frontend (`/courses`, `/admin/academics`)
- **Description:** Provide an interactive navigation hierarchy allowing students to filter by Faculty ➔ Department ➔ Degree Programme ➔ Level (100L–500L) ➔ Semester (1st/2nd) to view matching courses.
- **Acceptance Criteria:**
  - [x] API endpoint `GET /api/v1/courses` supports query params: `facultyId`, `departmentId`, `programmeId`, `level`, `semester`, `search`.
  - [x] Frontend course browser displays active filters with clean badge pills and instant search.
  - [x] Shows course units, lecturer name, enrolled classmate count, and active syllabus status.
  - [x] Responsive grid layout with quick enrollment buttons.

#### 🗂️ Card `CARD-M01-02`: Semester Course Enrollment & Personal Course Roster
- **Priority:** P0 (Critical Path)
- **Target Area:** Backend API (`courses/enrollments`) & Web Frontend (`/courses`, Dashboard widget)
- **Description:** Allow students to enroll in courses for the active academic session/semester and manage their registered course list.
- **Acceptance Criteria:**
  - [x] API endpoint `POST /api/v1/courses/:id/enroll` (scoped to student's tenant institution).
  - [x] API endpoint `DELETE /api/v1/courses/:id/enroll` to drop a course.
  - [x] API endpoint `GET /api/v1/courses/my-courses` returning enrolled courses with unread activity indicators.
  - [x] Frontend toggle allows 1-click enroll/drop with optimistic updates via TanStack Query.
  - [x] Sidebar and Dashboard dynamically update "My Enrolled Courses" list.

#### 🗂️ Card `CARD-M01-03`: The 6-Tab Course Community Hub
- **Priority:** P0 (Critical Path)
- **Target Area:** Web Frontend (`/courses/[id]`) & API Course Aggregator
- **Description:** A comprehensive course community space structured into 6 tabs:
  1. **Feed:** Course announcements, lecturer updates, and student discussions.
  2. **Discussions:** Course-specific discussion threads and peer questions.
  3. **Materials:** Lecture slides, handouts, past examination papers, syllabus.
  4. **Timetable & Events:** Class times, tutorial sessions, quiz dates, and assignment deadlines.
  5. **Classmates (Roster):** Verified enrolled peers with study group invite buttons.
  6. **Study Groups:** Dedicated sub-groups created by students for exam prep and lab work.
- **Acceptance Criteria:**
  - [x] URL route `/courses/[code]` (e.g. `/courses/csc301`) loads complete course context.
  - [x] Tab switching is persistent with zero page reloads (App Router nested layout).
  - [x] Header displays Course Code, Course Title, Units, Faculty, Lecturer, and enrolled peer count.

#### 🗂️ Card `CARD-M01-04`: Course Representatives & Academic Moderation
- **Priority:** P1 (Core Experience)
- **Target Area:** Backend (`courses`, `users`) & Frontend (`/courses/[id]`)
- **Description:** Assign elected student Class Representatives (Course Reps) with special badges and permission to pin notices, upload verified syllabus, and schedule class reminders.
- **Acceptance Criteria:**
  - [x] Role flag `isCourseRep` or `COURSE_REP` permission in `CourseEnrollment`.
  - [x] Course Rep badge visible next to rep's name on course posts and roster.
  - [x] Rep can pin announcements to the top of the course feed.

---

### 📱 MODULE 02: Campus Feed & Student Social Networking
*Objective: Build an engaging, university-focused social stream supporting scoped academic discussions, rich attachments, and campus engagement.*

#### 🗂️ Card `CARD-M02-01`: Multi-Scope Feed Engine
- **Priority:** P0 (Critical Path)
- **Target Area:** Backend API (`posts`) & Web Frontend (`/`, `/discover`)
- **Description:** Power the main campus feed with scope tabs:
  - **All Campus:** Verified institution-wide feed.
  - **My Faculty:** Discussions within the student's faculty (e.g., Science).
  - **My Department:** Departmental discussions (e.g., Computer Science).
  - **My Level:** Year-specific cohort discussions (e.g., 300 Level).
  - **My Courses:** Aggregated updates strictly from enrolled courses.
- **Acceptance Criteria:**
  - [x] API endpoint `GET /api/v1/posts` supports `scope` filter (`CAMPUS`, `FACULTY`, `DEPARTMENT`, `LEVEL`, `ENROLLED_COURSES`).
  - [x] Infinite scrolling with cursor-based pagination.
  - [x] Scope switcher tabs on home dashboard with cached query states.

#### 🗂️ Card `CARD-M02-02`: Rich Post Creation & Media Attachments
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`posts`, `storage`)
- **Description:** Rich post editor supporting formatted text, code blocks, polls, document uploads (PDF, DOCX, slides), and images.
- **Acceptance Criteria:**
  - [x] Modal/Inline post composer with type tags: `General`, `Academic Question`, `Resource Share`, `Event Promo`.
  - [x] Direct upload integration to MinIO/S3 via presigned URLs or API upload gateway.
  - [x] File preview cards for uploaded PDFs/images before publishing.
  - [x] Posts render code snippets with syntax highlighting.

#### 🗂️ Card `CARD-M02-03`: Threaded Discussions & Academic Reactions
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`comments`, `reactions`)
- **Description:** Enable threaded replies and specialized academic reactions beyond a simple "like": `Insightful` 💡, `Helpful` 🤝, `Celebrate` 🎉, and `Upvote` ⬆️.
- **Acceptance Criteria:**
  - [x] Nested comments (up to 2 levels deep).
  - [x] Reaction picker with optimistic UI updates.
  - [x] Author and Verified Student indicators on comment items.

#### 🗂️ Card `CARD-M02-04`: Bookmarks & Post Sharing
- **Priority:** P2 (Enhancement)
- **Target Area:** Full-Stack (`bookmarks`, `/bookmarks`)
- **Description:** Allow students to save important academic posts, announcements, or resources to a personal Bookmarks space.
- **Acceptance Criteria:**
  - [x] 1-click bookmark toggle with toast feedback.
  - [x] Dedicated `/bookmarks` page with category filters (Posts, Resources, Questions).

---

### 👥 MODULE 03: Student Groups & Campus Clubs (Organizations)
*Objective: Digital home for departmental associations, faculty societies, hobby clubs, Greek/cultural organizations, and student study squads.*

#### 🗂️ Card `CARD-M03-01`: Campus Clubs & Official Organizations Directory
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`organizations`, `/organizations`)
- **Description:** Directory of official student societies (e.g., Developer Student Club, Engineering Society, Debating Club).
- **Acceptance Criteria:**
  - [ ] Search and category filters (Academic, Technology, Arts & Culture, Sports, Career, Leadership).
  - [ ] Club profile page featuring cover image, president/executive officer list, member count, and official verified badge.
  - [ ] "Join Club" or "Request Membership" workflow with approval settings.

#### 🗂️ Card `CARD-M03-02`: Course-Linked Study Groups & Peer Circles
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`groups`, `/groups`)
- **Description:** Allow students to form informal or semi-formal study groups tied to specific courses or topics (e.g., "CSC 301 Algorithm Study Circle").
- **Acceptance Criteria:**
  - [ ] Group creation modal: Title, description, course link (optional), privacy (Public/Private), and max member limit.
  - [ ] Course Hub displays associated study groups on its "Study Groups" tab.
  - [ ] Group member roster with owner/admin management capabilities.

#### 🗂️ Card `CARD-M03-03`: Club & Group Exclusive Spaces
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`groups/[id]`, `organizations/[id]`)
- **Description:** Dedicated hub for each club/group with an internal discussion feed, upcoming club events, and shared files.
- **Acceptance Criteria:**
  - [ ] Private group feed accessible only to accepted members.
  - [ ] Club executive posting privileges for official announcements.

---

### 💡 MODULE 04: Academic Q&A & Peer Knowledge Hub
*Objective: StackOverflow + Quora tailored for university coursework, where students ask course-specific questions, share code/solutions, and upvote answers.*

#### 🗂️ Card `CARD-M04-01`: Course-Indexed Question Forum
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`questions`, `/qa`)
- **Description:** Centralized Q&A forum with tags for Course Code, Topic, and Semester.
- **Acceptance Criteria:**
  - [ ] "Ask Question" form with title, course selector, rich markdown editor, code block support, and tags.
  - [ ] Filter by: All Courses, My Enrolled Courses, Unanswered, Most Upvoted.
  - [ ] Search questions with keyword highlighting.

#### 🗂️ Card `CARD-M04-02`: Answer Submissions & Accepted Solution Marking
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`questions`, `answers`)
- **Description:** Students and tutors submit answers to questions; question author or course reps can mark the best answer as "Accepted / Verified Solution".
- **Acceptance Criteria:**
  - [ ] Question author can click "Mark as Accepted Solution".
  - [ ] Accepted answer pinned directly below the question with a distinct green highlight and badge.
  - [ ] Upvote/downvote counter for all answers.

#### 🗂️ Card `CARD-M04-03`: Academic Reputation & Peer Contribution Score
- **Priority:** P2 (Enhancement)
- **Target Area:** Backend (`users/profile`) & Frontend Profile
- **Description:** Reward students who answer peer questions with campus reputation points and academic badges (e.g., "CSC 301 Top Contributor").
- **Acceptance Criteria:**
  - [ ] +15 points for accepted answer, +5 points per upvote.
  - [ ] Reputation counter displayed on student profile and answer cards.

---

### 📑 MODULE 05: Course Study Materials & Digital Library
*Objective: A structured, searchable repository for past examination papers, lecture slides, lab manuals, and syllabus notes.*

#### 🗂️ Card `CARD-M05-01`: Study Material Vault & Search Engine
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`resources`, `/resources`)
- **Description:** Digital repository categorized by Course, Material Type (Past Question, Lecture Slides, Summary Notes, Lab Manual, Textbook), Year, and Semester.
- **Acceptance Criteria:**
  - [ ] Search by course code (e.g. "CSC 201") or topic title.
  - [ ] Filter by material type, semester, and year of exam (e.g., 2024 Past Questions).
  - [ ] Resource card displays title, file format icon (PDF/DOCX/ZIP), file size, uploader name, and download count.

#### 🗂️ Card `CARD-M05-02`: Secure S3/MinIO Document Upload & Review
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`resources`, `storage`)
- **Description:** Enable verified students and course reps to upload course materials with automatic virus/format validation and metadata tagging.
- **Acceptance Criteria:**
  - [ ] Multi-file upload dropzone with progress bar.
  - [ ] File stored in MinIO/S3 under structured tenant paths: `/{institutionId}/courses/{courseCode}/{type}/{filename}`.
  - [ ] Direct download / browser PDF preview.
  - [ ] Download counter increments on file access.

---

### 📅 MODULE 06: Campus Calendar, Timetables & Events
*Objective: Unified university schedule integrating lecture timetables, assignment deadlines, club events, and campus-wide fests.*

#### 🗂️ Card `CARD-M06-01`: Lecture Timetable Integration
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`calendar`, `/calendar`)
- **Description:** Automatically render enrolled courses' weekly class times, venues, and lecturer details into a clean calendar view.
- **Acceptance Criteria:**
  - [ ] Weekly and Monthly timetable views with color-coded course blocks.
  - [ ] Course venue (e.g., "LT1 - Science Complex") and time slot (e.g., "Mon 10:00 AM - 12:00 PM") clearly displayed.
  - [ ] "Today's Schedule" widget on the main dashboard showing upcoming classes.

#### 🗂️ Card `CARD-M06-02`: Campus Events & RSVP System
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`events`, `/events`)
- **Description:** Discovery portal for campus happenings: guest lectures, career fairs, hackathons, sports matches, and social hangouts.
- **Acceptance Criteria:**
  - [ ] Events directory with date, venue, organizer (Club/Dept), and event banner.
  - [ ] "RSVP: Going / Interested" button with attendee count.
  - [ ] RSVP'd events automatically sync to the student's personal calendar.

---

### 🚀 MODULE 07: Student Opportunities Board
*Objective: A curated job, internship, scholarship, and research assistantship board tailored to students and recent graduates.*

#### 🗂️ Card `CARD-M07-01`: Opportunities Directory & Filter Hub
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`opportunities`, `/opportunities`)
- **Description:** Opportunity listings categorized into: Internships (SIWES/IT), Graduate Trainee, Scholarships, Research Roles, Hackathons, Campus Ambassador.
- **Acceptance Criteria:**
  - [ ] Search by title, company/organization, and target department/major.
  - [ ] Filters for Paid/Unpaid, Remote/On-site, and Application Deadline.
  - [ ] Deadline countdown badge ("Closing in 3 days").

#### 🗂️ Card `CARD-M07-02`: Opportunity Details & External Apply Link
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`opportunities`)
- **Description:** Full view for each opportunity with requirements, eligibility criteria, compensation range, and direct apply action.
- **Acceptance Criteria:**
  - [ ] "Apply Now" button opening external portal or showing application instructions.
  - [ ] Bookmark opportunity to personal saved list.

---

### 💬 MODULE 08: Direct Messaging & Real-Time Chat
*Objective: Instant peer communication and study collaboration powered by WebSockets.*

#### 🗂️ Card `CARD-M08-01`: Real-Time 1-on-1 Direct Messaging
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`messages`, Socket.io, `/messages`)
- **Description:** Verified students can message classmates and study group peers directly.
- **Acceptance Criteria:**
  - [ ] Socket.io real-time connection authenticated via JWT.
  - [ ] Instant message delivery with delivery/read checkmarks.
  - [ ] Unread conversation badge in sidebar and header.

#### 🗂️ Card `CARD-M08-02`: Study Group & Course Channel Chats
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`messages`, `groups`)
- **Description:** Group chat room for members of a study group or project team.
- **Acceptance Criteria:**
  - [ ] Group chat view displaying sender avatars and names.
  - [ ] Real-time typing indicators ("David is typing...").
  - [ ] Image and file attachments inside chat.

---

### 📢 MODULE 09: Campus Announcements & Institutional Alerts
*Objective: High-priority institutional broadcasts from university management, faculty deans, and department heads.*

#### 🗂️ Card `CARD-M09-01`: Targeted Announcement Broadcasting
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`announcements`, `/announcements`)
- **Description:** Allow university administrators and faculty heads to broadcast official news to targeted audiences.
- **Acceptance Criteria:**
  - [ ] Priority tags: `EMERGENCY / URGENT`, `ACADEMIC NOTICE`, `ADMINISTRATIVE`, `GENERAL`.
  - [ ] Audience targeting: Institution-wide, Specific Faculty, Specific Department, or Specific Level.
  - [ ] High-priority banner alert on home dashboard for emergency/urgent announcements.

---

### 🛡️ MODULE 10: University Verification & Student Identity
*Objective: Ensure trust, academic integrity, and campus authenticity through multi-tier student verification.*

#### 🗂️ Card `CARD-M10-01`: Multi-Method Verification Workflows
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`auth`, `users`, `/profile`)
- **Description:** Enable three verification pathways:
  1. **Domain Email:** Instant verification via `.edu` / institutional email verification code.
  2. **Student ID Upload:** Upload photo of student ID card for admin review.
  3. **Matriculation Matching:** Matching matriculation number against institutional student list.
- **Acceptance Criteria:**
  - [ ] ID card upload endpoint saving to private S3 bucket.
  - [ ] Creates a pending `VerificationRequest` record in database.
  - [ ] Profile shows verification badge (Blue check for verified students, Gold shield for faculty/reps).

#### 🗂️ Card `CARD-M10-02`: Comprehensive Academic Profile
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`users`, `/profile`)
- **Description:** Student profile showcasing Degree Programme, Faculty, Department, Level, Current Enrolled Courses, Joined Clubs, and Bio.
- **Acceptance Criteria:**
  - [ ] Profile edit modal (Bio, Avatar, Social links, Skills/Interests).
  - [ ] Privacy controls: Toggle visibility of phone/email to non-classmates.

---

### 🏛️ MODULE 11: University Administration Portal
*Objective: Dedicated management console for university administrators, deans, and moderators.*

#### 🗂️ Card `CARD-M11-01`: Student Verification Queue
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack (`admin/verifications`, `/admin/users`)
- **Description:** Admin queue to inspect uploaded student ID cards and approve or reject verification requests with feedback.
- **Acceptance Criteria:**
  - [ ] Table of pending verification requests with student name, email, matric number, and ID photo preview.
  - [ ] "Approve" button sets student status to `VERIFIED` and sends confirmation notification.
  - [ ] "Reject" button prompts for rejection reason (e.g. "Blurry photo").

#### 🗂️ Card `CARD-M11-02`: Academic Structure Manager
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`admin/academics`, `/admin/academics`)
- **Description:** Portal for campus admins to create and manage Faculties, Departments, Programmes, and Courses.
- **Acceptance Criteria:**
  - [ ] Modals to add/edit Faculty, Department, Programme, Course.
  - [ ] Bulk course import via CSV format.

#### 🗂️ Card `CARD-M11-03`: Content Moderation & Audit Logs
- **Priority:** P1 (Core Experience)
- **Target Area:** Full-Stack (`admin/moderation`, `reports`)
- **Description:** Review reported posts, comments, or spam, and suspend malicious accounts.
- **Acceptance Criteria:**
  - [ ] Reported items queue with reporter reason and content snippet.
  - [ ] Actions: "Dismiss Report", "Delete Content", "Suspend User (7 days / Permanent)".
  - [ ] Audit log entry recorded for every admin moderation action.

---

### 🔒 MODULE 12: Production Hardening, Testing & Deployment
*Objective: Guarantee stability, data security, fast loading times, and zero breaking bugs.*

#### 🗂️ Card `CARD-M12-01`: End-to-End API Integration & Error Handling
- **Priority:** P0 (Critical Path)
- **Target Area:** Full-Stack Integration
- **Description:** Verify all frontend pages query live backend endpoints with standardized error toasts and loading skeletons.
- **Acceptance Criteria:**
  - [ ] Zero unhandled 500 or 404 errors.
  - [ ] Auto token refresh silently keeps session active without logging user out unexpectedly.

#### 🗂️ Card `CARD-M12-02`: Automated Test Suite
- **Priority:** P1 (Core Experience)
- **Target Area:** Backend & Frontend Tests
- **Description:** Unit and integration tests for critical business logic (Enrollment, Multi-tenant queries, Verification).
- **Acceptance Criteria:**
  - [ ] Jest tests for auth and course services.
  - [ ] End-to-end smoke test for user registration, login, course enrollment, and post creation.

---

## 🎯 Recommended Next Execution Phase
To build with maximum momentum, we proceed in logical priority:
1. **Sprint 1 (Now): Module 01 — Academic Engine & Course Communities**
   - Connect live Course Catalog, Course Roster, and Course Enrollment.
   - Wire the 6-Tab Course Hub (`/courses/[id]`) with live database data.
2. **Sprint 2: Module 05 & 04 — Course Study Materials & Academic Q&A**
   - Past question/materials vault with MinIO upload + Course Q&A forum.
3. **Sprint 3: Module 02 & 03 — Campus Feed, Groups & Clubs**
   - Multi-scope feed, rich post creator, study groups, and campus clubs.
4. **Sprint 4: Module 06, 07, 08 & 09 — Calendar, Opportunities, Chat & Announcements**
5. **Sprint 5: Module 10, 11 & 12 — Verification, Admin Console & Hardening**
