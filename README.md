# ExamHub Tanzania 🎓

Tanzania's digital exam platform — NECTA past papers, online quizzes, per-question timers, OCR upload, book library.

**Stack:** Vite 6 · React 19 · TypeScript · Supabase · Tailwind v4

## Quick Start

```powershell
git clone https://github.com/MbazaCodes/Tanzania-Student-Exams.git
cd Tanzania-Student-Exams

# Create .env (once)
@"
VITE_SUPABASE_URL=https://pdyjpkgjiakvlqqcicjj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
"@ | Out-File -Encoding UTF8 .env

npm install
npm run dev
```

Or run the setup script: `.\Setup-ExamHub.ps1`

## Supabase Setup (run once in SQL Editor)

1. `supabase/001_schema.sql` — tables + RLS
2. `supabase/002_storage.sql` — file storage bucket
3. `supabase/003_functions.sql` — DB functions + views
4. `supabase/004_features.sql` — verification, library, admin grant

## Project Structure

```
Tanzania-Student-Exams/
├── src/
│   ├── components/examhub/tabs/   # All tab views
│   ├── lib/                       # api.ts, types.ts, store.ts, ocr.ts
│   └── pages/                     # LandingPage, AuthPage, ProfilePage
├── supabase/                      # SQL migrations (run in order)
├── public/                        # Images (coat of arms, hero, favicon)
├── index.html
├── vite.config.ts
└── .env                           # NOT committed — create manually
```
