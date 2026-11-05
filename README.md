# Classroom Survey App

A React + TypeScript + Vite application for managing classroom surveys with a Supabase-hosted database and auth service. The frontend is designed for deployment as a Render Static Site, while Supabase remains the separate database and authentication backend.

## Requirements

- Node.js 18+ recommended
- npm
- A Supabase project
- A Render account connected to GitHub

## Local development setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create a local environment file from the sample:

```bash
cp .env.example .env
```

4. Fill in your local Supabase values in `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=http://localhost:5173
```

5. Start the app locally:

```bash
npm run dev -- --host 0.0.0.0
```

The app will run on the Vite default port, typically `http://localhost:5173`.

## Production build check

Run the production build to verify the static bundle is generated:

```bash
npm run build
```

This must create a `dist` directory with the built frontend assets.

## Render deployment (Static Site)

This app should be deployed as a Render Static Site, not as a Node/Express server.

### GitHub integration

1. Push this repository to GitHub.
2. Sign in to Render.
3. Click New + and choose Static Site.
4. Connect the GitHub repository.
5. Select the correct repository and branch.
6. Set the build command:

```bash
npm install && npm run build
```

7. Set the publish directory:

```bash
dist
```

8. Add the following environment variables in the Render dashboard:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_APP_URL=https://<your-render-site-domain>
```

9. Save and deploy.

### SPA route handling

Render must be configured to rewrite all unmatched routes to `/index.html` so React Router works when a user directly opens or refreshes a route such as `/dashboard`, `/surveys/123/edit`, or `/s/my-survey-slug`.

This repository includes a `render.yaml` file with the route rewrite configured for a static site.

If you configure the site manually in the Render dashboard instead of using the file, use:

- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Route rewrite: `/* -> /index.html`

## Supabase setup

This frontend expects Supabase to be configured as a separate hosted service.

### 1. Create a Supabase project

1. Go to https://supabase.com and create a project.
2. Copy the Project URL and anon/public key from Project Settings > API.
3. Put them in the environment variables listed above.

Do not commit secrets. Keep actual values in Render environment variables or local `.env` files only. Do not add service-role keys to the frontend or to the Git repository.

### 2. Run the database migrations

In the Supabase SQL editor, apply the migrations in this order:

```sql
supabase/migrations/202611050001_initial_schema.sql
supabase/migrations/202611050002_row_level_security.sql
supabase/migrations/202611050003_survey_apis.sql
```

If using the Supabase CLI, run:

```bash
supabase db push
```

### 3. Configure Supabase Auth

In Supabase dashboard:

1. Open Authentication > Providers
2. Enable Email authentication
3. Open Authentication > URL Configuration
4. Set the Site URL to the local development URL and production Render URL as needed

Recommended settings:

```text
Site URL: http://localhost:5173
Additional Redirect URLs:
http://localhost:5173/**
https://<your-render-site-domain>
https://<your-render-site-domain>/**
```

For production, the redirect URL must include the actual Render domain. For the app’s QR/public survey links, set `VITE_APP_URL` to the live public Render URL so generated links point to the correct origin.

## Security notes

- Never commit `.env` files or real credentials.
- Never expose Supabase service-role keys in the frontend.
- Keep RLS enabled and validated in Supabase.
- Anonymous users must only be allowed to view active public survey data and submit responses via the approved RPC path.
- Instructor-only pages and result data must remain protected behind authenticated Supabase sessions.

## Deployment verification checklist

Before claiming the app is live:

1. Confirm the Render site builds successfully with `npm install && npm run build`.
2. Confirm the published directory is `dist`.
3. Confirm the SPA rewrite is active.
4. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present in Render.
5. Confirm `VITE_APP_URL` matches the live Render URL used for generated QR codes and public links.
6. Check the live URL in a browser and verify the frontend loads without server errors.
7. Verify the Supabase Auth redirect settings include the production URL.
8. Verify the app works after direct navigation/refresh to an internal route.

This project is not considered deployed until a live Render URL has been created and verified in the browser.
