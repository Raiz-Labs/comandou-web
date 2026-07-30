# Codebase Structure

**Analysis Date:** 2026-07-30

## Directory Layout

```
comandou-web/
├── src/
│   ├── main.ts                          # Bootstrap entry point
│   ├── index.html                       # HTML template, root app-root
│   ├── styles.scss                      # Global stylesheet import
│   ├── app/
│   │   ├── app.ts                       # Root component (RouterOutlet + Toast)
│   │   ├── app.routes.ts                # Route definitions (lazy-loaded features)
│   │   ├── app.config.ts                # Application configuration & providers
│   │   ├── app.scss                     # App-level styles
│   │   ├── core/                        # Singleton services & global state
│   │   │   ├── auth/                    # Authentication
│   │   │   │   ├── auth.signal.ts       # Global auth state (authState, currentUser, isAuthenticated)
│   │   │   │   ├── auth.service.ts      # Login, logout, token refresh
│   │   │   │   ├── auth.interceptor.ts  # HTTP interceptor for JWT header
│   │   │   │   ├── auth.initializer.ts  # Load persisted auth on app start
│   │   │   │   └── auth.guard.ts        # authGuard, perfilGuard, publicGuard
│   │   │   ├── api/                     # HTTP client wrapper
│   │   │   │   └── api.service.ts       # GET/POST/PUT/PATCH/DELETE with base URL
│   │   │   ├── socket/                  # WebSocket real-time
│   │   │   │   └── socket.service.ts    # Socket.io singleton, auto-connect on auth
│   │   │   ├── theme/                   # Theme state
│   │   │   │   └── theme.signal.ts      # Light/dark mode signal
│   │   │   └── master/                  # Multi-tenant admin
│   │   │       ├── master-auth.signal.ts # Master admin state & impersonation
│   │   │       ├── master-auth.service.ts # Master login, tenant access
│   │   │       └── master.guard.ts       # Master route protection
│   │   ├── features/                    # Role-based features (lazy-loaded)
│   │   │   ├── login/
│   │   │   │   └── login.component.ts   # Tenant login form
│   │   │   ├── master/
│   │   │   │   ├── login/
│   │   │   │   │   └── master-login.component.ts # Master admin login
│   │   │   │   └── tenants/
│   │   │   │       └── tenants.component.ts      # Tenant CRUD (master only)
│   │   │   ├── garcom/                  # Waiter interface
│   │   │   │   ├── garcom.service.ts    # API calls: mesas, comandas, items
│   │   │   │   ├── mesas/
│   │   │   │   │   └── mesas.component.ts        # Grid of tables, status
│   │   │   │   ├── comanda/
│   │   │   │   │   ├── mesa-comandas.component.ts # Orders for selected table
│   │   │   │   │   └── comanda-detalhe.component.ts # Order detail, add items
│   │   │   │   └── notificacao/
│   │   │   │       ├── garcom-notificacao.service.ts # Notification state
│   │   │   │       └── notificacao-banner.component.ts # Item-ready banner
│   │   │   ├── cozinha/                 # Kitchen interface
│   │   │   │   ├── cozinha.service.ts   # API calls: fila items
│   │   │   │   └── fila/
│   │   │   │       └── fila.component.ts # Real-time item queue
│   │   │   ├── caixa/                   # Cashier interface
│   │   │   │   ├── caixa.service.ts     # API calls: comandas abertas, fechamento
│   │   │   │   ├── comandas/
│   │   │   │   │   └── comandas-lista.component.ts # List open orders
│   │   │   │   └── comanda/
│   │   │   │       └── comanda-detalhe-caixa.component.ts # Order detail, close/split
│   │   │   ├── admin/                   # Admin interface
│   │   │   │   ├── admin.service.ts     # API calls: CRUD for all entities
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── dashboard.component.ts # Overview, analytics
│   │   │   │   ├── produtos/
│   │   │   │   │   └── produtos.component.ts   # Product CRUD
│   │   │   │   ├── categorias/
│   │   │   │   │   └── categorias.component.ts # Category CRUD
│   │   │   │   ├── mesas/
│   │   │   │   │   └── admin-mesas.component.ts # Table management
│   │   │   │   ├── usuarios/
│   │   │   │   │   └── usuarios.component.ts   # User management
│   │   │   │   └── relatorios/
│   │   │   │       └── relatorios.component.ts # Sales reports
│   │   │   └── cardapio/
│   │   │       └── cardapio.component.ts       # Public menu (no auth required)
│   │   └── shared/                      # Reusable assets
│   │       ├── types/
│   │       │   └── index.ts             # All TypeScript types (Usuario, Mesa, Comanda, etc.)
│   │       ├── components/
│   │       │   ├── shell/
│   │       │   │   └── shell.component.ts # Main app layout (sidebar + topbar + router-outlet)
│   │       │   ├── master-shell/
│   │       │   │   └── master-shell.component.ts # Master admin layout
│   │       │   ├── toast/
│   │       │   │   ├── toast.component.ts # Toast notifications UI
│   │       │   │   └── toast.service.ts   # Inject to show success/error/info/warning
│   │       │   ├── skeleton/
│   │       │   │   └── skeleton.component.ts # Loading placeholder
│   │       │   ├── status-badge/
│   │       │   │   └── status-badge.component.ts # Item status display
│   │       │   ├── connection-banner/
│   │       │   │   └── connection-banner.component.ts # Offline indicator
│   │       │   ├── confirm-dialog/
│   │       │   │   └── confirm-dialog.component.ts # Confirmation modal
│   │       │   └── theme-toggle/
│   │       │       └── theme-toggle.component.ts # Light/dark mode toggle
│   │       ├── pipes/
│   │       │   ├── currency-br.pipe.ts  # Format numbers as R$ (BRL)
│   │       │   └── status-label.pipe.ts # Translate status values to UI labels
│   │       └── directives/
│   │           └── touch-target.directive.ts # Ensure 44x44px minimum tap targets
│   ├── styles/
│   │   ├── global.scss                  # Global resets, Nunito font import
│   │   ├── _b-utils.scss                # Utility classes (.b-btn-primary, .b-card, etc.)
│   │   └── (b-system tokens from index.html)
│   ├── assets/
│   │   ├── b-system/
│   │   │   └── colors_and_type.css      # b-system design tokens (:root variables)
│   │   └── icons/                       # PWA favicon
│   └── environments/
│       ├── environment.ts               # Development config (apiUrl, wsUrl, etc.)
│       └── environment.prod.ts          # Production config (Vercel-bound apiUrl/wsUrl)
├── .claude/
│   ├── CLAUDE.md                        # Development guide (this file)
│   ├── skills/                          # Project-specific skills
│   └── commands/                        # Project-specific commands
├── .github/
│   └── workflows/                       # CI/CD (GitHub Actions)
├── angular.json                         # Angular CLI configuration
├── tsconfig.json                        # TypeScript base config
├── tsconfig.app.json                    # TypeScript app config (extends base)
├── tsconfig.spec.json                   # TypeScript spec config (tests)
├── package.json                         # npm dependencies & scripts
├── package-lock.json                    # npm lockfile
├── eslint.config.js                     # ESLint rules (Angular + TypeScript)
├── prettier.config.js                   # Prettier formatting config
└── .planning/
    └── codebase/                        # GSD codebase maps (this directory)
        ├── ARCHITECTURE.md              # Architecture overview
        ├── STRUCTURE.md                 # This file
        ├── CONVENTIONS.md               # (if quality focus used)
        ├── TESTING.md                   # (if quality focus used)
        ├── STACK.md                     # (if tech focus used)
        └── INTEGRATIONS.md              # (if tech focus used)
```

