# External Integrations

**Analysis Date:** 2026-07-30

## APIs & External Services

**Backend REST API:**
- URL (dev): `http://localhost:3000` (from `src/environments/environment.ts`)
- URL (prod): `https://api.comandou.app.br` (from `src/environments/environment.prod.ts`)
- Client: `src/app/core/api/api.service.ts` (HttpClient wrapper)
- Auth: JWT Bearer token (via `authInterceptor`)
- Tenant Header: `X-Tenant-Slug` (extracted from hostname)

**Endpoints (inferred from UI code):**
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Refresh JWT token (httpOnly cookie-based)
- `POST /auth/logout` - Clear session
- `GET /mesas` - List restaurant tables
- `GET /comandas` - List open bills
- `POST /comandas` - Create new bill
- `GET /comandas/:id` - Get bill details
- `PATCH /comandas/:id` - Update bill (split, close)
- `POST /itens` - Add item to bill
- `PATCH /itens/:id` - Update item status
- `DELETE /itens/:id` - Cancel item
- `GET /produtos` - List menu items (with pagination)
- `POST /produtos` - Create product (admin)
- `PATCH /produtos/:id` - Update product (admin)
- `DELETE /produtos/:id` - Delete product (admin)
- `GET /categorias` - List categories
- `POST /categorias` - Create category (admin)
- `PATCH /categorias/:id` - Update category (admin)
- `DELETE /categorias/:id` - Delete category (admin)
- `GET /usuarios` - List users (admin)
- `POST /usuarios` - Create user (admin)
- `PATCH /usuarios/:id` - Update user (admin)
- `DELETE /usuarios/:id` - Delete user (admin)
- `GET /relatorios/vendas` - Sales report (admin)

## Data Storage

**Backend Database:**
- Type/Provider: Not specified in frontend code (backend responsibility)
- Connection: Via REST API endpoints above
- ORM/Client: Not used in frontend (API-driven architecture)

**Frontend Storage:**
- **Auth State:** Angular Signal only (memory) - `src/app/core/auth/auth.signal.ts`
  - JWT token stored in-memory, never persisted to localStorage
  - Refresh token in httpOnly cookie (sent by browser automatically)
- **LocalStorage:**
  - Theme preference: `comandou-theme` ('light' or 'dark') - Used for theme toggle
  - No sensitive data stored
- **SessionStorage:** Not used

**File Storage:**
- Product images: `imagemUrl` field in Produto model (backend URL delivery)
- Avatar/profile images: Not implemented

**Caching:**
- HTTP-level: Angular HttpClient default caching (if backend specifies cache headers)
- Application-level: No explicit cache (each resource() query re-fetches by default)
- WebSocket events trigger reactive updates (no polling)

## Authentication & Identity

**Auth Provider:**
- Custom (backend-managed)
- Implementation: JWT + httpOnly refresh cookie
  - Access token: Short-lived JWT (in-memory Signal)
  - Refresh token: httpOnly cookie (automatic browser attach)

**Auth Flow:**
1. User enters email + senha (password) on `/login`
2. `AuthService.login()` calls `POST /auth/login` with tenant header
3. Backend returns accessToken (JWT) + user object
4. Frontend stores in `authState` Signal via `setAuth()`
5. Router navigates to role-based dashboard (garcom/cozinha/caixa/admin)
6. `authInterceptor` attaches `Authorization: Bearer <token>` to all requests

**Refresh Flow:**
1. Backend returns 401 Unauthorized
2. `authInterceptor` catches, calls `AuthService.refresh()`
3. `refresh()` calls `POST /auth/refresh` (cookie sent automatically)
4. Backend returns new accessToken
5. Interceptor retries original request with new token
6. If refresh fails → `clearAuth()` + redirect to `/login`

**Profiles (Perfis):**
- `garcom` - Waiter: `/garcom/mesas` (grid view, mobile-first)
- `cozinha` - Kitchen: `/cozinha/fila` (queue view, tablet/TV)
- `caixa` - Cashier: `/caixa/comandas` (bill management, desktop/tablet)
- `admin` - Admin: `/admin/dashboard` (CRUD + reporting, desktop)

**Security Model:**
- No localStorage for secrets (prevents XSS attacks)
- Refresh token httpOnly (prevents JavaScript access)
- CSRF protection: Assumed handled by backend (SameSite cookies)
- Tenant isolation: Slug in URL + `X-Tenant-Slug` header verification

## Monitoring & Observability

**Error Tracking:**
- None detected in code (no Sentry, Bugsnag, etc.)
- Console errors via Angular's `provideBrowserGlobalErrorListeners()`

**Logs:**
- Console.log statements in services (development logging)
- No structured logging framework
- WebSocket connection status logged implicitly in `SocketService`

**Analytics:**
- None detected (no Google Analytics, Mixpanel, etc.)

**Performance Monitoring:**
- None integrated (Angular bundles support, no RUM tool)

## CI/CD & Deployment

