# Decision Making — Frontend (React + Vite + Tailwind)

React 18 SPA that pairs three Power BI dashboards with a multi-agent AI
chatbot, an approval-based ticket workflow (typed or recorded as a voice
note), a live notifications/activity feed, and a Customer-360 panel.

> **Roles:** the `company` role is shown throughout the UI as
> **Executive_Team** (via `src/utils/roles.js`); the stored role value stays
> `company`. Executive_Team users share the admin approvals workflow and
> support tooling (audio decryption stays admin-only).
>
> **Branding:** the Tailwind `brand` palette is locked to the Gijima logo
> blue, and the logo is the official Gijima wordmark (`components/layout/Logo.jsx`).

## Setup

```bash
cd Frontend
npm install
copy .env.example .env       # then edit if needed
npm run dev
```

Open <http://localhost:5173>.

Production build: `npm run build` (output in `dist/`, ~290 KB gzipped JS).

## Environment

```env
VITE_API_URL=http://localhost:8000        # FastAPI base URL

# Optional Power BI "Publish to web" fallback URLs — only used when the
# backend's service-principal embed endpoint isn't configured.
VITE_PBI_EXECUTIVE_URL=https://app.powerbi.com/view?r=...
VITE_PBI_OPERATIONS_URL=https://app.powerbi.com/view?r=...
VITE_PBI_ANALYTICS_URL=https://app.powerbi.com/view?r=...
```

## Pages

| Route                                | Who can see it                                | What it does                                                                              |
|--------------------------------------|-----------------------------------------------|-------------------------------------------------------------------------------------------|
| `/`                                  | anyone                                        | Landing page                                                                              |
| `/login`, `/register`                | anyone                                        | Auth                                                                                      |
| `/forgot-password`, `/reset-password`| anyone                                        | One-time token flow                                                                       |
| `/verify-email`                      | anyone with a token                           | Email verification                                                                        |
| `/app`                               | admin · Executive_Team · clients with a group | **Overview** — live ticket KPIs (Health · Users · Open · Approved · Rejected · Closed) that link straight to the filtered Approvals view, live Activity feed, recent tickets |
| `/app/dashboards/executive`          | admin · Executive_Team · clients in `client_a`| **Executive Sales Overview** (Revenue)                                                     |
| `/app/dashboards/operations`         | admin · Executive_Team · clients in `client_b`| **Operational Insights** (Orders)                                                          |
| `/app/dashboards/analytics`          | admin · Executive_Team · clients in `client_c`| **Customer Performance** (Quantity / AOV)                                                  |
| `/app/chatbot`                       | every signed-in user                          | **Multi-agent chatbot** — orchestrator picks the right agent by access. Chat history is not restored (each session starts fresh) |
| `/app/tickets`                       | every signed-in user                          | My tickets — create typed **or** voice-recorded. Clients see no recipient field; their tickets route to the reviewers |
| `/app/admin/tickets`                 | admin · Executive_Team                        | **Approvals** — approve / reject / close. Lifecycle `pending → approve/reject → close → closed`; deep-linkable via `?status=` |
| `/app/admin/users`                   | admin                                         | Update role, client group, status; profile pictures refresh live (15 s poll)               |
| `/app/support`, `/app/support/*`     | role-dependent                                | Support Connect — Teams channel requests, speaker-tagged live call transcription, encrypted recordings, Customer 360 |
| `/app/profile`                       | every signed-in user                          | Edit own profile + upload avatar                                                           |

Side-bar layout, the global `Cmd/Ctrl+K` palette, dark-mode tokens, and a
floating "Ask Me" chatbot button work on every authenticated page.

## Multi-agent chatbot

When the chatbot opens, the frontend calls `GET /api/chat/welcome` and
the backend's orchestrator returns the agent that owns the current user:

| Role / group           | Agent label             |
|------------------------|-------------------------|
| admin · Executive_Team | Master Agent            |
| client `client_group=client_a` | Executive Sales Agent |
| client `client_group=client_b` | Operations Agent      |
| client `client_group=client_c` | Performance Agent     |
| unassigned client      | (none — friendly message) |

The page header shows `AI Assistant · <agent label>`, the first bubble is
the agent's welcome message, and every subsequent question is routed by
the orchestrator. Chat is still persisted server-side, but **history is no
longer restored on mount** — each session starts fresh with just the
agent's welcome (re-enable by fetching `chatApi.history()` in `Chatbot.jsx`).

## Activity feed (Overview page)

The Activity card on `/app` reads the shared `NotificationsContext` (auto-
polls every 12 s and on tab focus) and renders icon-tinted rows for every
event in the system:

- Ticket created / approved / rejected / closed
- Profile picture updated / cleared
- Admin updated a user's access
- Support Connect request lifecycle + meeting scheduling
- (anything else `notification_service.push*` emits)

The list is wrapped in a slim, brand-tinted scroll surface (`activity-scroll`)
with a soft bottom fade so the user knows there's more below.

