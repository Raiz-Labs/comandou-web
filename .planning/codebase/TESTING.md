# Testing Patterns

**Analysis Date:** 2026-07-30

## Test Framework

**Runner:**
- Vitest 4.0.8
- Uses Jasmine-style globals (describe, it, expect, beforeEach, afterEach)
- Configured via `tsconfig.spec.json` with `vitest/globals` type definitions
- Angular TestBed for component testing

**Assertion Library:**
- Vitest built-in expect + Jasmine matchers
- Matchers: `expect(value).toBe()`, `toEqual()`, `toBeUndefined()`, `toHaveBeenCalled()`, `toHaveBeenCalledWith()`, etc.

**Run Commands:**
```bash
npm test                    # Run all tests (watches by default with Vitest)
npm test -- --run           # Run once and exit
npm test -- --coverage      # Generate coverage report
ng test                     # Angular CLI version (same as npm test)
```

## Test File Organization

**Location:**
- Co-located with source files in same directory
- Same filename + `.spec.ts` suffix (e.g., `garcom.service.ts` → `garcom.service.spec.ts`)

**Naming:**
- Service specs: `ServiceName.service.spec.ts`
- Component specs: `ComponentName.component.spec.ts`
- Test suites describe what is being tested: `describe('GarcomService — abrirComanda', ...)`

**Structure:**
```
src/app/
  core/
    auth/
      auth.service.ts
      auth.service.spec.ts
  features/
    garcom/
      garcom.service.ts
      garcom.service.spec.ts
      comanda/
        mesa-comandas.component.ts
        mesa-comandas.component.spec.ts
```

## Test Structure

**Suite Organization:**

```typescript
describe('GarcomService — abrirComanda', () => {
  let service: GarcomService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GarcomService, ApiService],
    });
    service = TestBed.inject(GarcomService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'value';
    // Act
    const result = service.method(input);
    // Assert
    expect(result).toBe('expected');
  });
});
```

**Patterns:**

- Each test: "should [specific behavior]" (e.g., `should apply trim on nomeCliente before sending`)
- Use `beforeEach()` to set up TestBed and inject services
- Use `afterEach()` to verify HTTP mocks and reset TestBed
- Arrange-Act-Assert (AAA) structure within each test
- Group related tests in one `describe()` block focusing on a single method or feature

## Mocking

**Framework:** Vitest `vi` utility + TestBed providers

**Mock Services:**

```typescript
import { vi } from 'vitest';

const garcomServiceMock = {
  buscarMesa: vi.fn().mockResolvedValue(makeMesa()),
  listarComandasDaMesa: vi.fn().mockResolvedValue([]),
  abrirComanda: vi.fn().mockResolvedValue(makeComanda()),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup mocks if needed
  garcomServiceMock.buscarMesa.mockResolvedValue(makeMesa());
});

// In test
await TestBed.configureTestingModule({
  imports: [ComponentToTest],
  providers: [
    { provide: GarcomService, useValue: garcomServiceMock },
  ],
}).compileComponents();

// Use mock
expect(garcomServiceMock.abrirComanda).toHaveBeenCalledWith('mesa-1', 'João');
```

**Mock Signals:**

```typescript
const socketMock = {
  on: () => of(null),  // Return observable
  connectionStatus: signal('connected' as const),
};

{ provide: SocketService, useValue: socketMock }
```

**What to Mock:**
- External services (HTTP, WebSocket, Router, ActivatedRoute)
- Third-party integrations
- Services injected into component under test

**What NOT to Mock:**
- Signals, computed, effect — test with real signals
- Pipes, directives — test with real implementations
- Local methods of component under test — call directly
- b-system utilities — include in test

## Fixtures and Factories

**Test Data:**

Factory functions create consistent test objects:

```typescript
const makeMesa = (overrides: Partial<Mesa> = {}): Mesa => ({
  id: 'mesa-1',
  numero: 1,
  status: 'livre',
  descricao: undefined,
  ...overrides,
});

const makeComanda = (overrides: Partial<Comanda> = {}): Comanda => ({
  id: 'abc-123',
  mesaId: 'mesa-1',
  itens: [],
  total: 0,
  aberta: true,
  criadoEm: new Date().toISOString(),
  ...overrides,
});
```

**Usage in Tests:**

```typescript
it('should handle comanda with items', async () => {
  const comanda = makeComanda({ itens: [makeItemComanda()] });
  const result = await service.buscarComanda('abc-123');
  expect(result.itens.length).toBe(1);
});
```

**Location:**
- Define factories at top of test file, after imports
- Use for any repeated test data setup
- Reduces duplication, makes tests more readable