## Directory Purposes

**`src/app/core/`:**
- Purpose: Singleton services that run once per app session
- Contains: Auth (JWT state, login/logout, guards), API (HTTP wrapper), Socket (WebSocket), Theme (light/dark), Master (multi-tenant admin)
- Key files: `auth.signal.ts` (auth state), `api.service.ts` (REST), `socket.service.ts` (WebSocket), `auth.guard.ts` (route protection)
- Import from core in: All features, all components

**`src/app/features/`:**
- Purpose: Business logic isolated per role/domain; lazy-loaded on route activation
- Contains: Feature-specific components and one service per feature
- Organization: Each role (`garcom/`, `cozinha/`, `caixa/`, `admin/`) has its own folder with sub-features
- Key files: `[feature].service.ts` (API wrapper), `*.component.ts` (UI)
- When to add: New feature → create `/src/app/features/[name]/` folder with service + component

**`src/app/shared/components/`:**
- Purpose: Reusable UI components not tied to a specific feature
- Contains: Shell (main layout), Toast (notifications), Skeleton (loading), StatusBadge (status display), ConfirmDialog, ConnectionBanner, ThemeToggle
- When to add: Component used by 2+ features OR component that provides system-level UI (toast, modal)

**`src/app/shared/types/`:**
- Purpose: Single source of truth for all TypeScript interfaces
- Contains: `index.ts` with all types (Usuario, Mesa, Comanda, ItemComanda, etc.)
- Mirrors backend model structure for type safety
- Import from shared/types in: All components and services