## Tickets — typed or recorded

The Create Ticket modal has a Type / Record-voice toggle. Recording uses
`MediaRecorder` + a live `webkitSpeechRecognition` preview; on submit the
audio is uploaded multipart, AES-256-GCM-encrypted on the backend, and
stored in SQL Server (`tickets.VoiceNotes`). On the recipient's row, a
"Play voice note" button streams the decrypted audio back inline.

## Support Connect — live calls & speaker-tagged transcripts

**Requesting support.** `/app/support` opens a request against a company-side
agent. The only live channel is **Microsoft Teams** (the phone-call channel
was removed); a company hotline number is still shown as an informational
fallback.

**Capturing the call.** From the **Support Live** dashboard
(`/app/support/dashboard`) an agent opens **Connect** on an accepted request.
The recorder uses `MediaRecorder` for audio plus `webkitSpeechRecognition`
for live transcription, and presents the transcript as a **Teams-style
dialogue**:

- The conversation is seeded with the two known, registered identities — the
  agent (current user) and the requester (by registered name / email).
- A **"Speaking now"** selector marks who is currently talking; each
  finalised speech segment (or a typed line) is recorded under that person,
  so the transcript switches names live. Extra participants can be added
  mid-call.
- Turns can be edited or deleted inline. On save the dialogue is serialised
  to `Name: text` lines, uploaded multipart, AES-256-GCM-encrypted server-side
  and stored in `support.Calls`.

**Reviewing recordings (Customer 360).** On `/app/support/customer/{id}` the
call-records column is visible to **admins and company agents**:

| Action          | Admin | Company agent |
|-----------------|:-----:|:-------------:|
| View transcript |  ✅   |      ✅       |
| Decrypt audio   |  ✅   |      ❌       |

The transcript opens in a dialogue viewer that colour-codes each speaker.
Audio decryption is admin-only and enforced on the backend
(`GET /api/support/calls/{id}/audio` → admin), not just hidden in the UI.

> **Speaker identification note.** The browser's Web Speech API transcribes a
> single local microphone and cannot auto-diarize multiple voices, so speaker
> attribution is **agent-driven** (the active-speaker selector) rather than
> fully automatic. Swapping in Azure Conversation Transcription for automatic
> diarization would be a backend change behind the same stored format.

## Power BI

The `PowerBIDashboard` component:

1. Calls `GET /api/powerbi/embed/{category}` — if the backend has a
   service principal configured, it returns a real Embed token and the
   report renders via `powerbi-client-react`.
2. Otherwise falls back to `VITE_PBI_{CATEGORY}_URL` from `.env`
   (Power BI "Publish to web" URL).
3. Otherwise shows a friendly placeholder; the Recharts visuals below
   still work because they read directly from the warehouse views.

## Stack

| Layer | Library |
|---|---|
| Framework         | React 18 + Vite 5                             |
| Routing           | React Router v6                                |
| Styling           | Tailwind CSS 3 + custom utility classes        |
| Charts            | Recharts                                       |
| Power BI embed    | `powerbi-client` + `powerbi-client-react`      |
| HTTP              | Axios (Bearer JWT interceptor in `services/api.js`) |
| Icons             | lucide-react                                   |
| State             | React Context (Auth, Notifications, Refresh, Toast) |
| Voice capture     | Native `MediaRecorder` + `webkitSpeechRecognition` |

## Folder layout

```
src/
├── App.jsx                         routes + protected layout
├── main.jsx                        entrypoint + context providers
├── components/
│   ├── FloatingAgent.jsx           "Ask Me" floating chatbot button
│   ├── NotificationBell.jsx        top-bar bell + dropdown
│   ├── PowerBIEmbed.jsx            service-principal or fallback embed
│   ├── ProtectedRoute.jsx          role / category guards
│   ├── SearchPalette.jsx           Cmd/Ctrl+K palette
│   ├── VoiceRecorder.jsx           MediaRecorder + Web Speech preview
│   ├── charts/                     reusable Recharts visuals
│   ├── layout/                     side-bar + topbar
│   └── ui/                         KPICard, Loader, PageHeader
├── pages/                          one file per route
├── context/                        AuthContext, NotificationsContext,
│                                   RefreshContext, ToastContext
├── services/api.js                 every Axios client (auth, dash, ticket,
│                                   support, chat, admin, notifications)
└── index.css                       Tailwind base + custom .activity-scroll
```

## Tests

The frontend doesn't ship a Jest/Vitest suite — coverage lives in the
backend's pytest suite (110 tests, including 18 multi-agent chatbot tests
and 5 activity-feed wiring tests that exercise the exact endpoints this
SPA consumes). The production build is the smoke test:

```bash
npx vite build
# ✓ 2470 modules transformed, ~290 KB gzip JS, build clean
```

For a fuller architecture overview, end-to-end test results, and the SQL
scripts that provision the warehouse, see the top-level
[`Requrements_Query/README.md`](../Requrements_Query/README.md).
