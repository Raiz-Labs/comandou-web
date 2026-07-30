<!-- refreshed: 2026-07-30 -->
# Architecture

**Analysis Date:** 2026-07-30

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                         UI Layer (Components)                    │
│  Feature Shells: ShellComponent | MasterShellComponent           │
│  Feature Routes: Garcom, Cozinha, Caixa, Admin, Login, Cardapio │
├──────────────────┬──────────────────┬────────────────────────────┤
│   Signals State  │   Services       │    WebSocket (Real-time)   │
│  auth.signal.ts  │  GarcomService   │    SocketService (Socket)  │
│  theme.signal.ts │  CozinhaService  │    Listens to WsEvents     │
│                  │  CaixaService    │                            │
│                  │  AdminService    │                            │
└────────────────┬─────────────────┬──────────────────────────────┘
                 │                 │
                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Core Services (Singleton)                       │
│  `src/app/core/`                                                 │
│  - ApiService: HTTP client wrapper, all REST calls go through    │
│  - AuthService, auth.signal.ts: JWT in memory, auth state        │
│  - SocketService: Socket.io singleton, auto-reconnect            │
│  - MasterAuthService: Master admin impersonation (multi-tenant)  │
│  - AuthGuard, PerfilGuard: Route protection by role              │
└──────────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│           External: REST API + WebSocket                         │
│  Backend: comandou-api (Node.js/Express)                         │
│  URL: from environment.ts (apiUrl, wsUrl per tenant)             │
│  Auth: JWT header + Socket.io auth handshake                     │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| AppComponent | Root component, outlets for routing + Toast | `src/app/app.ts` |
| ShellComponent | Logged-in layout: sidebar nav + main content | `src/app/shared/components/shell/shell.component.ts` |
| MasterShellComponent | Master admin layout for tenant management | `src/app/shared/components/master-shell/master-shell.component.ts` |
| ApiService | HTTP wrapper, base URL + params, all REST calls | `src/app/core/api/api.service.ts` |
| SocketService | Socket.io singleton, auto-connect on auth, emit/listen | `src/app/core/socket/socket.service.ts` |
| AuthService | Login, logout, token refresh, read/clear auth state | `src/app/core/auth/auth.service.ts` |
| GarcomService | REST: mesas, comandas, items; feature service | `src/app/features/garcom/garcom.service.ts` |
| CozinhaService | REST: fila items; feature service | `src/app/features/cozinha/cozinha.service.ts` |
| CaixaService | REST: comandas abertas, fechamento; feature service | `src/app/features/caixa/caixa.service.ts` |
| AdminService | REST: produtos, categorias, mesas, usuarios, relatorios | `src/app/features/admin/admin.service.ts` |
| ToastService | Global notifications via injected service | `src/app/shared/components/toast/toast.service.ts` |

## Pattern Overview

**Overall:** Multi-tenant Angular v21 SPA with role-based access, real-time collaboration via WebSocket.

**Key Characteristics:**
- **Standalone Components**: 100% standalone, no NgModule
- **Signal-Based State**: Signals for auth, theme; resources for async data loading
- **Feature Services**: Each feature (garcom, cozinha, caixa, admin) has a dedicated service wrapping ApiService
- **No Global State Library**: NgRx avoided; auth state in signals, local component state via signals
- **WebSocket Real-time**: Socket.io for live item/comanda updates; SocketService auto-connects on login
- **Route-Based Lazy Loading**: Lazy-loaded components per feature with guards
- **Shared Abstractions**: Reusable components (Toast, Skeleton, StatusBadge, ConfirmDialog) in `src/app/shared/`

## Layers

**Core Layer (`src/app/core/`):**
- Purpose: Singleton services for auth, HTTP, WebSocket, theme
- Location: `src/app/core/`
- Contains: AuthService, ApiService, SocketService, MasterAuthService, auth.signal.ts, theme.signal.ts, guards/interceptors
- Depends on: Angular platform (HttpClient, Router), Socket.io
- Used by: All features, all components

**Feature Layer (`src/app/features/`):**
- Purpose: Business logic isolated per role or domain (garcom, cozinha, caixa, admin, login, cardapio, master)
- Location: `src/app/features/*/`
- Contains: Feature components, feature service per feature
- Depends on: Core layer (ApiService, SocketService, auth), shared components/types
- Used by: Router (lazy-loaded on demand)