**Hosting:**
- Vercel (serverless platform for SPA)
- Configuration: `vercel.json`
  - Build command: `ng build`
  - Output: `dist/comandou-web/browser`
  - Rewrites: All routes → `/index.html` (SPA support)

**CI Pipeline:**
- GitHub Actions: `.github/workflows/ci.yml`
- Triggers: push to main, pull requests
- Jobs:
  - Lint (ESLint)
  - Typecheck (tsc strict)
  - Build (ng build)
- Node 22, npm caching enabled

**Deployment:**
- Automatic on merge to main (Vercel integration)
- No manual approval

## Environment Configuration

**Required environment variables:**
- None in `package.json` scripts (configuration via environment files)
- At runtime: Extracted from `window.location.hostname` for tenant slug

**Development environment:**
```typescript
// src/environments/environment.ts
{
  production: false,
  tenantSlug: 'burguer-test' (fallback),
  apiUrl: 'http://localhost:3000',
  wsUrl: 'http://localhost:3000'
}
```

**Production environment:**
```typescript
// src/environments/environment.prod.ts
{
  production: true,
  tenantSlug: extracted from hostname (e.g., 'restaurante' from 'restaurante.comandou.com.br'),
  apiUrl: 'https://api.comandou.app.br',
  wsUrl: 'https://api.comandou.app.br'
}
```

**Secrets location:**
- Not applicable (frontend-only, no API keys exposed)
- Refresh token managed by browser (httpOnly cookie)
- Backend auth tokens managed server-side

## WebSocket Integration

**Service:** Socket.io-client 4.8.3
- Server: Same as API (`environment.wsUrl`)
- Namespace: Default (`/`)
- Transport: WebSocket only
- Authentication: JWT token via `auth: { token }` handshake

**Connection Management:**
- File: `src/app/core/socket/socket.service.ts`
- Auto-connect: On successful auth (via effect listening to `authState`)
- Auto-disconnect: On logout or auth clear
- Reconnection: Exponential backoff (1s, 2s, 4s, ..., max 30s)
- Attempts: Infinite retries

**Events:**

| Event | Direction | Payload | Used By |
|-------|-----------|---------|---------|
| `item:novo` | Server → Client | `ItemComanda` | Cozinha fila, Garçom comanda |
| `item:atualizado` | Server → Client | `ItemComanda` | Cozinha fila, Garçom comanda (notify pronto) |
| `item:cancelado` | Server → Client | `ItemComanda` | Cozinha fila, Garçom comanda |
| `comanda:aberta` | Server → Client | `Comanda` | Caixa lista comandas |
| `comanda:fechada` | Server → Client | `Comanda` | Caixa lista, Garçom mesas |

**Status Component:**
- `ConnectionBannerComponent` displays connection status (connected/disconnected/reconnecting)
- Automatically shown in layouts with WebSocket usage

## Multi-Tenant Architecture

**Tenant Identification:**
- Extracted from hostname at runtime:
  - Production: `restaurante.comandou.com.br` → slug `restaurante`
  - Development: Fallback to `burguer-test`
- Injected in API header: `X-Tenant-Slug`

**Tenant Isolation:**
- All API requests include tenant header
- Backend validates tenant on each request
- No cross-tenant data access possible

## Data Models

**Core Entities (mirrored from backend):**

**Usuario**
```typescript
{
  id: string,
  nome: string,
  email: string,
  perfil: 'garcom' | 'cozinha' | 'caixa' | 'admin',
  ativo: boolean
}
```

**Mesa**
```typescript
{
  id: string,
  numero: number,
  descricao?: string,
  status: 'livre' | 'ocupada' | 'item_pronto'
}
```

**Comanda**
```typescript
{
  id: string,
  mesaId: string,
  mesa?: Mesa,
  nomeCliente?: string | null,
  itens: ItemComanda[],
  total: number,
  aberta: boolean,
  criadoEm: string,
  fechadoEm?: string
}
```

**ItemComanda**
```typescript
{
  id: string,
  produtoId: string,
  produto?: Produto,
  quantidade: number,
  observacao?: string,
  status: 'pendente' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado',
  preco: number,
  total: number,
  criadoEm: string,
  atualizadoEm: string
}
```

**Produto**
```typescript
{
  id: string,
  nome: string,
  descricao?: string,
  preco: number,
  categoriaId: string,
  categoria?: Categoria,
  estoque: number,
  disponivel: boolean,
  imagemUrl?: string
}
```

**Categoria**
```typescript
{
  id: string,
  nome: string,
  ordem: number
}
```

**RelatorioVendas**
```typescript
{
  totalVendas: number,
  totalComandas: number,
  ticketMedio: number,
  vendasPorDia: { data: string; total: number }[],
  topProdutos: { produto: string; quantidade: number; total: number }[]
}
```

## Third-Party Integrations

**Payment Processing:** Not implemented (billing UI exists, payment provider unknown)

**Email Notifications:** Not implemented

**SMS Notifications:** Not implemented

**Map/Location Services:** Not implemented

**Social Auth:** Not implemented (email/senha only)

---

*Integration audit: 2026-07-30*
