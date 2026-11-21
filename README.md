# Beyond Consulting Command Center

A private consulting workspace built with Next.js, TypeScript, Tailwind CSS, Supabase PostgreSQL, and Supabase Auth. The database starts empty. Keep patient information and PHI out of all records and notes.

## Run locally on Windows

1. In a regular PowerShell window, check `node --version`, `npm.cmd --version`, and `git --version`. Use Node.js 22 or newer. If npm is missing outside Codex, install Node.js LTS from [nodejs.org](https://nodejs.org/en/download) and reopen PowerShell. The Codex runtime may have its own Node and Git that are unavailable in your regular terminal.
2. Open this project folder in PowerShell. Run `npm.cmd ci` and `Copy-Item .env.example .env.local`. If a lockfile is absent, use `npm.cmd install` to generate one.
3. Create a fresh **development** project in [Supabase](https://supabase.com/dashboard). In SQL Editor, run [the initial migration](supabase/migrations/202611210001_initial.sql) once against that empty project.
4. In Authentication settings, disable **Allow new users to sign up** and keep email/password authentication enabled. Under **Users**, create your own email/password account and confirm the email using the admin UI. Copy that user's UUID. Replace the UUID placeholder in the following statement and run it once in SQL Editor.

   ```sql
   insert into public.users (id) values ('REPLACE-WITH-YOUR-AUTH-USER-UUID');
   ```

5. In `.env.local`, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the project's URL and publishable key from Supabase **Connect** or **API Keys**. Leave `APP_URL=http://127.0.0.1:3000` for local use. The publishable key is designed for client use and relies on RLS. Keep database passwords, secret keys, SMTP credentials, and account passwords out of source control and chat.
6. Set the Supabase Authentication **Site URL** to `http://127.0.0.1:3000` and add `http://127.0.0.1:3000/auth/confirm` to the redirect allowlist. Use that same hostname in the browser.
7. In Authentication **Email Templates → Reset Password**, set the recovery link to use the token hash. Use this body or include its link in your existing recovery template:

   ```html
   <p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}">Reset your Command Center password</a></p>
   ```

   See [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Supabase's default SMTP service is rate-limited and restricts recipient addresses to project team members. Use a verified custom SMTP provider for production recovery emails.
8. Run `npm.cmd run dev` and open [the local dashboard](http://127.0.0.1:3000). Stop the server with Ctrl+C. Run `npm.cmd run check` and `npm.cmd run build` to check a clean build.

## Milestone acceptance checks

Use fictitious consulting records in the development project.

- Visit the dashboard signed out, verify it redirects to login, and verify that the allowlisted owner can sign in. Verify an admin-created second account without the profile row cannot sign in to the workspace or read its data. Verify signup is disabled in the development project's Auth settings.
- Add a client and its first project in one save. Add a second project from the client detail, then edit a project and verify its fields. Archive the client and check that both projects remain linked under Historical Clients. Restore it, then try historical search, year, priority, and project status filters.
- Create an action item due yesterday with an associated client and project. Verify Overdue and Open counters, filters, search, due-date sorting, table and Kanban views, and the project detail list. Complete it from the dashboard and verify its completed date and activity entry. Reopen it and verify the completion timestamp clears. Archive and restore it.
- Reload and sign out and back in to verify persistent records. Check client and project deletion with a disposable record. Linked actions should survive with associations to deleted records cleared.
- Request a password reset, open the email, set a new password, and sign in again. Verify the same recovery link cannot be reused.
- Check the mobile layout and switch themes. On the eventual HTTPS URL, verify Edge and Chrome install affordances and Safari's Share → Add to Home Screen on iPhone. Check that a cold offline launch displays the browser's network error and never serves stored workspace records.

The app computes due dates using the device's local calendar. Active Projects counts Active and At Risk projects whose clients are active. The public PWA manifest and icons carry no workspace data. The service worker uses the network for navigation and keeps no offline cache.

## Netlify Free deployment

1. Create a **private**, empty repository in [GitHub](https://github.com/new). This project has a local Git repository. Run git status --short to review the staged source and confirm that .env.local is absent. If there is no commit yet, configure your author identity and commit the staged files. Add the new GitHub URL as origin and push main.
2. Create a project on [Supabase Free](https://supabase.com/dashboard). Apply the migration, disable registration, and authorize your owner account as described above. Keep test and production records separate if you use both.
3. Sign into [Netlify](https://app.netlify.com/) on its Free plan. Scope the GitHub integration to this repository. Choose **Add new project → Import an existing project**. The checked-in netlify.toml supplies the Next.js build settings.
4. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and APP_URL in Netlify. Use the initial HTTPS netlify.app project URL for APP_URL. Add the same origin as Supabase's Site URL and append /auth/confirm for its exact redirect allowlist entry. Verify signed-out redirects, owner sign-in, saving, and password recovery on the temporary URL.
5. When the temporary deployment works, add dashboard.beyondconsultingfirm.com under Netlify's domain management. With approval, add only the exact dashboard DNS record Netlify gives you. Once TLS is ready, update APP_URL and the Supabase site and redirect URLs to the dashboard subdomain, redeploy, and retest. Verify both the dashboard and public site over HTTPS before adding an optional public footer link.

Netlify Free permits commercial use and has a hard cap of 300 credits per month. Supabase Free projects may pause after a week of inactivity. See [Netlify pricing](https://www.netlify.com/pricing/) and [Supabase pricing](https://supabase.com/pricing).

The initial schema keeps client, project, action item, and activity records separate. Stable record IDs and owner-scoped data give future integrations a place to attach without adding providers or permissions now.
