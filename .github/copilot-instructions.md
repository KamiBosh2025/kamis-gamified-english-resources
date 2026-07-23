# Copilot Instructions — Kami's Gamified English Resources

## Project purpose

This is a multi-page English teaching resource catalogue and the capstone project for SoftUni's “Software Technologies with AI” course. Preserve its practical classroom purpose and its friendly purple visual identity.

## Architecture

- Use semantic HTML, Bootstrap 5, custom CSS and vanilla JavaScript only.
- Use Vite for development and production builds.
- Keep every screen in a separate root-level HTML file.
- Keep page logic in focused ES modules under `src/`.
- Use `src/supabase.js` as the single Supabase client.
- Use Supabase Auth, PostgreSQL, Row-Level Security and Storage.
- Never place service-role keys, passwords or other secrets in frontend code.

## Roles and permissions

- `normal` users may view public resources and manage only their own profile and favorites.
- `admin` users may create, update and delete resources and resource media.
- Every authorization rule must be enforced by Supabase RLS, not only by hidden buttons.
- New registrations receive the `normal` role through a database trigger.

## Development rules

- Make one coherent change at a time and test it before committing.
- Run `npm run build` before every successful commit.
- Keep all root HTML pages included in the Vite multi-page build.
- Preserve working resource links and descriptive educational content.
- Use text-safe DOM APIs for database content; avoid injecting untrusted HTML.
- Keep desktop and mobile layouts responsive.
- Update README and migrations whenever architecture or database schema changes.
