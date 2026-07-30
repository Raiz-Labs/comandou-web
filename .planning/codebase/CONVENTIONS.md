# Coding Conventions

**Analysis Date:** 2026-07-30

## Naming Patterns

**Files:**
- Components: `kebab-case.component.ts` (e.g., `mesa-comandas.component.ts`)
- Services: `kebab-case.service.ts` (e.g., `garcom.service.ts`)
- Pipes: `kebab-case.pipe.ts` (e.g., `status-label.pipe.ts`)
- Directives: `kebab-case.directive.ts` (e.g., `touch-target.directive.ts`)
- Signals/State: `kebab-case.signal.ts` (e.g., `auth.signal.ts`)
- Tests: same filename as source + `.spec.ts` (e.g., `garcom.service.spec.ts`)

**Functions:**
- camelCase for all functions and methods (e.g., `buscarMesa`, `abrirComanda`)
- Private methods prefixed with `#` or use `private` keyword
- Event handlers use `on<EventName>` convention or verb-noun (e.g., `confirmarAbertura`, `fecharModalNome`)

**Variables:**
- camelCase for all variables and signals (e.g., `modalNomeAberto`, `nomeClienteInput`)
- Protected properties exposed to templates use `protected` keyword (e.g., `protected loading = signal(false)`)
- Private services use `private readonly` with explicit type (e.g., `private readonly authService = inject(AuthService)`)

**Types:**
- PascalCase for types and interfaces (e.g., `Usuario`, `StatusItem`, `Comanda`)
- Discriminated unions for status types (e.g., `type StatusItem = 'pendente' | 'em_preparo' | ...`)
- API payload types suffix with `Payload` or `Response` (e.g., `LoginPayload`, `LoginResponse`)

## Code Style

**Formatting:**
- Tool: Prettier (configured in `.prettierrc`)
- Print width: 100 characters
- Single quotes for strings: `'string'` not `"string"`
- HTML parser: Angular parser (via prettier overrides)
- Run via: `npm run lint` (linting only, formatting is automatic via editor)

**Linting:**
- Tool: ESLint with Angular plugins (`@angular-eslint/*`)
- TypeScript plugins: `@typescript-eslint/*`
- Key enforced rules:
  - `@angular-eslint/component-class-suffix`: 'error' — all components must end with `Component`
  - `@angular-eslint/directive-class-suffix`: 'error' — all directives must end with `Directive`
  - `@typescript-eslint/no-explicit-any`: 'warn' — avoid `any` types
  - `@typescript-eslint/no-unused-vars`: 'error' with `argsIgnorePattern: '^_'` — prefix unused params with `_`
  - `@angular-eslint/no-empty-lifecycle-method`: 'warn'
  - `@angular-eslint/template/no-negated-async`: 'warn'

**TypeScript Compiler:**
- `strict: true` — enables all strict type checks
- `noImplicitOverride: true` — override methods must use `override` keyword
- `noPropertyAccessFromIndexSignature: true` — prevent unsafe index access
- `noImplicitReturns: true` — all code paths must return
- `noFallthroughCasesInSwitch: true` — no case fallthrough without explicit break
- Target: `ES2022` with `module: 'preserve'`
- Template strictness: `strictTemplates: true`, `strictInputAccessModifiers: true`

**Run commands:**
```bash
npm run lint              # Check linting
npm run typecheck         # TypeScript type checking only
npm test                  # Run tests
```

## Import Organization

**Order:**
1. Angular core imports (`@angular/...`, `@angular-eslint/...`)
2. Third-party libraries (e.g., `rxjs`, `lucide-angular`, `socket.io-client`)
3. Relative imports from project (e.g., `../../core/auth/auth.service`)
4. Type-only imports grouped at end if needed

**Example:**
```typescript
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPayload } from '../../shared/types';
```

**Path Aliases:**
- No path aliases configured; use relative imports from project root (e.g., `../../core/...`)
- Absolute paths in node_modules only

## Error Handling

**Patterns:**

**In Services:**
- Let errors propagate as Promise rejections
- Wrap Observable calls with `firstValueFrom()` to convert to Promise
- Services throw errors naturally; callers handle them

```typescript
async login(payload: LoginPayload): Promise<void> {
  const response = await firstValueFrom(
    this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload)
  );
  // ...
}
```

**In Components:**
- Use try-catch-finally blocks for async operations
- Set a loading signal during operation
- Display errors via `ToastService.danger()` or inline error messages
- Clear loading signal in finally block

```typescript
async submit(): Promise<void> {
  this.loading.set(true);
  this.errorMessage.set('');
  try {
    await this.authService.login({ email: this.email, senha: this.senha });
  } catch {
    this.errorMessage.set('E-mail ou senha inválidos.');
  } finally {
    this.loading.set(false);
  }
}
```

**In HTTP Requests:**
- All HTTP calls go through `ApiService` (never inject `HttpClient` directly in components)
- `ApiService` methods return Observable; wrap with `firstValueFrom()` to get Promise
- Let services handle the Observable→Promise conversion

