# Dr. Munot's Orthopaedic Care Hospital - Frontend (React + Vite + TypeScript)

Public hospital website + role dashboards (Patient, Reception, Doctor, Admin) for the Spring Boot backend in
`dr-munot-orthopaedic-care-backend`. The backend README has the full setup, API list, demo credentials and verification status.

## Features
- **Public site:** Home, About, Doctor profile, Services, Facilities, Why choose us, Testimonials, Health tips (+ article pages), Contact, Online booking, Patient login/register.
  Hospital name, address, phones, hours, doctor details and services are loaded from the backend (Admin > Settings / Doctors / Services).
  Unset values show visible `[placeholder]` text instead of invented facts. Facilities, why-choose-us, testimonials and health tips are edited by the admin in **Admin > Website content** (no code changes). Doctor photo: Admin > Doctors.
- **Patient portal:** book / reschedule / cancel, follow-ups, prescriptions + PDF, reports (view/download), bills + invoice PDF, notifications.
- **Reception:** today's appointments, check-in -> token, live queue, patient search/registration, walk-in booking, billing and payments, report upload, doctor availability.
- **Medical documents** (doctor): 4 document forms, preview, draft / issue / revise, history, content-only print on pre-printed letterhead (A4, mm margins, alignment test sheet).
- **Messages**: shared Doctor <-> Reception chat with unread badge, auto-refresh, delete-own.
- **Reports** page (day / week / month, charts, CSV, print) for Admin and Doctor; **View bill** (itemised) plus Download; dashboard navbar with a **Home** link and a role badge.
- **Large doctor portrait and clinic photo gallery** (click to enlarge, arrow keys, Esc) managed in Admin > Doctors and Admin > Clinic photos.
- **Marathi / Hindi prescriptions:** doctor clicks मराठी / हिन्दी, text is translated and editable, saved, shown to the patient and printed (browser print view = correct Devanagari rendering; use *Save as PDF* in the print dialog).
- **Doctor:** billing, report upload, waiting queue and "Call in", consultation (symptoms, examination, diagnoses, medicines, tests, advice), follow-up (none/3/7/15/30/custom), prescription PDF, patient search and full history.
- **Admin:** analytics charts, doctors (fees, slots, weekly hours, breaks, leave), receptionists/users, patients, services/departments, hospital settings, audit log.
- UI: light medical theme (teal/blue), responsive, keyboard accessible dialogs, loading / empty / error states, toasts, confirmation dialogs, subtle Framer Motion animation (respects reduced-motion).

## Tech stack
React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router, Axios, React Hook Form + Zod, Framer Motion, Lucide React, Recharts.

## Setup
```bash
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:8080/api
npm install
npm run dev              # http://localhost:5173
```
Start the backend first (with `SEED_DEMO=true` for demo logins, see backend README).

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL **including `/api`** (default `http://localhost:8080/api`) |

## Tests
```bash
npm test      # Vitest + Testing Library, 84 UI tests with a mocked API
```

## Build
```bash
npm run build      # type-check + production bundle in dist/
npm run preview    # serve dist/ locally
```

## Deployment
Serve `dist/` from any static host (nginx, Netlify, Vercel, S3+CloudFront, Cloudflare Pages).
- It is a single-page app: route unknown paths to `index.html` (`public/_redirects` for Netlify/Cloudflare; `nginx.conf.example` for nginx).
- Set `VITE_API_BASE_URL` at **build** time to your HTTPS API URL, and add the site's origin to the backend `CORS_ALLOWED_ORIGINS`.
- Route guards in the UI are only a convenience. All authorization is enforced by the backend on every request.

## Customising content
- Contact details / hospital info: Admin > Settings. Doctor: Admin > Doctors. Services: Admin > Services.
- Marketing content: Admin > Website content. Doctor photo: Admin > Doctors.
- Colours: `--color-brand-*` in `src/index.css`.

## Verification status
`npm run build` (TypeScript strict + Vite production build) **passes** and `npm test` runs 84 UI tests (all pass). A script cross-checked all 83 API calls made by the UI against the backend controller mappings
(method + path): all match. The UI has **not** been exercised against a running backend or in real browsers/devices in the generation environment -
please click through each role once (checklist in the backend README) and check mobile layouts.
