# FamilyConnect

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

An AI-powered genealogy and family history research platform built with React, TypeScript, and Google's Gemini AI API.

**View your app in AI Studio:** https://ai.studio/apps/drive/1ZQ9e4NS4qJt7xnFBGysMpYk5BD-BU4jP

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Security](#security)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (verified with Node 20)
- **pnpm 8+** (use `npm install -g pnpm` if needed)
- **Gemini API Key** (from [Google AI Studio](https://ai.google.dev/))

### Local Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and set:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Start development servers (client + backend proxy):**
   ```bash
   pnpm run dev
   ```
   - **Frontend:** http://localhost:3000 (Vite dev server)
   - **Backend:** http://localhost:5174 (Express proxy server)
   - Both start automatically; hot-reload enabled

4. **Alternative: Run frontend and backend separately:**
   ```bash
   # Terminal 1: Frontend
   pnpm run dev:client

   # Terminal 2: Backend proxy
   pnpm run dev:server
   ```

---

## 🏗️ Architecture

### System Design

FamilyConnect uses a **client-side proxy pattern** for secure AI integration:

```
┌─────────────────────────────────────────────────────┐
│                  Browser (React App)                │
│  • Family tree visualization (D3.js)               │
│  • Vault encryption (localStorage + AES-256)       │
│  • UI components (Tailwind CSS)                    │
│  • Services layer: calls /api/ai/* endpoints       │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────┐
│            Express.js Backend Proxy                 │
│  • Secure API key management (env var)             │
│  • 13 AI endpoint handlers                          │
│  • Security: helmet, rate-limiting, validation     │
│  • Logging & error handling middleware             │
│  • Google Gemini API calls (server-side only)      │
└─────────────────┬───────────────────────────────────┘
                   │
                   │ HTTPS
                   ▼
         ┌─────────────────────┐
         │  Gemini AI APIs     │
         │  (text, image,      │
         │   video, audio)     │
         └─────────────────────┘
```

**Key Security Principle:** The Gemini API key is **never exposed to the browser**. All AI calls are proxied through the backend server.

### Technology Stack

| Layer      | Technology                          | Purpose                           |
|------------|------------------------------------|-----------------------------------|
| **Frontend** | React 19, TypeScript, Vite         | UI, state management, bundling   |
| **Backend**  | Express.js, Node.js               | API proxy, secret management     |
| **AI**       | Google Gemini APIs                | Text, image, video, audio gen    |
| **DB**       | LocalStorage (encrypted AES-256)  | Client-side family data storage  |
| **Styling**  | Tailwind CSS                      | Utility-first responsive design  |
| **Viz**      | D3.js                             | Family tree & timeline graphs    |
| **Security** | helmet, express-rate-limit, Zod   | Headers, rate limits, validation |
| **Testing**  | Vitest, Playwright                | Unit & E2E testing               |
| **CI/CD**    | GitHub Actions                    | Automated build, test, deploy    |

### Project Structure

```
FamilyConnect/
├── components/              # React components (Dashboard, FamilyTree, etc.)
├── services/               # Client API layer (calls /api/ai/* endpoints)
├── utils/                  # Utilities (GEDCOM export, storage, crypto)
├── server/                 # Express backend proxy
│   ├── src/
│   │   ├── index.ts       # Main server, all 13 AI endpoints
│   │   ├── middleware.ts  # Logging & error handling
│   │   └── validation.ts  # Zod input validation schemas
│   └── package.json
├── e2e/                    # Playwright E2E tests
├── __tests__/              # Vitest unit tests
├── doc/                    # Documentation (architecture, roadmap)
├── Dockerfile              # Multi-stage build for production
├── docker-compose.yml      # Container orchestration
├── vite.config.ts          # Vite bundler config
├── tsconfig.json           # TypeScript config
├── .eslintrc.json          # Linting rules
├── .prettierrc              # Code formatting
├── .env.example            # Environment variable template
└── .gitignore              # Git ignore patterns
```

### Key Components

| Component | Purpose |
|-----------|---------|
| [App.tsx](App.tsx) | Root component: orchestrates views, vault, agent loop |
| [Dashboard.tsx](components/Dashboard.tsx) | Main UI: members, stats, quick actions |
| [FamilyTree.tsx](components/FamilyTree.tsx) | D3.js interactive tree visualization |
| [AIAssistant.tsx](components/AIAssistant.tsx) | Chat interface for ancestor personas |
| [EvidenceVault.tsx](components/EvidenceVault.tsx) | Encrypted family data storage |
| [AgentTerminal.tsx](components/AgentTerminal.tsx) | Autonomous AI reasoning interface |
| [Matches.tsx](components/Matches.tsx) | DNA/genealogy match display |

---

## 👨‍💻 Development

### Available Scripts

```bash
# Frontend only
pnpm run dev:client          # Start Vite dev server (port 3000)
pnpm run build:client        # Build production bundle
pnpm run preview             # Preview production build

# Backend only
cd server
pnpm run dev:server          # Start Express server (port 5174)
pnpm run build:server        # Build server (not needed; TS runs directly)

# Both (from root)
pnpm run dev                 # Concurrently start client + server
pnpm run build               # Build both client & server

# Testing
pnpm run test                # Run Vitest unit tests
pnpm run test:watch          # Run tests in watch mode
pnpm run test:e2e            # Run Playwright E2E tests
pnpm run test:e2e:ui         # Run Playwright with UI mode

# Code Quality
pnpm run lint                # ESLint check
pnpm run lint:fix            # ESLint fix
pnpm run format              # Prettier format
pnpm run type-check          # TypeScript strict check
```

### Development Workflow

1. **Write code** with hot-reload:
   ```bash
   pnpm run dev
   ```
   Changes auto-reload in browser (Vite HMR) and backend (nodemon in server/package.json).

2. **Type-check before committing:**
   ```bash
   pnpm run type-check
   ```

3. **Lint and format:**
   ```bash
   pnpm run lint:fix
   pnpm run format
   ```

4. **Run tests locally:**
   ```bash
   pnpm run test              # Unit tests (coverage: ~5% baseline)
   pnpm run test:e2e:ui       # E2E tests with UI (for debugging)
   ```

5. **Test production build:**
   ```bash
   pnpm run build && pnpm run preview
   ```

---

## 🐳 Deployment

### Docker

Build and run the application in a container:

```bash
# Build image
docker build -t familyconnect:latest .

# Run container
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key_here familyconnect:latest

# Or use docker-compose
docker-compose up
```

The [Dockerfile](Dockerfile) uses a **multi-stage build**:
1. **Builder stage:** Install deps, build both frontend and backend
2. **Production stage:** Alpine Node 20, run server with built frontend

Health check is enabled and hits `/health` endpoint every 10 seconds.

### Docker Compose

[docker-compose.yml](docker-compose.yml) includes:
- Port mapping: 3000 (frontend), 5174 (backend)
- Volume mounts for persistence
- Health checks
- Environment variable injection

```bash
docker-compose up -d          # Start in background
docker-compose logs -f        # Tail logs
docker-compose down           # Stop and remove containers
```

### GitHub Pages (Frontend Only)

The CI workflow automatically deploys the frontend to GitHub Pages on every push to `main`:

```bash
# Automatic deployment via .github/workflows/ci.yml
# Frontend available at: https://<username>.github.io/FamilyConnect
```

The backend must be deployed separately (Docker, Heroku, AWS, etc.).

### Recommended Deployment Platforms

| Platform | Best For | Setup |
|----------|----------|-------|
| **Docker** (local/private server) | Full control, self-hosted | `docker-compose up` |
| **Heroku** | Quick cloud deployment | `git push heroku main` + buildpack |
| **AWS ECS** | Scalable, enterprise | ECR + ECS task definition |
| **Google Cloud Run** | Serverless, cost-effective | `gcloud run deploy --source .` |
| **Railway, Render** | Simple cloud hosting | Git integration, auto-deploy |
| **GitHub Pages** | Frontend only | Automatic via CI (see Actions workflow) |

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` from [.env.example](.env.example):

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | ✅ Yes | — | Google Gemini API key (server-side only) |
| `NODE_ENV` | ❌ No | `development` | Environment: `development`, `production` |
| `PORT` | ❌ No | `5174` | Backend server port |
| `VITE_API_URL` | ❌ No | `http://localhost:5174` | Backend API URL (for frontend) |

**Frontend .env mapping (via Vite):**
- `process.env.API_KEY` → set to empty string (not used; all calls go through `/api/*`)
- `process.env.NODE_ENV` → automatically set by Vite based on build mode

### Server Configuration

Backend runs on:
- **Dev:** `http://localhost:5174`
- **Production:** Port set via `PORT` env var (default 5174)

Adjust rate limiting (100 requests per 15 minutes per IP) in [server/src/index.ts](server/src/index.ts):
```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // Max requests
});
```

---

## 🔒 Security

### Built-in Protections

| Feature | Library | Details |
|---------|---------|---------|
| **Security Headers** | `helmet` | HSTS, CSP, X-Frame-Options, etc. |
| **Rate Limiting** | `express-rate-limit` | 100 req/15min per IP on `/api/*` |
| **Input Validation** | `zod` | Request body validation schemas |
| **Vault Encryption** | `crypto-js` | AES-256 encryption for localStorage |
| **HTTPS Ready** | Express | TLS termination via reverse proxy (Nginx, load balancer) |
| **CORS Configured** | Express default | Allow same-origin requests only |

### Best Practices

1. **Never commit `.env.local`** — use `.env.example` for reference
2. **API key in backend only** — frontend never sees `GEMINI_API_KEY`
3. **HTTPS in production** — use a reverse proxy (Nginx, Cloudflare) for TLS
4. **Rotate API keys regularly** — implement key rotation policy
5. **Monitor rate limits** — watch `/health` endpoint and error logs
6. **Validate all inputs** — all endpoints run through Zod schemas (extensible to all endpoints)

### Known Limitations

- **No persistent database:** Family data stored in encrypted localStorage only (client-side)
- **No authentication:** Anyone with app access can unlock vault if they know the master key
- **No audit logging:** No centralized logging for compliance/forensics
- **Stateless server:** Each request is independent (no session management)

**Future improvements:** Add PostgreSQL backend, JWT auth, audit logging, key management service (KMS).

---

## 🧪 Testing

### Unit Tests (Vitest)

Run unit tests for utilities, services, and components:

```bash
pnpm run test              # Run once
pnpm run test:watch       # Watch mode (rerun on file change)
```

Currently includes:
- `__tests__/gemini.test.ts` → GEDCOM export utility test

Coverage baseline: ~5% (MVP phase; expand as needed).

### E2E Tests (Playwright)

Run end-to-end tests for critical user flows:

```bash
pnpm run test:e2e         # Run headless
pnpm run test:e2e:ui      # Run with browser UI (great for debugging)
pnpm run test:e2e:debug   # Playwright Inspector mode
```

Currently includes:
- Landing page load test
- Onboarding flow visibility test
- Vault unlock UI test

**Test Configuration:** [playwright.config.ts](playwright.config.ts)
- Base URL: `http://localhost:3000`
- Auto-starts dev server if not running
- Retries enabled in CI (2x), disabled in local dev

### Continuous Integration

GitHub Actions workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every push:

```yaml
Steps:
  1. Install dependencies
  2. Type-check (tsc --noEmit)
  3. Lint (eslint)
  4. Unit tests (vitest)
  5. Build frontend (vite build)
  6. Build check: bundle size warn if > 2MB
  7. Security audit (pnpm audit)
  8. Deploy frontend to GitHub Pages (if main branch)
```

**Badge:** Add to README after first successful workflow run:
```markdown
[![CI](https://github.com/<owner>/FamilyConnect/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/FamilyConnect/actions)
```

---

## 🐛 Troubleshooting

### Issue: `GEMINI_API_KEY` not found

**Solution:** Ensure `.env.local` file exists and contains:
```env
GEMINI_API_KEY=your_actual_key_here
```
Then restart dev server: `pnpm run dev`

### Issue: Backend not starting on port 5174

**Solution:** Port may be in use. Check with:
```bash
lsof -i :5174
# Kill process if needed:
kill -9 <PID>
```
Or set custom port: `PORT=5175 pnpm run dev`

### Issue: E2E tests timeout at 30s

**Solution:** Ensure dev server is running:
```bash
pnpm run dev  # In separate terminal
pnpm run test:e2e  # In another terminal
```

Or increase timeout in [playwright.config.ts](playwright.config.ts):
```typescript
timeout: 60 * 1000,  // 60 seconds
```

### Issue: "Too many requests" error in production

**Solution:** Backend is rate-limited (100 req/15min per IP). Either:
1. Wait 15 minutes for limit to reset
2. Deploy multiple backend instances behind a load balancer
3. Increase rate limit in [server/src/index.ts](server/src/index.ts)

### Issue: Family data lost after refresh

**Solution:** This is expected with localStorage. The app encrypts data locally but doesn't persist to a database. To implement persistence:
1. Add PostgreSQL backend
2. Modify `services/*` to call new `/api/members/*` endpoints
3. Implement user authentication (JWT)

---

## 📚 Additional Resources

- [Architecture Deep Dive](doc/ARCHITECTURE.md) — System design, data flow, API endpoints
- [User Guide](doc/USER_GUIDE.md) — Feature walkthrough, keyboard shortcuts
- [Roadmap 2025](doc/ROADMAP_2025.md) — Planned features, research todos
- [API Documentation](doc/AIAgent.md) — Gemini AI integration details
- [Design System](doc/Designs.md) — UI components, Tailwind config

---

## 📄 License

[Add your license here — MIT, GPL, etc.]

## 🤝 Contributing

[Add contribution guidelines here]

---

**Built with ❤️ for family history researchers. Questions?** Open an issue or check the [docs](doc/) folder.
