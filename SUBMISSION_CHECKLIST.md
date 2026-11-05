# Submission Checklist

This checklist records the evidence required to verify the classroom survey application in a live deployment environment. The repository itself has been prepared and built locally, but the live Render + Supabase verification remains pending because no public URL or live database credentials were provided in this session.

## Required live evidence

### 1. Render deployment evidence

- [ ] Screenshot of the Render Static Site dashboard showing the live service is created
- [ ] Screenshot of the deployed site URL
- [ ] Screenshot showing the branch and build settings:
  - Build Command: `npm install && npm run build`
  - Publish Directory: `dist`
- [ ] Browser screenshot of the home page loading successfully at the Render URL
- [ ] Browser screenshot verifying direct navigation to an internal route such as `/dashboard` or `/s/<slug>` works without server errors

### 2. Supabase database evidence

- [ ] Screenshot of Supabase Project Settings > API showing the project URL and anon/public key
- [ ] Screenshot of Authentication > URL Configuration showing the production redirect settings
- [ ] Screenshot of Authentication > Users showing the instructor account used for login
- [ ] Screenshot of the SQL editor with the migration files applied successfully
- [ ] Screenshot of the `surveys` table showing survey records and status values
- [ ] Screenshot of the `responses` table showing submitted responses
- [ ] Screenshot of the `answers` table showing per-question answer records

### 3. App workflow evidence

- [ ] Screenshot of instructor login success
- [ ] Screenshot of the dashboard with at least one survey in draft, active, or closed status
- [ ] Screenshot of the survey editor after adding questions and choices
- [ ] Screenshot of activation and QR display page showing the public URL and QR code
- [ ] Screenshot of the public student survey page with questions loaded
- [ ] Screenshot of successful anonymous submission confirmation
- [ ] Screenshot of the results dashboard with aggregate totals and charts
- [ ] Screenshot of the CSV export download action and a saved CSV file opened in a spreadsheet tool

## Required URLs

- [ ] Render public URL for the frontend
- [ ] Supabase project URL
- [ ] Local development URL for testing, such as `http://localhost:5173`
- [ ] Public survey URL generated from the active survey: `https://<render-url>/s/<slug>`

## Remaining manual evidence still required

- [ ] Confirm the app works with real instructor login against Supabase Auth
- [ ] Confirm the live Render URL is reachable and the app loads successfully in a browser
- [ ] Confirm the public `/s/:slug` page loads from the deployed Render domain
- [ ] Confirm the QR code uses the production Render origin, not a localhost origin
- [ ] Confirm a second browser or anonymous session can submit responses without login
- [ ] Confirm duplicate submissions are rejected by the live duplicate-prevention logic
- [ ] Confirm instructor results reflect database-backed totals, not only local fallback state
- [ ] Confirm the exported CSV file opens correctly in Excel or Google Sheets

## Final status

The live deployment verification remains incomplete until a real Render deployment and Supabase project are configured and the manual evidence above is collected.
