# Tanzania Student Exams 🇹🇿

A national digital exam-preparation platform for Tanzania — NECTA past papers, live exams & quizzes, auto-marking, teacher review, and a scheduled timetable with countdown timers and alerts.

Built with **Next.js 16 + TypeScript + Prisma + Tailwind CSS + shadcn/ui**.

## Features

### Papers Library
- Upload past papers (NECTA, mock, regional, school exams)
- Draft → Published → Archived lifecycle
- Filter by subject, level, status; full-text search
- Build an exam directly from any uploaded paper

### Exams & Quizzes
- Create exams with 4 question types: **MCQ, True/False, Short answer, Essay**
- Publish to students; students take exams with a live countdown timer (auto-submit on timeout)
- **Auto-marking** for objective questions (MCQ / True-False / Short)
- Teacher **review & override** for essays with per-question feedback
- **Publish results** to students with grades (A–F)

### Schedule & Timetable
- Schedule **Quiz of the Day**, exams, tests, and assignments
- Live **countdown timer** to the next scheduled item
- **Alert badges** — "Starts soon", "Live now", "Overdue"
- Role-based: teachers/schools/admins create; students view

### Roles
- **Student** — take exams, view results, follow timetable
- **Teacher** — upload papers, create exams, review submissions, schedule items
- **School Admin** — everything a teacher can do, scoped to their school
- **Super Admin** — platform-wide oversight & management

## Quick Start

```bash
bun install
cp .env.example .env        # set DATABASE_URL
bun run db:push             # create SQLite schema
bun run dev                 # http://localhost:3000
```

Demo data is seeded automatically on first load (5 users across 4 roles, a school, sample papers, exams, and a scheduled timetable). Use the **role switcher** in the header to experience each perspective, or click **Reset demo** to reseed.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM (SQLite) |
| State | Zustand |
| Icons | lucide-react |
| Toasts | sonner |

## Developer

David Mbazza — [@MbazaCodes](https://github.com/MbazaCodes)
