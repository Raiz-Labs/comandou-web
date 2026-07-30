# Codebase Concerns

**Analysis Date:** 2026-07-30

## Tech Debt

### Limited Test Coverage

**Issue:** Only 3 test files (`app.spec.ts`, `garcom.service.spec.ts`, `mesa-comandas.component.spec.ts`) for a codebase of ~10K lines across 50+ component/service files

**Files:** `src/app/` (entire tree)

**Impact:** 
- Changes ship without verification of critical paths
- Regression bugs go undetected until users encounter them
- Refactoring risk is extremely high
- Admin CRUD operations, caixa division logic, WebSocket event handling all untested

**Fix approach:** 
- Add spec files for all services (GarcomService, CaixaService, CozinhaService, AdminService, AuthService, SocketService)
- Create specs for critical components: ComandaDetalheComponent, ComandaDetalheCaixaComponent, FilaComponent, ProductosComponent
- Target minimum 50% coverage for features, 80% for services
- Use `ng test --watch` during development, CI enforces minimum thresholds

---

### Large, Complex Components Difficult to Maintain

**Issue:** Two components exceed 800 lines with deeply nested templates and multiple responsibilities

**Files:** 
- `src/app/features/garcom/comanda/comanda-detalhe.component.ts` (1200 lines) — handles listing, product selection, quantity control, editing, cancellation, and closing
- `src/app/features/caixa/comanda/comanda-detalhe-caixa.component.ts` (818 lines) — handles item listing, payment division, multiple payment methods

**Impact:** 
- Cognitive load makes bug fixes risky
- Template too long to reason about (line 38-441 template)
- State management intertwines UI flow with data mutations
- Hard to test individual pieces
- Risk of regressions when modifying one feature

**Fix approach:** 
- Extract bottom sheets into reusable components: `ProductPickerComponent`, `ItemEditorComponent`, `PaymentDivisionComponent`
- Move complex computed properties to a facade service
- Split 1200-line component into ~400-line main + 4-5 feature components
- Create shared UI service for common modal/sheet patterns
- Prioritize this refactor before adding features to these views

---

### Socket.io Service Creates Multiple Listeners Without Deduplication

**Issue:** Each `.on()` subscription adds a new listener to the same Socket.io event, causing duplicate event handlers if the same event is subscribed to multiple times

**Files:** `src/app/core/socket/socket.service.ts` (lines 63-70)

**Code:** 
```typescript
on<T>(event: WsEvent): Observable<T> {
  return new Observable<T>((observer) => {
    this.socket?.on(event, (data: T) => observer.next(data));  // ← adds listener
    return () => {
      this.socket?.off(event);  // ← removes ALL listeners
    };
  });
}
```

**Impact:** 
- FilaComponent subscribes to `item:novo`, `item:atualizado`, `item:cancelado` — 3 listeners OK
- But if two components subscribe to the same event, both listeners fire even if only one subscription is active
- Cleanup calls `.off(event)` which removes all listeners, breaking other subscriptions
- Silent memory leak: listeners accumulate with each route navigation

**Fix approach:** 
- Use `shareReplay()` to deduplicate subscriptions: cache each event Observable and return cached version
- Change cleanup to use `socket.removeListener()` instead of `.off()` to preserve other listeners
- Test with component that subscribes to same event as another component
- Verify socket listener count stays constant across route navigations

---

## Known Bugs

### Environment Configuration Hardcoded for Development

**Issue:** `environment.ts` has hardcoded tenant slug instead of reading from environment variables

**Files:** `src/environments/environment.ts` (line 18)

**Code:**
```typescript
function getTenantSlug(): string {
  const hostname = window?.location?.hostname ?? 'localhost';
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  return 'burguer-test';  // ← hardcoded fallback
}
```

**Current State:** Works in development but blocks testing different tenants locally

**Trigger:** 
- Start `ng serve` with hostname other than `restaurant.domain.local`
- Tenant slug always defaults to `burguer-test` instead of reading from env var

**Workaround:** 
- Modify hosts file to test multi-tenant (not practical for CI)
- Build multiple times with different `--configuration` values

**Fix approach:** 
- Move tenant resolution to dynamic initialization (APP_INITIALIZER or signal)
- Read from `window.location.hostname` first, then check `TENANT_SLUG` env var
- Update `environment.prod.ts` to fetch from server (`/.well-known/tenant`)
- Set via `ng build --define 'TENANT_SLUG=value'` in CI

---

### TypeScript Type Safety Bypassed with `$any()` in Form Inputs

