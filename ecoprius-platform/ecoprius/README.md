# ECOPRIUS — Energy Systems Operations Center

Engineering & analytics platform for the energy transition.
Three-level application:

- **Level 1** — Platform homepage (project selector) at `/`
- **Level 2** — H2 HUB project view at `/h2hub` with 4 dashboards
- **Level 3** — Individual dashboards at `/h2hub/<slug>` (auth-protected)

Built as pure static HTML/CSS/JS for **Azure Static Web Apps** with
**Microsoft Entra ID** authentication. No frameworks, no build step.

## Repo layout

```
ecoprius/
├── index.html                     # Level 1 — platform homepage
├── h2hub.html                     # Level 2 — H2 HUB project view
├── dashboard.html                 # Level 3 — dashboard shell (dynamic)
├── project.html                   # Shared placeholder for other programmes
├── 404.html                       # Not-found page
│
├── assets/
│   ├── styles.css                 # Single stylesheet — control-room theme
│   ├── app.js                     # Vanilla JS router + utilities
│   └── favicon.svg                # Brand mark
│
├── staticwebapp.config.json       # Azure SWA routing + auth config
│
└── .github/
    └── workflows/
        └── azure-static-web-apps.yml   # CI/CD pipeline
```

## Route table

| Path                         | File              | Auth required |
| ---------------------------- | ----------------- | :-----------: |
| `/`                          | `index.html`      | No            |
| `/h2hub`                     | `h2hub.html`      | No            |
| `/h2hub/economy-engineering` | `dashboard.html`  | **Yes**       |
| `/h2hub/intelligence`        | `dashboard.html`  | **Yes**       |
| `/h2hub/decarbonization`     | `dashboard.html`  | **Yes**       |
| `/h2hub/co2`                 | `dashboard.html`  | **Yes**       |
| `/power-grid`                | `project.html`    | No            |
| `/carbon-loop`               | `project.html`    | No            |
| `/green-steel`               | `project.html`    | No            |
| `/rare-metals`               | `project.html`    | No            |
| `/e-fuels`                   | `project.html`    | No            |
| `/login` / `/logout`         | redirects to `/.auth/...` |   —    |

Any other path falls through `navigationFallback` to `index.html`. The
client-side router in `assets/app.js` handles slug parsing (e.g.
`/h2hub/co2` → title & description injected into `dashboard.html`).

## Deploying to GitHub → Azure Static Web Apps

Full workflow from zero to live URL:

### 1. Push this repo to GitHub

```bash
cd ecoprius
git init
git add .
git commit -m "Initial commit: ECOPRIUS operations center"
git branch -M main
git remote add origin git@github.com:<your-org>/ecoprius.git
git push -u origin main
```

### 2. Create the Azure Static Web App

In the Azure portal → **Create resource** → **Static Web App**:

- **Plan:** Standard (required for Entra ID auth & custom auth config)
- **Source:** GitHub
- **Organization / Repository / Branch:** point at the repo you just pushed
- **Build presets:** **Custom**
- **App location:** `/`
- **API location:** (leave blank)
- **Output location:** (leave blank)

Azure will auto-commit a workflow file to `.github/workflows/`. **You can
delete the auto-generated one** — this repo already ships a hand-tuned
workflow at `.github/workflows/azure-static-web-apps.yml` which is simpler
and skips the Oryx build step (we're static, we don't need it).

When the Azure portal generates its workflow, it also adds a secret named
`AZURE_STATIC_WEB_APPS_API_TOKEN` to your GitHub repo. **Keep that secret**
— our workflow uses it too.

### 3. Configure Entra ID (Microsoft Entra) authentication

In the Azure AD → **App registrations** → **New registration**:

- **Supported account types:** your organisation (single-tenant)
- **Redirect URI:** `https://<your-swa>.azurestaticapps.net/.auth/login/aad/callback`

Note the **Application (client) ID** and create a **client secret** under
Certificates & secrets.

Then in your Static Web App → **Configuration** → **Application settings**
add two entries:

- `AAD_CLIENT_ID` = the Application (client) ID from the app registration
- `AAD_CLIENT_SECRET` = the client secret value

Finally edit `staticwebapp.config.json` and replace `<TENANT_ID>` with your
real Entra tenant ID. Commit & push. The next deployment picks it up.

### 4. Verify

- Hit `https://<your-swa>.azurestaticapps.net/` — you should see the
  control-wall landing page.
- Click **Enter H2 HUB** → `/h2hub` loads (no auth).
- Click one of the dashboards → you should be bounced to
  `/.auth/login/aad` and asked to sign in with your Entra account.
- After sign-in you land on the dashboard placeholder with your name
  visible in the topbar.

## Local development

```bash
# Plain static server — no auth flows, perfect for layout work
python3 -m http.server 8080

# With SWA CLI — simulates routing, auth, navigationFallback
npm install -g @azure/static-web-apps-cli
swa start . --run "http-server -p 8080"
```

Then open <http://localhost:8080>.

## Design system notes

- **Palette:** deep navy (`#030812`) → royal (`#0a2a5c`) → elevated
  cyan accents (`#22d3ee`), with amber (`#fbbf24`) and green (`#4ade80`)
  status colours.
- **Typography:** `IBM Plex Sans` for body, `IBM Plex Mono` for technical
  labels / IDs, `Crimson Pro` italic for display accents.
- **Hero language:** the "panorama control wall" combines a 3-panel
  layout (Map · Process · KPI) inspired by AVEVA Unified Operations
  Center / ADNOC Panorama.
- All colour tokens are CSS custom properties in `assets/styles.css` — if
  the main `ecoprius.com` Joomla site wants to share the language, copy
  the `:root {}` block.

## What's next

The existing `dashboard.html` is a placeholder — real dashboards will
likely be embedded from Power BI / Tableau / a custom React app. To
integrate:

1. Host the dashboard app separately (Azure App Service, Container Apps,
   or a different SWA).
2. In `dashboard.html`, replace the `.dash-frame` block with an
   `<iframe src="https://<dashboard-host>/...">` — the outer chrome
   (topbar / breadcrumb / footer) stays the same.
3. Optionally forward the Entra token to the embedded app via the
   `X-MS-CLIENT-PRINCIPAL` header that SWA adds automatically.
