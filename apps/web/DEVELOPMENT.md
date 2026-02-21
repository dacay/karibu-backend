# Web Development Guide

This file provides guidance for developers and AI assistants working with the web app.

## Project Overview

Karibu Web is a Next.js App Router application with TypeScript and Tailwind CSS.

## Routing (Admin)

Admin sections use URL-based routing:
- `/` — Dashboard (default for admins)
- `/{section}` — e.g. `/dna`, `/team`, `/microlearnings`

`src/app/[section]/page.tsx` handles all section routes. It contains `ADMIN_ONLY_SECTIONS` — a set of section IDs that learners cannot access (they get redirected to `/`). Admins can access any route. **Update `ADMIN_ONLY_SECTIONS` whenever a new admin-only section is added.**