**Issue:** Multiple components cast event targets to `any` instead of properly typing them, defeating TypeScript's safety

**Files:**
- `src/app/features/master/login/master-login.component.ts` (lines 30, 44)
- `src/app/features/admin/categorias/categorias.component.ts` (lines 48, 143, 156)
- `src/app/features/admin/mesas/admin-mesas.component.ts` (lines 54, 142, 155)
- `src/app/features/admin/produtos/produtos.component.ts` (line 55)
- `src/app/features/cardapio/cardapio.component.ts` (line 39)

**Code Example:**
```typescript
// ❌ WRONG
(input)="email.set($any($event.target).value)"

// ✅ CORRECT — type-safe
(input)="email.set(($event.target as HTMLInputElement).value)"
```

**Impact:** 
- Typos in property names not caught (`$event.target.valu` would not error)
- Refactoring tools can't find usages
- Code review misses mistakes

**Fix approach:** 
- Replace all `$any()` casts with `as HTMLInputElement` / `as HTMLTextAreaElement` / `as HTMLSelectElement`
- Create type-safe input event handler helper if pattern repeats
- Add ESLint rule to forbid `$any` in templates (already configured in `.eslintrc`)
- Run lint fix: `npm run lint -- --fix`

---

## Security Considerations

### Master Authentication Token Stored Separately from Main Auth

**Issue:** Master admin token stored in separate signal (`masterAuthState`) parallel to main auth, could lead to token sync bugs

**Files:** 
- `src/app/core/master/master-auth.signal.ts` — separate token storage
- `src/app/core/auth/auth.interceptor.ts` (lines 14-28) — routes `/master/` use master token
- `src/app/features/master/` — master tenant admin routes

**Risk:** 
- Two parallel auth systems can diverge (one logged out, one still active)
- Master token in memory could be accessed by wrong service
- Refresh logic doesn't coordinate between main and master tokens

**Current Mitigation:** 
- Each request checks which token to use based on URL pattern
- Logout clears both states

**Recommendations:** 
- Add integration test for master token refresh during main session
- Verify master logout clears both states
- Monitor for 401s on both master and tenant routes simultaneously
- Consider consolidating into single auth state with role separation

---

### Tenant Slug Extracted from Hostname Without Validation

**Issue:** Tenant slug parsed from hostname without validation, could allow directory traversal or injection if ever used in queries

**Files:** `src/environments/environment.ts` (lines 12-19)

**Risk (Low):** Currently only used as HTTP header value; minimal risk. But if used in URL paths or GraphQL queries later, injection becomes possible.

**Recommendations:** 
- Validate tenant slug matches pattern `^[a-z0-9-]+$` (alphanumeric, hyphens only)
- Reject if contains `.`, `/`, `..`, or other special chars
- Log rejections for security auditing
- Add unit test for invalid hostnames

---

## Performance Bottlenecks

### Excessive Resource Reloading After Mutations

**Issue:** Every mutation (add item, edit item, cancel item, close comanda) calls `this.resource.reload()` instead of optimistic updates or server-driven state via WebSocket

**Files:**
- `src/app/features/garcom/comanda/comanda-detalhe.component.ts` (lines 1110, 1137, 1192)
- `src/app/features/caixa/comanda/comanda-detalhe-caixa.component.ts` (similar pattern)
- `src/app/features/admin/produtos/produtos.component.ts` (similar pattern)

**Impact:** 
- User adds item → POST → reload all items → 2 API calls
- Perceived latency even on fast networks (round-trip to server required)
- If network drops mid-operation, user sees stale state
- Unnecessary full reloads of unmodified data

**Example:**
```typescript
// Current: slow
await this.garcomService.adicionarItem(...);
this.toast.success('Item added!');
this.comanda.reload();  // ← re-fetches entire comanda

// Better: optimistic
const optimisticId = crypto.randomUUID();
this.comanda.update(c => ({ ...c, itens: [...c.itens, { id: optimisticId, ... }] }));
await this.garcomService.adicionarItem(...);  // server confirms
// or: WebSocket broadcasts update → resource auto-updates
```

**Improvement path:** 
- Use `resource.update()` to mutate local state optimistically
- Rely on WebSocket to confirm/correct if server state differs
- For offline safety, track pending operations and replay on reconnect
- Measure: profile network waterfall before/after change

---

### FilaComponent Clock Update Every 1 Second on All Open Tabs

**Issue:** Every FilaComponent instance running setInterval every 1 second to update displayed time