**Shared Layer (`src/app/shared/`):**
- Purpose: Reusable UI components, pipes, directives, type definitions
- Location: `src/app/shared/`
- Contains: Shell components (shell.component, master-shell.component), Toast/Skeleton/StatusBadge/ConfirmDialog, pipes (currency-br, status-label), directives (touch-target), types (index.ts)
- Depends on: Angular common, Lucide icons, b-system tokens
- Used by: All features

**Presentation Layer (Components):**
- Purpose: User-facing UI, triggered by route navigation
- Location: `src/app/features/*/`
- Contains: [Feature]Component (one component per route, e.g., MesasComponent, ComandaDetalheComponent)
- Depends on: Feature service, shared components, core signals
- Used by: Router

**Styling (`src/styles/`):**
- Purpose: Global styles, b-system design tokens
- Location: `src/styles/`
- Contains: global.scss (Nunito font, CSS resets), _b-utils.scss (utility classes), colors_and_type.css (b-system tokens in :root)
- Depends on: Google Fonts, b-system token values
- Used by: All components via var() CSS custom properties

## Data Flow

### Primary Request Path (User Action)

1. User clicks button/link in feature component (`src/app/features/garcom/mesas/mesas.component.ts:390`)
   - Example: Click on mesa card to navigate
2. Component calls feature service method (`src/app/features/garcom/garcom.service.ts:10`)
   - Example: `this.garcomService.listarMesas()`
3. Feature service calls `ApiService.get()`/`post()`/etc. (`src/app/core/api/api.service.ts:11-30`)
   - Wraps `HttpClient` with base URL + tenant isolation
4. `HttpClient` (with `authInterceptor`) adds JWT header from `authState.token`
5. Request sent to backend `/api/...` endpoint
6. Response received, converted to TypeScript type (from `src/app/shared/types/index.ts`)
7. Component receives Promise-wrapped response (via `firstValueFrom`)
8. Component updates local signal or resource with data
9. Template uses `@if`, `@for`, `@switch` to render

**Example Flow:**
```
MesasComponent
  → click(navegarParaMesa)
  → GarcomService.listarMesas()
  → ApiService.get('/mesas')
  → authInterceptor adds Authorization header
  → HttpClient.get(environment.apiUrl + '/mesas')
  → Backend responds with Mesa[]
  → resource({ loader: () => GarcomService.listarMesas() })
  → component.mesas.value() → MesasComponent template renders grid
```

### WebSocket Real-time Path (Backend Push)

1. Backend emits event (e.g., `item:atualizado`)
2. SocketService listens on event via `.on<T>(event: WsEvent)`
3. Component subscribes during `ngOnInit()` (`src/app/features/garcom/mesas/mesas.component.ts:372-383`)
4. Event data triggers `.reload()` on resource
5. Resource re-runs loader, refreshes component data
6. Template automatically re-renders

**Example Flow:**
```
Backend: emit('item:atualizado', itemData)
  ↓
SocketService.socket.on('item:atualizado')
  ↓
Component.ngOnInit() subscribes: socketService.on<ItemComanda>('item:atualizado')
  ↓
Subscription fires → mesas.reload()
  ↓
Resource re-runs loader → ApiService.get('/mesas')
  ↓
MesasComponent template re-renders with new data
```

### Authentication Flow (Login)

1. User submits login form (email + password)
2. LoginComponent calls `AuthService.login(email, password)`
3. AuthService calls `ApiService.post('/auth/login', { email, password })`
4. Backend returns `{ accessToken: string, user: Usuario }`
5. AuthService calls `setAuth(token, user)` → updates `authState` signal
6. `authInitializer` effect: `authState.isAuthenticated` → true
7. SocketService's effect detects `authState.isAuthenticated` → connects to WebSocket with token
8. Router navigates to feature route (e.g., `/garcom/mesas`) via guards
9. Protected routes check `authGuard` (verifies `isAuthenticated`) and `perfilGuard` (verifies role)

### Logout Flow

1. User clicks "Sair" in shell sidebar
2. ShellComponent calls `AuthService.logout()`
3. AuthService calls `clearAuth()` → updates `authState` to logged-out state
4. SocketService's effect detects `authState.isAuthenticated` → false → disconnects
5. Router navigates to `/login`

