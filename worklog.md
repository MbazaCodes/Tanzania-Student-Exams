---
Task ID: 1
Agent: main (orchestrator)
Task: Build a complete Papers Library + Exam management system for ExamHub — schools/teachers/admins upload papers, build exams & quizzes, students take them, objective questions auto-mark, teachers review essays and publish results.

Work Log:
- Inspected project: fresh Next.js 16 + Prisma/SQLite + full shadcn/ui, dev server on :3000
- Designed Prisma schema: User, School, Paper, Exam, Question, Submission, Answer (7 models) + pushed to DB
- Seeded demo data: Nyerere school, 5 users (1 per role + 2 students), 4 papers (mixed statuses), 2 published exams (Biology w/ 4 question types, Maths quiz), 1 demo submission with unmarked essay
- Built API routes (8): /api/me (GET), /api/me/switch (POST), /api/seed (POST), /api/papers (GET/POST), /api/papers/[id] (PATCH/DELETE), /api/exams (GET/POST), /api/exams/[id] (GET/PATCH/DELETE), /api/submissions (GET/POST w/ auto-marking), /api/submissions/[id] (GET/PATCH review+publish), /api/stats (GET)
- Built auth helper (cookie-based demo user + role fallback) and grading logic (A/B/C/D/F)
- Built frontend: ExamHubApp shell (header, role switcher, sidebar nav, mobile drawer, sticky footer) + 8 tab components
- Auto-marking: MCQ/True-False/Short auto-marked on submit; Essay left for teacher with marks override + feedback
- Verified end-to-end with Agent Browser: publish paper, switch roles, student takes exam (100% auto-marked), teacher reviews essay (5/7→7/7), publishes result, student sees published result w/ feedback, admin overview stats
- Fixed 3 bugs found during verification: (1) "publish" vs "published" status typo, (2) Radix SelectItem empty-string value crash on Create Exam, (3) zustand v5 selector subscription — converted all components to use selectors for reliable nonce-based refetch
- Mobile responsive (hamburger drawer) + sticky footer verified

Stage Summary:
- Single-route (/) SPA-style dashboard with 8 role-aware tabs
- 5 demo users across 4 roles (student/teacher/school_admin/super_admin) switchable via header
- Full papers lifecycle: draft → published → archived with filters, search, "Build Exam" shortcut
- Full exam lifecycle: create w/ 4 question types → publish → student takes (timer + auto-submit) → auto-mark objective → teacher reviews essay → publish result
- Lint clean, no runtime errors, all core flows browser-verified
- Artifacts: prisma/schema.prisma, src/lib/{db,auth,seed,types,api-client}.ts, src/app/api/**, src/components/examhub/{ExamHubApp,store}.tsx + tabs/*.tsx

---
Task ID: 2
Agent: main (orchestrator)
Task: Push to new GitHub repo (Tanzania-Student-Exams), apply Tanzanian navy/green theme from reference images, add Timer/Schedule/appointment-alert features for quiz of the day, exam, test, assignment.

Work Log:
- Analyzed 4 reference images via VLM: consistent Tanzanian government portal theme — navy #003366, green #00a651, gold #f5a623, sky #0066cc, clean white/light backgrounds
- Cleaned git: untracked .env + db/custom.db, added db/ + upload/ to .gitignore, wrote README.md
- Pushed full history to github.com/MbazaCodes/Tanzania-Student-Exams.git (token used inline for push only, NOT stored in git config)
- Rewrote globals.css with Tanzania brand palette (navy/green/gold/sky) + flag-bar ribbon + bg-hero gradient + shadow-card + timer-digit utilities
- Restyled ExamHubApp shell: navy hero header with green logo tile + gold accent, Tanzania flag ribbon on top, dark navy footer, themed nav buttons (navy active with gold icon), header Alerts bell
- Added ScheduleItem Prisma model (type: quiz_of_day/exam/test/assignment, status: scheduled/live/completed/cancelled, examId link, scheduledAt, durationMins) + back-relations on User/School
- Seeded 5 schedule items across types/timeframes (Biology Quiz of Day today, Chemistry Test today, Maths Mock tomorrow, Physics Assignment in 3 days, completed English Quiz yesterday)
- Built /api/schedule (GET scoped list, POST create) + /api/schedule/[id] (PATCH status, DELETE) with role-based scoping
- Built ScheduleTab: live countdown card (ticking d/h/m/s) to next item, alert rows for live/soon items, upcoming + past timetable, type-colored rows, manager actions (Start now/Complete/Cancel/Delete), create dialog with 4 type cards + date/time pickers
- Wired Schedule & Alerts into nav for ALL roles; students get read-only view (no create button), teachers/admins can create/manage
- Verified with Agent Browser: countdown ticking (09h 14m 02s to Maths Mock), Upcoming(3)/Past(3), API create works, student read-only confirmed, themed header/footer rendering

Stage Summary:
- Repo live at github.com/MbazaCodes/Tanzania-Student-Exams (2 commits: initial + theme/schedule feature)
- New navy/green/gold Tanzanian theme applied across the whole app
- Schedule & Timetable feature complete: live countdown timer, alert badges, 4 item types (quiz_of_day/exam/test/assignment), create/manage workflow, role-based access
- Note: dev server is flaky in this sandbox (background processes get reaped between tool calls) — verified via combined start+check commands; all features confirmed working