**Files:** `src/app/features/cozinha/fila/fila.component.ts` (lines 497-499)

**Impact:** 
- If browser has 3 tabs with Fila open, 3 intervals running
- Each trigger causes signal update → template re-render
- Unnecessary CPU usage on idle tabs
- Potential frame jank if running on weak device

**Improvement path:** 
- Singleton clock service that updates once per second, shared across all instances
- Components subscribe to clock signal, no individual intervals
- Stop updating when tab loses focus (via Page Visibility API)
- Reduces from O(n) intervals to O(1)

---

## Fragile Areas

### ComandaDetalheComponent State Machine Has Edge Cases

**Issue:** UI state machine (`UiStep` = 'lista' | 'picker' | 'form' | 'edicao') can enter inconsistent states

**Files:** `src/app/features/garcom/comanda/comanda-detalhe.component.ts` (lines 25, 936)

**Fragile Paths:** 
1. User opens picker (uiStep = 'picker') → selects product (uiStep = 'form') → network error during add → uiStep stays 'form' → user can't go back or retry
2. User opens item edit (uiStep = 'edicao') → server error → uiStep stays 'edicao' → clicking cancel calls `fecharEdicao()` which resets quantities
3. Network reconnection during edit could trigger socket reload while form is open

**Safe Modification:** 
- Wrap state transitions in try-finally to guarantee reset on error
- Add `@if (comanda.error())` to reset uiStep
- Test: add item → simulate network error → verify state recoverable
- Consider state machine library if complexity grows

---

### CaixaService + CaixaComponents Missing Validation

**Issue:** Payment division and checkout logic trust server-side totals without client-side verification

**Files:**
- `src/app/features/caixa/comanda/comanda-detalhe-caixa.component.ts` — calculates `valorPorPessoa` locally but sends to server without re-confirming
- `src/app/features/caixa/caixa.service.ts` — no payload validation before POST

**Why Fragile:** 
- If component calculates wrong due to floating-point math error, mismatch with server goes undetected
- User sees "División: R$ 123.45 each" but server records different amount
- No reconciliation if payment is only partially processed

**Safe Modification:** 
- Add `validateDivisaoPagamento()` function that re-calculates from items before submitting
- Server returns calculated value, client compares, errors if mismatch
- Test with edge cases: 3-person split of R$ 100.00 = R$ 33.33 each (rounding)

---

### AdminService CRUD Operations Assume Success

**Issue:** Products, categories, mesas, users can be created/edited/deleted but no handling for partial failures or concurrent edits

**Files:**
- `src/app/features/admin/produtos/produtos.component.ts` (line 318+)
- `src/app/features/admin/categorias/categorias.component.ts` (lines 318+, 356+)
- Similar in: mesas, usuarios components

**Scenario:** 
- Admin A deletes category "Bebidas"
- Admin B edits product in "Bebidas" simultaneously
- Admin B's edit succeeds (category still exists on server)
- Admin B's UI still shows category as deleted (stale resource)

**Safe Modification:** 
- After each mutation, compare `resource.value()` timestamp with response timestamp
- If diverged, reload resource before showing success toast
- Show conflict dialog if user attempts edit on stale data

---

## Scaling Limits

### Socket.io Reconnection Configured for Infinite Retries

**Issue:** Socket reconnection set to infinite attempts with 30-second max delay

**Files:** `src/app/core/socket/socket.service.ts` (lines 34-37)

**Code:**
```typescript
reconnection: true,
reconnectionAttempts: Infinity,  // ← infinite retries
reconnectionDelay: 1000,
reconnectionDelayMax: 30000,
```

**Impact at Scale:** 
- Device offline for 1 hour → 120 reconnection attempts queued
- Each attempt fires `connect`, `disconnect`, `reconnecting` events
- Connections might pile up on server if reconnect listener buggy

**Limit:** Works for small deployments. At 1000+ concurrent users:
- Server might reject reconnection storm
- Browser might crash from event handler spam
- Battery drain on mobile (checking connection every 30 seconds)

**Scaling Path:** 
- Add max reconnection attempts (e.g., 10 tries = ~5 min of backoff, then alert user)
- Implement exponential backoff cap at 60 seconds instead of 30
- Use Service Worker to detect network state before attempting reconnect
- Notify user when offline: "Connection lost. We'll try to reconnect..." then "Reconnected" when back

---

### No Pagination on Admin CRUD Lists

**Issue:** Admin products, categories, mesas, usuarios all load entire list into memory