**State Management:**
- **Auth State**: `authState` signal in `src/app/core/auth/auth.signal.ts` holds `{ user, token, isAuthenticated }`
- **Theme State**: `themeSignal` in `src/app/core/theme/theme.signal.ts` holds light/dark mode
- **Component Local State**: Signals (e.g., `drawerOpen`, `loading`) within component class
- **Async Data**: `resource()` API for REST calls, auto-handles loading/error/value states
- **WebSocket State**: `connectionStatus` signal in `SocketService` tracks 'connected' | 'disconnected' | 'reconnecting'

## Key Abstractions

**Resource:**
- Purpose: Simplified async data loading with built-in states (isLoading, value, error)
- Examples: `src/app/features/garcom/mesas/mesas.component.ts:358-360` — `resource({ loader: () => this.garcomService.listarMesas() })`
- Pattern: Automatically tracks loading, error, and value without manual try/catch

**Computed:**
- Purpose: Derived state from signals, automatically updates when dependencies change
- Examples: `src/app/core/auth/auth.signal.ts:12-14` — `currentUser`, `isAuthenticated`, `userPerfil`
- Pattern: Used for selectors without Redux-style overhead

**Effect:**
- Purpose: Reactive side effects when signals change
- Examples: `src/app/core/socket/socket.service.ts:18-25` — auto-connect/disconnect on auth state change
- Pattern: One-time setup in constructor, automatically unsubscribed on destroy

**Feature Service:**
- Purpose: Centralized API calls for a feature, wraps ApiService
- Examples: `src/app/features/garcom/garcom.service.ts`, `src/app/features/admin/admin.service.ts`
- Pattern: Single service per feature, converts Observables to Promises via `firstValueFrom`, no direct HttpClient in components

**Typed Events (WsEvent):**
- Purpose: Type-safe WebSocket event enum
- Examples: `'item:novo'`, `'item:atualizado'`, `'comanda:aberta'`, `'comanda:fechada'` from `src/app/shared/types/index.ts:104-109`
- Pattern: Centralized event names, prevents typos in `.on()` / `.emit()`

## Entry Points

**Bootstrap Entry (`src/main.ts`):**
- Location: `src/main.ts`
- Triggers: Browser loads index.html
- Responsibilities: Call `bootstrapApplication(AppComponent, appConfig)` with providers

**Root Component (`src/app/app.ts`):**
- Location: `src/app/app.ts`
- Triggers: Bootstrap completes
- Responsibilities: Outlet for router + Toast component at root level

**App Configuration (`src/app/app.config.ts`):**
- Location: `src/app/app.config.ts`
- Triggers: Bootstrap initialization
- Responsibilities: Provide providers (router, HttpClient with authInterceptor, authInitializer, Lucide icons)

**Auth Initializer (`src/app/core/auth/auth.initializer.ts`):**
- Location: `src/app/core/auth/auth.initializer.ts`
- Triggers: App initialization (via APP_INITIALIZER in appConfig)
- Responsibilities: Load persisted auth state from refresh token (httpOnly cookie), pre-populate `authState` on app start

**Route Definitions (`src/app/app.routes.ts`):**
- Location: `src/app/app.routes.ts`
- Triggers: Router initialization
- Responsibilities: Define all routes with lazy loading and guards

**Feature Routes:**
- Master: `/master/login`, `/master` → TenantsComponent (admin only)
- Public: `/login`, `/cardapio`
- Protected (AuthGuard):
  - Garcom: `/garcom/mesas`, `/garcom/mesa/:mesaId/comandas`, `/garcom/comanda/:id`
  - Cozinha: `/cozinha/fila`
  - Caixa: `/caixa/comandas`, `/caixa/comanda/:id`
  - Admin: `/admin/dashboard`, `/admin/produtos`, `/admin/categorias`, `/admin/mesas`, `/admin/usuarios`, `/admin/relatorios`

## Architectural Constraints

- **Threading:** Single-threaded browser event loop; all async via RxJS Observables or Promises
- **Global State:** `authState`, `themeSignal` in core layer; no module-level mutable singleton state except SocketService instance
- **Circular Imports:** None detected; strict layering prevents core ↔ feature dependencies
- **Multi-tenancy:** Tenant isolation via subdomain → `environment.ts` reads `window.location.hostname` → ApiService uses tenant-specific `apiUrl` + `wsUrl`
- **Master Admin Access:** MasterAuthService allows super-admin to impersonate tenant via token injection; tracked in `masterImpersonating` signal
- **HTTPS-Only:** All HTTP calls via authInterceptor assume `withFetch()` provider (modern fetch API); JWT in Authorization header never stored in localStorage

## Anti-Patterns

### Direct HttpClient Injection in Components

