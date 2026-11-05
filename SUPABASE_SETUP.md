# Supabase Database Setup

This repository includes the migration files needed to create the survey schema in a Supabase PostgreSQL project.

Important: do not commit actual credentials. Copy `.env.example` to `.env` and fill in real values only in your local environment or deployment secret store.

## 1) Create a Supabase project

1. Go to https://supabase.com and create a new project.
2. Choose a project name such as `classroom-survey`.
3. Create a new Postgres database and note the project URL and anon key.
4. In the Supabase dashboard, open Project Settings > API.
5. Copy:
   - Project URL
   - anon/public key
6. Create a local `.env` from `.env.example`:

```bash
cp .env.example .env
```

Then update `.env` with real values:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_URL=http://localhost:5173
```

Do not put service-role keys in the frontend or commit them to Git.

## 2) Apply the database migrations

Use the Supabase SQL editor or the SQL migration tool to run the files in order.

Run these in the Supabase SQL editor in this exact order:

1. `supabase/migrations/202611050001_initial_schema.sql`
2. `supabase/migrations/202611050002_row_level_security.sql`
3. `supabase/migrations/202611050003_survey_apis.sql`

If you use the Supabase CLI locally, run:

```bash
supabase db push
```

If you use the dashboard SQL editor, paste each file separately and execute it.

## 3) Configure Supabase Auth for the instructor

1. In the Supabase dashboard, open Authentication > Providers.
2. Enable Email authentication.
3. Open Authentication > Users.
4. Create an instructor account with a real email and password.
5. Confirm the user is added successfully.
6. Sign in through the app using that instructor email/password.

The app should only allow instructor-only features when the user is authenticated. Anonymous users must not be able to read results, and the public survey route should only read active survey metadata.

## 4) Verify that RLS is correctly enforced

These checks should be run after the SQL is applied and the app is configured.

### A. Anonymous users can read only active surveys and active survey questions/choices

Run these as an anonymous session / public role in the SQL editor:

```sql
select * from public.surveys where status = 'active';
select * from public.questions q
join public.surveys s on s.id = q.survey_id
where s.status = 'active';

select * from public.choices c
join public.questions q on q.id = c.question_id
join public.surveys s on s.id = q.survey_id
where s.status = 'active';
```

The anonymous role must not be able to select from:

```sql
select * from public.responses;
select * from public.answers;
```

Those queries should fail because no public select policy exists for those tables.

### B. Instructor can access everything

Sign in as the instructor account in the app, or execute a logged-in session in Supabase Studio.

Then these should work:

```sql
select * from public.surveys;
select * from public.questions;
select * from public.choices;
select * from public.responses;
select * from public.answers;
```

### C. Activate only one active survey

```sql
select public.activate_survey('<survey-id-1>'::uuid, 'survey-1');
select public.activate_survey('<survey-id-2>'::uuid, 'survey-2');
```

Expected behavior:
- the previously active survey becomes `closed`
- the selected survey becomes `active`
- there is never more than one row with `status = 'active'`

### D. Prevent duplicate anonymous submissions

Use the same browser token for a survey twice:

```sql
select public.submit_survey_response(
  '<survey-id>'::uuid,
  'browser-token-123',
  '[{"question_id":"<q1>","choice_id":"<c1>"},{"question_id":"<q2>","choice_id":"<c2>"}]'
::jsonb
);

select public.submit_survey_response(
  '<survey-id>'::uuid,
  'browser-token-123',
  '[{"question_id":"<q1>","choice_id":"<c1>"},{"question_id":"<q2>","choice_id":"<c2>"}]'
::jsonb
);
```

The second call should raise an exception and fail.

## 5) Security rules to keep

- Do not expose a service-role key in the app or `.env`.
- Do not disable RLS to make features work.
- Use the anon key only for the public survey page and the public RPC submission function.
- Use the authenticated role only for instructor access.
- Keep `responses` and `answers` inaccessible to anonymous public reads.

## 6) Expected final state

After the migrations are applied correctly, the app should be able to:

- allow instructors to create and manage surveys
- activate exactly one survey at a time
- let anonymous users read only active survey questions and answer choices
- let anonymous users submit validated survey responses through the RPC function
- prevent duplicate anonymous submissions
- let authenticated instructors view and export results

This repository was not connected to a real Supabase project in this environment, so the SQL files were prepared and documented here but they were not executed against a live Supabase instance during this session.