**Files:**
- `src/app/features/admin/produtos/produtos.component.ts` — loads all products
- `src/app/features/admin/categorias/categorias.component.ts` — loads all categories
- `src/app/features/admin/mesas/admin-mesas.component.ts` — loads all mesas
- `src/app/features/admin/usuarios/usuarios.component.ts` — loads all usuarios

**Current Capacity:** Works for < 1000 items. At 10K+ items:
- Initial load slows down (JSON parsing)
- Filtering/searching becomes sluggish (O(n) scan on every keystroke)
- Browser might lag or freeze

**Scaling Path:** 
- Implement server-side pagination: `GET /productos?page=1&limit=50&search=...`
- Add infinite scroll or "Load more" button to admin lists
- Cache results with etag to skip re-downloads
- Profile with 10K item dataset to find exact breaking point

---

## Dependencies at Risk

### Chart.js + ng2-charts Installed But May Be Unused

**Issue:** `chart.js` ^4.5.1 and `ng2-charts` ^10.0.0 in dependencies but no components found using them

**Files:** `package.json` (lines 23, 25)

**Risk:** 
- Unused dependency increases bundle size unnecessarily
- Security updates for chart.js add maintenance burden
- If removed later, might break build unexpectedly

**Verification:** 
- Grep for `Chart` or `ng2-charts` in `src/` → if no results, likely unused
- Check if `RelatoriosComponent` uses charting (common in dashboards)

**Recommendation:** 
- If relatórios component doesn't use charts, remove from `package.json` and `package-lock.json`
- If it does, add tests for chart rendering

---

### Socket.io-client v4.8.3 Could Have Blocking Bugs

**Issue:** Not at latest version (currently 4.8.3, latest is ~4.9.x)

**Files:** `package.json` (line 27)

**Risk:** 
- Known issues in 4.8.x around reconnection handling
- Browser compatibility issues with certain WebSocket fallbacks

**Recommendation:** 
- Update to `socket.io-client@^4.9.0` and test reconnection flows
- Check Socket.io security advisories: https://socket.io/releases

---

## Test Coverage Gaps

### WebSocket Event Subscriptions Never Tested

**Issue:** All components using `socketService.on()` have no tests

**Files:**
- `src/app/features/garcom/comanda/comanda-detalhe.component.ts` (ngOnInit lines 1002-1013)
- `src/app/features/cozinha/fila/fila.component.ts` (ngOnInit lines 502-514)
- `src/app/features/caixa/` components

**Risk:** 
- Socket event handlers can silently fail to register
- Reload logic might not trigger on event arrival
- Cleanup in ngOnDestroy might leak subscriptions

**Priority:** High

**What to Test:** 
- Emit `item:novo` event → verify `fila.reload()` called
- Verify unsubscribe removes listener (no duplicate handlers after route change)
- Test simultaneous events don't race (e.g., two `item:atualizado` events in quick succession)

---

### Authentication Refresh Flow Never Tested

**Issue:** Critical path of 401 → refresh token → retry request has no test

**Files:**
- `src/app/core/auth/auth.interceptor.ts` (lines 44-66) — the refresh logic
- `src/app/core/auth/auth.service.ts` (lines 37-46) — refresh endpoint call

**Risk:** 
- Refresh might fail silently in production
- Race condition if multiple requests hit 401 simultaneously
- Redirect to `/login` might not trigger if refresh returns 401

**Priority:** Critical

**Test Scenarios:** 
- Make request, server returns 401 → interceptor calls refresh → server returns new token → original request retried → succeeds
- Refresh token itself is expired → server returns 401 → user redirected to `/login`
- Two requests fail with 401 simultaneously → only one refresh call made (not two)

---

### Error States in resource() Never Rendered

**Issue:** `resource.error()` check exists in templates but error recovery untested

**Files:**
- Garcom: `src/app/features/garcom/comanda/comanda-detalhe.component.ts` (lines 87-95)
- Cozinha: `src/app/features/cozinha/fila/fila.component.ts`
- All Admin CRUD: template has retry button but no test

**Risk:** 
- Button click handler might not call `resource.reload()`
- Error message might hide actual error details (shows generic "Erro ao carregar")
- Network error vs. auth error vs. server error indistinguishable to user

**Priority:** Medium

**What to Test:** 
- Simulate API error (404, 500, timeout)
- Verify error UI shows (message + retry button)
- Click retry → verify `resource.reload()` called
- Verify error message includes enough detail for troubleshooting

---

*Concerns audit: 2026-07-30*
