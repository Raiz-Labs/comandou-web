# Technology Stack

**Analysis Date:** 2026-07-30

## Languages

**Primary:**
- TypeScript 5.9.2 - All source code, strict mode enabled
- SCSS - Styling with CSS variables and custom utilities

**Secondary:**
- HTML - Component templates (inline and template files)

## Runtime

**Environment:**
- Node.js 22 - For development and CI/CD (per `.github/workflows/ci.yml`)

**Package Manager:**
- npm 11.8.0 (specified in `package.json` packageManager field)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Angular 21.2.0 - Full frontend framework with standalone components required
  - `@angular/common` - Built-in directives and pipes
  - `@angular/compiler` - Template compilation
  - `@angular/core` - Core framework with Signals API
  - `@angular/forms` - Signal Forms (custom, NOT ReactiveFormsModule)
  - `@angular/platform-browser` - Browser runtime
  - `@angular/router` - Client-side routing with lazy loading

**State Management:**
- Angular Signals (native, no NgRx) - Global auth and local component state in `src/app/core/auth/auth.signal.ts`
- Computed signals for derived state
- Effect API for side effects

**Async Data Loading:**
- `resource()` API (Angular 21) - Query management with isLoading/error states
- RxJS 7.8.0 - Observables for HTTP and WebSocket streams

**HTTP:**
- HttpClient - All requests via `src/app/core/api/api.service.ts`
- Custom interceptors - `authInterceptor` for JWT attachment and refresh token handling
- Base URL from environment: `http://localhost:3000` (dev), `https://api.comandou.app.br` (prod)

**WebSocket:**
- Socket.io-client 4.8.3 - Real-time bidirectional communication
  - Singleton service: `src/app/core/socket/socket.service.ts`
  - Auto-connect on auth, auto-disconnect on logout
  - Reconnection with exponential backoff (1s–30s)
  - WebSocket transport only

## UI & Styling

**Component Library:**
- No external UI library (Material, PrimeNG, Tailwind banned)
- b-system design system tokens - Custom CSS variables in `src/assets/b-system/colors_and_type.css`
  - Primary color: `#D95C25` (via `var(--b-primary-500)`)
  - Background: `#FBF8F3` (via `var(--b-bg)`)
  - Built-in spacing, radius, shadow tokens

**Icons:**
- Lucide Angular 1.0.0 - SVG icon library
  - 60+ icons pre-imported in `src/app/app.config.ts`
  - Inline SVG with `<i data-lucide="name">` (width/height via CSS)

**Fonts:**
- Nunito - Loaded from Google Fonts CDN in `src/index.html`
  - Weights: 400, 500, 600, 700, 800

**Charts:**
- Chart.js 4.5.1 - Data visualization
- ng2-charts 10.0.0 - Angular wrapper for Chart.js

## Key Dependencies

**Critical:**
- `tslib` 2.3.0 - TypeScript helpers (required by Angular)
- `rxjs` 7.8.0 - Reactive streams (HTTP, WebSocket, async operations)

**Real-time:**
- `socket.io-client` 4.8.3 - WebSocket client for item/comanda updates from backend

**Data Visualization:**
- `chart.js` 4.5.1 - Chart rendering engine
- `ng2-charts` 10.0.0 - Angular bindings

## Development Tools

**Build:**
- `@angular/cli` 21.2.8 - Command-line interface
- `@angular/build` 21.2.8 - Build system (esbuild-based)
- `typescript-eslint` 8.59.1 - Linting and parsing

**Linting:**
- `eslint` 10.2.1 - Code quality and standards enforcement
- `@angular-eslint/eslint-plugin` 21.3.1 - Angular-specific rules
- `@angular-eslint/template-parser` 21.3.1 - HTML template parsing
- `@typescript-eslint/parser` 8.59.0 - TypeScript support
- Config: `eslint.config.js` (flat config format)

**Formatting:**
- `prettier` 3.8.1 - Code formatter (not explicitly configured in committed files)

**Testing:**
- `vitest` 4.0.8 - Unit test runner (fast, Vite-native)
- `jsdom` 28.0.0 - DOM simulation for tests
- Angular Test Builder - `@angular/build:unit-test`

**Type Checking:**
- `typescript-eslint` - Runtime type checks via ESLint
- CLI: `npm run typecheck` → `tsc --noEmit`

## Configuration

**Environment:**
- Multi-tenant SaaS - Tenant slug extracted from hostname (e.g., `restaurante.comandou.com.br` → `restaurante`)
  - Dev fallback: `burguer-test`
  - Env files: `src/environments/environment.ts` (dev) and `environment.prod.ts` (prod)
  - API URL injected at build time via environment replacement

**Build Configuration:**
- Angular config: `angular.json`
  - Inline styles: SCSS
  - Global styles: `src/styles/global.scss`
  - Assets from `public/` directory
  - Production budget: 500kB initial, 8kB per component

**TypeScript:**
- Strict mode enabled (all strict flags in `tsconfig.json`)
- Target: ES2022
- Module: preserve (for esbuild compatibility)
- `tsconfig.app.json` - Application config
- `tsconfig.spec.json` - Test config

## Platform Requirements

**Development:**
- Node.js 22+
- npm 11.8.0
- Modern browser with ES2022 support

**Production:**
- Deployment: Vercel (auto-deploy on push to main)
  - Build command: `ng build`
  - Output directory: `dist/comandou-web/browser`
  - SPA rewrites: all routes → `index.html`
  - HTTPS required

**Browser Support:**
- Modern browsers (ES2022 baseline)
- Chrome, Firefox, Safari, Edge (latest)
- Mobile browsers for PWA (iOS Safari 12+, Android Chrome)

## PWA Configuration

**Manifest:** `public/manifest.webmanifest`
- Name: "Comandou"
- Display: standalone (fullscreen app mode)
- Start URL: `/`
- Orientation: portrait
- Theme color: `#D95C25`
- Shortcuts: Mesas, Cozinha
- Icons: 192x192, 512x512 (maskable)

**Service Worker:**
- Angular CLI auto-generates in production
- Caching and offline support handled by Angular PWA module

## Deployment Pipeline

**CI/CD:**
- GitHub Actions (`.github/workflows/ci.yml`)
- Triggers: push to main, pull requests
- Steps:
  1. Checkout
  2. Setup Node 22, cache npm
  3. Install: `npm ci`
  4. Lint: `npm run lint`
  5. Typecheck: `npm run typecheck`
  6. Build: `npm run build`

**Production Build:**
- Run: `npm run build:prod` or `ng build --configuration production`
- Output: `dist/comandou-web/browser/`
- Optimizations: tree-shaking, minification, hash all assets
- Size budgets enforced

---

*Stack analysis: 2026-07-30*