## Coverage

**Requirements:** Not enforced (no coverage thresholds configured)

**View Coverage:**
```bash
npm test -- --coverage
```

Coverage report generates in `coverage/` directory. No CI/CD gates enforce minimums.

## Test Types

**Unit Tests:**
- **Scope:** Single service method or component behavior
- **Approach:** Isolate unit via mocks; test inputs and outputs
- **Example:** Test `abrirComanda()` with different payloads (with/without nomeCliente, with whitespace)
- **Location:** Same `.spec.ts` file as source

**Integration Tests:**
- **Scope:** How components/services interact (e.g., component + service + HTTP)
- **Approach:** Use real services (except HTTP), mock HTTP requests via `HttpTestingController`
- **Example:** Test component's `confirmarAbertura()` calls service, service makes HTTP request with correct body
- **Location:** Same `.spec.ts` file (prefixed with "integration" comment or separate suite)

**E2E Tests:**
- **Framework:** Not configured (would use Cypress or Playwright)
- **Status:** Not implemented

## Common Patterns

**Async Testing:**

```typescript
it('should handle async operation', async () => {
  const promise = service.abrirComanda('mesa-1', 'João');
  
  // Assert request was made
  const req = httpMock.expectOne(r => r.url.includes('/comandas'));
  expect(req.request.body).toEqual({ mesaId: 'mesa-1', nomeCliente: 'João' });
  
  // Respond to request
  req.flush(makeComanda({ nomeCliente: 'João' }));
  
  // Assert result
  const result = await promise;
  expect(result.nomeCliente).toBe('João');
});
```

**Error Testing:**

```typescript
it('should handle error from service', async () => {
  garcomServiceMock.abrirComanda.mockRejectedValue(new Error('server error'));
  const fixture = TestBed.createComponent(MesaComandasComponent);
  const comp = fixture.componentInstance;
  
  await comp['confirmarAbertura']();
  
  expect(toastMock.danger).toHaveBeenCalled();
});
```

**Component Signal Testing:**

```typescript
it('should initialize with modal closed', () => {
  const fixture = TestBed.createComponent(MesaComandasComponent);
  const comp = fixture.componentInstance;
  
  expect(comp['modalNomeAberto']()).toBe(false);
});

it('should open modal and clear input', () => {
  const fixture = TestBed.createComponent(MesaComandasComponent);
  const comp = fixture.componentInstance;
  comp['nomeClienteInput'] = 'previous value';
  
  comp['abrirModalNome']();
  
  expect(comp['modalNomeAberto']()).toBe(true);
  expect(comp['nomeClienteInput']).toBe('');
});
```

**HTTP Testing Pattern:**

```typescript
const req = httpMock.expectOne((request) => request.url.includes('/endpoint'));
expect(req.request.method).toBe('POST');
expect(req.request.body).toEqual({ key: 'value' });
req.flush(mockResponse);
httpMock.verify();  // in afterEach
```

## Test Imports

**Standard imports per test type:**

**Service Test:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ServiceToTest } from './service-to-test.service';
```

**Component Test:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { ComponentToTest } from './component-to-test.component';
import { DependencyService } from '../../core/service.service';
```

## Key Testing Practices

**Test Isolation:**
- Use `beforeEach()` to set up fresh state
- Clear mocks with `vi.clearAllMocks()` before each test
- Use `afterEach()` to verify all HTTP requests were expected and clean up

**Readable Test Names:**
- Describe the scenario and expected behavior: `should apply trim on nomeCliente before sending`
- Not just what is called: ❌ "should call abrirComanda" → ✅ "should include nomeCliente in payload when provided"

**Mock Reset:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Reset mock return values
  garcomServiceMock.abrirComanda.mockResolvedValue(makeComanda());
});
```

**HTTP Verification:**
```typescript
afterEach(() => {
  httpMock.verify();  // Fails if unexpected requests were made
});
```

**Component Fixture:**
```typescript
const fixture = TestBed.createComponent(MesaComandasComponent);
const comp = fixture.componentInstance;  // Access component instance
fixture.detectChanges();  // Trigger change detection
await fixture.whenStable();  // Wait for async operations
```

## Coverage Targets (Informational)

Current test files exist for:
- `src/app/app.spec.ts` — AppComponent
- `src/app/features/garcom/garcom.service.spec.ts` — GarcomService
- `src/app/features/garcom/comanda/mesa-comandas.component.spec.ts` — MesaComandasComponent

Majority of codebase lacks test coverage. Adding tests follows patterns established in these files.

---

*Testing analysis: 2026-07-30*
