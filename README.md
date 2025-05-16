# OakTree Learning Chat Application

A Next.js application that allows students to chat with Oakie, an AI assistant that helps them reinforce their learning by asking them to explain concepts in their own words.

## Features

- Chat interface for students to interact with Oakie
- Lesson-based materials are used to provide context for the AI
- Session-based chat history
- Responsive UI with loading states

## Requirements

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account for database

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
   or
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

4. Set up your Supabase database with the following tables:
   - `lessons`
   - `materials`
   - `chat_sessions`
   - `chat_messages`
   - `students`
   - `courses`

5. Run the development server:
   ```bash
   pnpm dev
   ```
   or
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

The application relies on the following schema:

```sql
-- Teachers
create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  created_at timestamp with time zone default now() not null
);

-- Students
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  created_at timestamp with time zone default now() not null
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  teacher_id uuid references teachers(id) not null,
  created_at timestamp with time zone default now() not null
);

-- Lessons
create table lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id) not null,
  title text not null,
  week_number integer not null,
  lesson_number integer not null,
  topic text not null,
  created_at timestamp with time zone default now() not null
);

-- Materials
create table materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references lessons(id) not null,
  title text not null,
  content_type text not null,
  content text,
  file_url text,
  ai_summary text,
  key_concepts jsonb,
  created_at timestamp with time zone default now() not null
);

-- Chat Sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) not null,
  lesson_id uuid references lessons(id) not null,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  understanding_level integer,
  strengths jsonb,
  misunderstandings jsonb,
  summary text,
  created_at timestamp with time zone default now() not null
);

-- Chat Messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) not null,
  sender_type text not null check (sender_type in ('ai', 'student')),
  content text not null,
  timestamp timestamp with time zone default now() not null
);
```

## Tech Stack

- Next.js
- TypeScript
- Supabase (PostgreSQL)
- AI SDK with OpenAI
- Tailwind CSS
- Radix UI Components

## License

MIT 