**What happens:** Component injects `HttpClient` directly and calls `.get()` / `.post()` instead of using ApiService.

**Why it's wrong:** 
- Bypasses authInterceptor (JWT not added automatically)
- Breaks tenant isolation (hardcoded URLs instead of environment.apiUrl)
- Duplicates error handling logic across components
- Complicates testing (need to mock HttpClient instead of single ApiService)

**Do this instead:** Inject feature service, call its method. Feature service injects ApiService and calls its method.
```typescript
// ❌ WRONG
export class MesasComponent {
  constructor(private http: HttpClient) { }
  ngOnInit() {
    this.http.get('/api/mesas').subscribe(data => { ... });
  }
}

// ✅ CORRECT
export class MesasComponent {
  private garcomService = inject(GarcomService); // Feature service
  protected mesas = resource({
    loader: () => this.garcomService.listarMesas() // Calls ApiService inside
  });
}
```

### Storing JWT in localStorage

**What happens:** Code reads/writes token to localStorage or sessionStorage after login.

**Why it's wrong:**
- XSS vulnerability: malicious script can read token from localStorage
- JWT should only live in memory during session
- Refresh token should be httpOnly cookie (set by backend, auto-sent by browser)

**Do this instead:** Keep JWT in `authState` signal (memory only). Backend sets httpOnly refresh cookie automatically on `/auth/login`.
```typescript
// ❌ WRONG
localStorage.setItem('token', accessToken);

// ✅ CORRECT
setAuth(accessToken, user); // Updates authState signal (memory)
// Backend response includes Set-Cookie: refreshToken=...; httpOnly
```

### BehaviorSubject or RxJS State Management

**What happens:** Component uses BehaviorSubject for state (e.g., `private users$ = new BehaviorSubject<User[]>([])`).

**Why it's wrong:**
- Signals are simpler and more performant (no subscribe/unsubscribe, no change detection cycles)
- Signals integrate with Angular's reactivity out-of-the-box
- CLAUDE.md forbids NgRx and recommends Signals

**Do this instead:** Use signals for local state, resources for async data.
```typescript
// ❌ WRONG
private users$ = new BehaviorSubject<User[]>([]);
ngOnInit() {
  this.api.get('/users').subscribe(users => this.users$.next(users));
}

// ✅ CORRECT
protected users = resource({
  loader: () => this.api.get<User[]>('/users')
});
```

### Hardcoded Colors, Spacing, or Radius

**What happens:** Component SCSS contains `color: #D95C25;` or `padding: 16px;` or `border-radius: 12px;` instead of using b-system tokens.

**Why it's wrong:**
- Breaks design system consistency
- Impossible to theme (light/dark mode)
- Impossible to iterate on brand colors globally

**Do this instead:** Always use b-system CSS custom properties.
```scss
// ❌ WRONG
.button { color: #D95C25; padding: 16px; border-radius: 12px; }

// ✅ CORRECT
.button { color: var(--b-primary-500); padding: var(--b-space-4); border-radius: var(--b-radius-md); }
```

## Error Handling

**Strategy:** Layered error handling with async/await at service level, try/catch in components only for initialization.

**Patterns:**
- **ApiService errors**: Returned to caller via Promise rejection; callers decide how to handle (toast, fallback UI, retry)
- **Resource errors**: Captured in `resource.error()` signal; template checks `@if (resource.error()) { <error-ui> }`
- **Auth errors (401/403)**: authInterceptor catches, attempts token refresh; if refresh fails, clears auth and redirects to /login
- **WebSocket disconnection**: SocketService automatically reconnects; ConnectionBannerComponent shows offline banner when `connectionStatus() === 'disconnected'`

## Cross-Cutting Concerns

**Logging:** `console.log()` during development; no centralized logger configured (consider adding observability if scaling).

**Validation:** 
- Backend-driven (backend validates, returns 400 with field errors)
- Frontend shows errors from API response in toast or field-level messages

**Authentication:**
- Via authInterceptor: adds `Authorization: Bearer ${token}` to all HTTP requests
- Via Socket.io auth: passes token during WebSocket handshake
- Routes guarded by authGuard (checks `isAuthenticated()`) and perfilGuard (checks user role)

**Authorization (Role-Based Access):**
- Enforced at route level via `perfilGuard(['garcom', 'admin'])` 
- Backend is source of truth for role permissions
- Frontend hides/shows UI elements based on `userPerfil()` signal

---

*Architecture analysis: 2026-07-30*