**`src/app/shared/pipes/`:**
- Purpose: Template filters for data transformation
- Contains: `currency-br.pipe.ts` (number → R$ format), `status-label.pipe.ts` (status enum → UI label)
- When to add: Repeating data format in templates → create pipe instead

**`src/app/shared/directives/`:**
- Purpose: Template behaviors and DOM enhancements
- Contains: `touch-target.directive.ts` (ensures 44px minimum for accessibility)
- When to add: Behavior applied to multiple elements across features

**`src/styles/`:**
- Purpose: Global styling and design system
- Contains: `global.scss` (fonts, resets), `_b-utils.scss` (utility classes), b-system tokens
- Key pattern: All colors/spacing/radius must use `var(--b-primary-500)`, `var(--b-space-4)`, etc.

**`src/environments/`:**
- Purpose: Environment-specific configuration
- Contains: `environment.ts` (dev), `environment.prod.ts` (production)
- Key values: `apiUrl`, `wsUrl` (read from `window.location.hostname` for multi-tenant)
- When to add: New env var → add to both files and import `import { environment } from '@env'`

## Key File Locations

**Entry Points:**
- `src/main.ts`: Bootstrap application
- `src/index.html`: HTML root template (app-root div + b-system tokens in <head>)
- `src/app/app.ts`: Root component (RouterOutlet + Toast)
- `src/app/app.routes.ts`: All route definitions

**Authentication:**
- `src/app/core/auth/auth.signal.ts`: `authState`, `currentUser`, `isAuthenticated` signals
- `src/app/core/auth/auth.service.ts`: `login()`, `logout()`, `refreshToken()`
- `src/app/core/auth/auth.interceptor.ts`: Adds `Authorization: Bearer` header to all requests
- `src/app/core/auth/auth.guard.ts`: Route guards (`authGuard`, `perfilGuard`, `publicGuard`)

**Core Services:**
- `src/app/core/api/api.service.ts`: HTTP `get()`/`post()`/`put()`/`patch()`/`delete()`
- `src/app/core/socket/socket.service.ts`: WebSocket `.on<T>()`, `.emit()`, auto-reconnect
- `src/app/core/theme/theme.signal.ts`: Light/dark mode signal

**Feature Services:**
- `src/app/features/garcom/garcom.service.ts`: Mesa, Comanda, Item API calls
- `src/app/features/cozinha/cozinha.service.ts`: Fila (queue) API calls
- `src/app/features/caixa/caixa.service.ts`: Comanda (cashier view) API calls
- `src/app/features/admin/admin.service.ts`: All CRUD operations (Produto, Categoria, Mesa, Usuario, Relatorio)

**Layout Components:**
- `src/app/shared/components/shell/shell.component.ts`: Main app layout (sidebar + content area)
- `src/app/shared/components/master-shell/master-shell.component.ts`: Master admin layout

**Shared Components:**
- `src/app/shared/components/toast/`: Global notifications (inject ToastService to use)
- `src/app/shared/components/skeleton/`: Loading placeholder (use during `resource.isLoading()`)
- `src/app/shared/components/status-badge/`: Display item/mesa status
- `src/app/shared/components/confirm-dialog/`: Confirmation modal for destructive actions
- `src/app/shared/components/connection-banner/`: Show offline status (auto-used)

**Type Definitions:**
- `src/app/shared/types/index.ts`: All types (Usuario, Mesa, Comanda, ItemComanda, Categoria, Produto, AuthState, WsEvent, payloads)

**Design System:**
- `src/styles/global.scss`: Nunito font, resets, animations
- `src/styles/_b-utils.scss`: Utility classes (`.b-btn-primary`, `.b-card`, `.b-text-muted`, etc.)
- `src/assets/b-system/colors_and_type.css`: b-system CSS custom properties (--b-primary-500, --b-space-4, etc.)

## Naming Conventions

**Files:**
- Components: `kebab-case.component.ts` (e.g., `mesa-comandas.component.ts`)
- Services: `kebab-case.service.ts` (e.g., `garcom.service.ts`)
- Signals: `kebab-case.signal.ts` (e.g., `auth.signal.ts`)
- Pipes: `kebab-case.pipe.ts` (e.g., `currency-br.pipe.ts`)
- Directives: `kebab-case.directive.ts` (e.g., `touch-target.directive.ts`)
- Tests: `*.spec.ts` (e.g., `garcom.service.spec.ts`)

**Directories:**
- Feature folders: `kebab-case/` (e.g., `src/app/features/garcom/`, `src/app/features/comanda/`)
- Core subfolders: `kebab-case/` (e.g., `src/app/core/auth/`, `src/app/core/socket/`)