**Modal/Destructive Actions:**
- Use `ConfirmDialog` before cancel/delete operations
- Show success via `ToastService.success()`
- Show errors via `ToastService.danger()`

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- Use `console.log()` for debug info (will be stripped in production builds if configured)
- Use `console.error()` for errors only
- Avoid logging in production-critical paths; use sparingly

**No production logging is configured;** errors are handled via UI (Toast, error messages).

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic
- Why something is done (not what the code does)
- Important caveats or edge cases
- Access modifiers of public APIs (JSDoc for services)

**JSDoc/TSDoc:**
- Used sparingly; prefer self-documenting code
- Service methods often include brief JSDoc comment describing payload/return
- Components rarely need JSDoc (template is the interface)

**Example:**
```typescript
/**
 * Abre uma comanda para a mesa.
 * @param mesaId - ID da mesa
 * @param nomeCliente - Nome do cliente (opcional)
 * @returns Comanda recém-criada
 */
abrirComanda(mesaId: string, nomeCliente?: string): Promise<Comanda> {
  // ...
}

/** Garante touch target mínimo de 44px (WCAG 2.5.8 / b-system) */
@Directive(...)
export class TouchTargetDirective { ... }
```

## Function Design

**Size:**
- Small functions preferred; 50-100 lines is typical for complex operations
- Large components split into smaller methods or extracted into services
- Template logic limited; complex conditionals extracted to computed signals

**Parameters:**
- Limit to 3-4 positional parameters; use object for more
- Use Record/object types for flexible params: `params?: Record<string, string>`
- Required vs optional clearly marked with `?`

**Return Values:**
- Services return Promise (async operations) or Observable
- Components do not return values; use output() signal for parent communication
- Computed signals return values synchronously
- Methods that transform data return typed results

**Example:**
```typescript
// Service method
async abrirComanda(mesaId: string, nomeCliente?: string): Promise<Comanda> { ... }

// Component method
protected scrollParaCategoria(catId: string): void { ... }

// Computed signal
protected readonly categoriasComItens = computed((): CategoriaComProdutos[] => { ... });
```

## Module Design

**Exports:**
- Each file exports exactly one primary export (component, service, pipe, directive, type)
- Use `export` for public APIs; no `export default`
- Services: `@Injectable({ providedIn: 'root' })`
- Components/Pipes/Directives: `standalone: true` (no NgModule)

**Barrel Files:**
- Shared types exported from `src/app/shared/types/index.ts`
- No barrel files for components (import directly from component file)
- No barrel files for services (import directly from service file)

**Example:**
```typescript
// Recommended
import { Comanda } from '../../shared/types';
import { GarcomService } from '../garcom.service';

// Not recommended
import { Comanda } from '../../shared/types/index';
import * as Types from '../../shared/types';
```

## Component Structure

**Standalone Components:**
```typescript
@Component({
  selector: 'app-nome',
  standalone: true,
  imports: [CommonModule, OtherComponents, Pipes],
  template: `...`,  // inline for small/medium components
  // or templateUrl: './nome.component.html'  // for large components
  styles: [`...`],  // inline SCSS
  // or styleUrls: ['./nome.component.scss']  // for large components
})
export class NomeComponent {
  // Inject dependencies via inject()
  private readonly service = inject(NomeService);

  // Inputs with signal API
  readonly prop = input.required<Type>();
  readonly optional = input<Type>(defaultValue);

  // Outputs with signal API
  readonly clicked = output<EventType>();

  // Local state
  protected count = signal(0);
  protected computed = computed(() => this.count() * 2);

  // Methods
  protected handleClick(): void { ... }
}
```

**Template Control Flow:**
- Always use `@-syntax` (never `*ngIf`, `*ngFor`, `*ngSwitch`)
- `@if (condition) { ... } @else { ... }`
- `@for (item of list(); track item.id) { ... }`
- `@switch (status()) { @case ('value') { ... } @default { ... } }`

**Styling:**
- All colors/spacing/radius use b-system tokens: `var(--b-primary-500)`, `var(--b-space-4)`, `var(--b-radius-md)`
- No hardcoded colors or values
- Inline styles for simple components (< 50 lines)
- Separate SCSS file for larger components
- Use SCSS nesting for organization

**b-system Tokens Must-Knows:**
- `var(--b-bg)` — page background
- `var(--b-bg-elevated)` — card/modal background
- `var(--b-bg-sunken)` — input/textarea background
- `var(--b-primary-500)` — CTA orange (#D95C25)
- `var(--b-radius-sm)` — 8px (inputs/buttons)
- `var(--b-radius-md)` — 12px (cards)
- `var(--b-space-4)` — typical padding/margin
- `var(--b-shadow-1)` — light shadow for cards
- `var(--b-shadow-3)` — strong shadow for modals

---

*Conventions audit: 2026-07-30*