**TypeScript:**
- Interfaces: `PascalCase` (e.g., `Usuario`, `Comanda`, `AuthState`)
- Types: `PascalCase` (e.g., `Perfil`, `StatusMesa`, `WsEvent`)
- Enum-like unions: `kebab-case` strings (e.g., `'garcom' | 'cozinha' | 'caixa' | 'admin'`)
- Classes: `PascalCase` (e.g., `AuthService`, `GarcomService`)
- Signals: `camelCase` (e.g., `authState`, `currentUser`, `drawerOpen`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `NAV_CONFIG`, `LUCIDE_ICONS`)

**CSS/SCSS:**
- Classes: `kebab-case` (e.g., `.sidebar__link`, `.card--ocupada`)
- CSS custom properties: `--b-[category]-[value]` (e.g., `--b-primary-500`, `--b-space-4`, `--b-radius-md`)
- BEM modifier: `--` prefix (e.g., `.card--skeleton`, `.card--ocupada`)

**Routes:**
- Path: `kebab-case` (e.g., `/garcom/mesas`, `/admin/dashboard`, `/caixa/comandas`)
- Route names in code: `[role]/[feature]` pattern (e.g., `garcom/mesas`, `admin/produtos`)

## Where to Add New Code

**New Feature (e.g., new role or domain):**
1. Create folder: `src/app/features/[feature-name]/`
2. Create service: `src/app/features/[feature-name]/[feature-name].service.ts` (inject ApiService, wrap REST calls)
3. Create component: `src/app/features/[feature-name]/[feature-name].component.ts` (use resource() for data)
4. Add route: `src/app/app.routes.ts` (lazy-load, add guard)
5. Add to shell nav: `src/app/shared/components/shell/shell.component.ts` (NAV_CONFIG)

**New Shared Component:**
1. Create folder: `src/app/shared/components/[component-name]/`
2. Create component: `src/app/shared/components/[component-name]/[component-name].component.ts` (standalone: true, no imports needed from features)
3. Export from component file; import where needed

**New Pipe:**
1. Create file: `src/app/shared/pipes/[name].pipe.ts`
2. Implement: `@Pipe({ name: '[pipeName]', standalone: true })` class
3. Import in component template `imports: [MyPipe]`
4. Use in template: `{{ value | myPipeName }}`

**New Directive:**
1. Create file: `src/app/shared/directives/[name].directive.ts`
2. Implement: `@Directive({ selector: '[app...]', standalone: true })` class
3. Import in component: `imports: [MyDirective]`

**New Type:**
1. Add to `src/app/shared/types/index.ts` (centralized; mirrors backend model)
2. Import from types in: Components, services, pipes

**New Global Style:**
1. Add utility class to `src/app/styles/_b-utils.scss` (for repeating patterns)
2. Add CSS custom property to `src/assets/b-system/colors_and_type.css` if introducing new color/spacing/radius
3. Use in component SCSS via `var(--b-[category]-[value])`

**New API Endpoint:**
1. Add method to appropriate feature service (e.g., `garcomService.novo()`)
2. Feature service calls `this.api.[method]('[path]')`
3. Feature service wraps Observable as Promise (`firstValueFrom()`)
4. Component calls feature service method, handles Promise result

**New WebSocket Event:**
1. Add event name to `WsEvent` type in `src/app/shared/types/index.ts`
2. Component subscribes during `ngOnInit()`: `this.socketService.on<DataType>('[event-name]').subscribe(...)`
3. Unsubscribe in `ngOnDestroy()` or use takeUntilDestroyed()

**New Environment Variable:**
1. Add property to both `src/environments/environment.ts` and `environment.prod.ts`
2. Import: `import { environment } from '@env'`
3. Access: `environment.newVar`

## Special Directories

**`src/.vscode/`:**
- Purpose: VS Code workspace settings
- Generated: Yes (local development config)
- Committed: Yes (shared settings for team)

**`src/.claude/`:**
- Purpose: Claude Code configuration and skills
- Generated: No (manually created)
- Committed: Yes (project-specific development guide)

**`.angular/cache/`:**
- Purpose: Angular CLI build cache
- Generated: Yes (build outputs)
- Committed: No (Git-ignored)

**`.planning/codebase/`:**
- Purpose: GSD (Guided Structured Development) codebase maps
- Generated: Yes (by `/gsd-map-codebase` CLI commands)
- Committed: Yes (reference for development)

**`dist/`:**
- Purpose: Production build output
- Generated: Yes (`ng build --configuration production`)
- Committed: No (Git-ignored)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (`npm install`)
- Committed: No (Git-ignored, use package-lock.json)

---

*Structure analysis: 2026-07-30*
