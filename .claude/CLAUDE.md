# CLAUDE.md — Comandou Web

Guia de desenvolvimento para o Claude trabalhar neste repositório.
Leia este arquivo antes de qualquer tarefa.

---

## 1. Visão Geral do Projeto

**Comandou** é um sistema de comandas para restaurantes entregue como PWA.
Cada restaurante acessa pelo seu subdomínio (`restaurante.comandou.com.br`).

4 perfis de usuário com interfaces distintas:
- **garcom** → gestão de mesas e pedidos (mobile)
- **cozinha** → fila de itens em tempo real (tablet/TV)
- **caixa** → fechamento e divisão de conta (desktop/tablet)
- **admin** → CRUD completo + relatórios (desktop)

---

## 2. Stack — Decisões Fixas

| Camada | Tecnologia | Observação |
|--------|-----------|------------|
| Framework | Angular v21 | Standalone components obrigatório |
| Estado | Angular Signals | Nunca NgRx ou BehaviorSubject para estado global |
| Formulários | Signal Forms (Angular v21) | Nunca ReactiveFormsModule legado |
| Dados async | `resource()` API | Para queries simples; Observable apenas se necessário |
| HTTP | HttpClient + authInterceptor | Sempre via ApiService, nunca HttpClient direto nos components |
| WebSocket | Socket.io-client | Sempre via SocketService singleton |
| Estilo | b-system tokens + SCSS | Nunca bibliotecas externas (Material, PrimeNG, etc.) |
| Ícones | Lucide (CDN) | `<i data-lucide="nome">` com width/height inline |
| Tipografia | Nunito (Google Fonts) | Já carregada no index.html |
| Deploy | Vercel | Build: `ng build --configuration production` |

---

## 3. Estrutura de Pastas

```
src/app/
  core/
    auth/           — auth.signal.ts · auth.service.ts · auth.interceptor.ts · auth.guard.ts
    socket/         — socket.service.ts
    api/            — api.service.ts
  features/
    login/
    garcom/
      mesas/        — MesasComponent
      comanda/      — MesaComandasComponent · ComandaDetalheComponent
    cozinha/
      fila/         — FilaComponent
    caixa/
      comandas/     — ComandasListaComponent
      comanda/      — ComandaDetalheCaixaComponent
    admin/
      dashboard/    — DashboardComponent
      produtos/     — ProdutosComponent
      categorias/   — CategoriasComponent
      mesas/        — AdminMesasComponent
      usuarios/     — UsuariosComponent
      relatorios/   — RelatoriosComponent
    cardapio/       — CardapioComponent
  shared/
    components/     — toast · modal · skeleton · status-badge · connection-banner · confirm-dialog
    pipes/          — currency-br · status-label
    directives/     — touch-target
    types/          — index.ts (tipos espelhando o backend)
src/
  assets/b-system/  — colors_and_type.css (tokens)
  styles/           — global.scss · _b-utils.scss
  environments/     — environment.ts · environment.prod.ts
```

**Regra:** cada feature é um diretório dentro de `features/`. Nunca criar componentes de feature dentro de `shared/` ou `core/`.

---

## 4. Padrões Angular v21 — Obrigatório Seguir

### Componentes
```typescript
// Sempre standalone: true
@Component({
  selector: 'app-nome',
  standalone: true,
  imports: [...],
  template: `...`,   // template inline para componentes pequenos/médios
  // ou templateUrl para componentes grandes
})
export class NomeComponent {
  // Injeção via inject(), nunca pelo construtor
  private readonly service = inject(NomeService);

  // Inputs com input() signal
  readonly valor = input.required<string>();
  readonly opcional = input<number>(0);

  // Outputs com output()
  readonly alterado = output<string>();

  // Estado local com signal()
  protected loading = signal(false);
  protected dados = signal<Tipo[]>([]);
}
```

### Signals
```typescript
// Estado global — sempre em arquivos .signal.ts
export const authState = signal<AuthState>({ ... });
export const currentUser = computed(() => authState().user);

// Estado local — dentro do componente
protected count = signal(0);
protected dobro = computed(() => this.count() * 2);

// Efeitos colaterais
effect(() => {
  console.log('mudou:', this.count());
});
```

### resource() para dados assíncronos
```typescript
protected comandas = resource({
  loader: () => firstValueFrom(this.apiService.get<Comanda[]>('/comandas'))
});
// uso no template:
// @if (comandas.isLoading()) { <app-skeleton> }
// @if (comandas.value()) { ... }
// @if (comandas.error()) { ... }
```

### Signal Forms
```typescript
import { FormField, Validators } from '@angular/forms';

protected nome = new FormField('', [Validators.required, Validators.minLength(2)]);
protected preco = new FormField(0, [Validators.required, Validators.min(0.01)]);
// Nunca usar FormBuilder ou FormGroup legado
```

### Control flow — sempre @-syntax (nunca *ngIf / *ngFor)
```html
@if (loading()) { <app-skeleton /> }
@else { <div>conteúdo</div> }

@for (item of lista(); track item.id) { <div>{{ item.nome }}</div> }

@switch (status()) {
  @case ('pendente') { <span>Pendente</span> }
  @default { <span>—</span> }
}
```

---

## 5. b-system — Regras Inegociáveis

### Nunca usar valores hardcoded de cor, espaçamento ou radius
```scss
// ❌ ERRADO
color: #D95C25;
border-radius: 12px;
padding: 16px;

// ✅ CORRETO
color: var(--b-primary-500);
border-radius: var(--b-radius-md);
padding: var(--b-space-4);
```

### Tokens obrigatórios por contexto
| Contexto | Token |
|----------|-------|
| Background geral | `var(--b-bg)` → #FBF8F3 |
| Cards / modais | `var(--b-bg-elevated)` → #FFFFFF |
| Inputs / áreas sunken | `var(--b-bg-sunken)` |
| Texto principal | `var(--b-fg)` |
| Texto secundário | `var(--b-fg-muted)` |
| CTA / primary | `var(--b-primary-500)` → #D95C25 |
| Cards radius | `var(--b-radius-md)` → 12px |
| Botões/inputs radius | `var(--b-radius-sm)` → 8px |
| Modais radius | `var(--b-radius-lg)` → 16px |
| Cards shadow | `var(--b-shadow-1)` |
| Modais shadow | `var(--b-shadow-3)` |

### Classes utilitárias disponíveis (em _b-utils.scss)
- Botões: `.b-btn-primary`, `.b-btn-secondary`, `.b-btn-danger`, `.b-btn-ghost`
- Inputs: `.b-input`, `.b-label`, `.b-error-message`
- Cards: `.b-card`, `.b-card-sm`
- Texto: `.b-text-muted`, `.b-text-subtle`, `.b-text-primary`
- Layout: `.b-flex`, `.b-flex-center`, `.b-flex-between`, `.b-w-full`
- Skeleton: `.b-skeleton`
- Animação mesa com item pronto: `.b-pulse-accent`

### Touch targets
- Todo botão/link interativo: mínimo 44×44px
- Usar `bTouchTarget` directive ou `min-height: 44px` no SCSS
- Crítico nas views de garçom (mobile) e cozinha (tablet)

### Responsividade
```scss
// Breakpoints b-system
// mobile: < 768px (garçom)
// tablet: 768px–1023px (cozinha)
// web: >= 1024px
// admin: >= 1280px (admin)

@media (max-width: 767px) { /* mobile */ }
@media (min-width: 768px) { /* tablet+ */ }
@media (min-width: 1024px) { /* desktop */ }
```

---

## 6. Autenticação — Regras de Segurança

- **JWT armazenado APENAS em `authState` signal (memória)**
- **Nunca `localStorage`, `sessionStorage` ou cookie acessível via JS**
- Refresh token em cookie `httpOnly` — o browser envia automaticamente
- Toda request passa pelo `authInterceptor` (já configurado no `app.config.ts`)
- Em caso de 401: interceptor faz refresh automático → reenvia request
- Se refresh falhar: `clearAuth()` + redirect `/login`
- Extrair tenant slug de `window.location.hostname` (já em `environment.ts`)

---

## 7. WebSocket — Padrões

```typescript
// Sempre via SocketService, nunca instanciar Socket.io diretamente
private readonly socket = inject(SocketService);

ngOnInit() {
  // Escutar evento tipado
  this.socket.on<ItemComanda>('item:atualizado').subscribe(item => {
    // atualizar signal local
  });
}

// Verificar status de conexão
// socket.connectionStatus() → 'connected' | 'disconnected' | 'reconnecting'
// ConnectionBannerComponent já exibe banner automático quando offline
```

**Eventos disponíveis** (definidos em `WsEvent` em `shared/types/index.ts`):
- `item:novo` — novo item adicionado a uma comanda
- `item:atualizado` — status do item mudou
- `item:cancelado` — item foi cancelado
- `comanda:aberta` — nova comanda criada
- `comanda:fechada` — comanda foi fechada

---

## 8. Componentes Shared — Quando Usar

| Componente | Quando usar |
|-----------|-------------|
| `<app-toast>` | Já no app root. Injetar `ToastService` e chamar `.success()`, `.danger()`, etc. |
| `<app-skeleton>` | Durante `resource.isLoading()` ou qualquer loading state |
| `<app-status-badge [status]="item.status">` | Para exibir status de item de comanda |
| `<app-confirm-dialog>` | Antes de qualquer ação destrutiva (cancelar item, fechar comanda) |
| `<app-connection-banner>` | Já usado nos layouts com WebSocket — não adicionar manualmente |

---

## 9. Status das Tasks

### Concluídas (setup)
- [x] TASK-FE-001 — Angular v21 inicializado
- [x] TASK-FE-002 — b-system Design System configurado
- [x] TASK-FE-003 — Roteamento com lazy loading e guards
- [x] TASK-FE-004 — AuthService, AuthInterceptor, authState signal
- [x] TASK-FE-005 — SocketService com reconexão automática
- [x] TASK-FE-006 — Shared components (Toast, Skeleton, StatusBadge, ConfirmDialog, ConnectionBanner)
- [x] TASK-FE-007 — PWA manifest configurado
- [x] TASK-FE-008 — GitHub Actions CI
- [x] TASK-FE-009 — Tela de login

### Pendentes (stubs criados, aguardando implementação)
- [ ] TASK-FE-010 — Grid de mesas (garçom)
- [ ] TASK-FE-011 — Comandas da mesa e abertura (garçom)
- [ ] TASK-FE-012 — Detalhe da comanda e adição de itens (garçom)
- [ ] TASK-FE-013 — Cancelamento e edição de itens (garçom)
- [ ] TASK-FE-014 — Notificação de item pronto (garçom)
- [ ] TASK-FE-015 — Fila da cozinha em tempo real
- [ ] TASK-FE-016 — Listagem de comandas abertas (caixa)
- [ ] TASK-FE-017 — Detalhe, fechamento e divisão (caixa)
- [ ] TASK-FE-018 — Dashboard do admin
- [ ] TASK-FE-019 — CRUD de Produtos com Signal Forms
- [ ] TASK-FE-020 — CRUD de Categorias e Mesas
- [ ] TASK-FE-021 — CRUD de Usuários
- [ ] TASK-FE-022 — Relatório de vendas
- [ ] TASK-FE-023 — Cardápio público

---

## 10. O que Nunca Fazer

- ❌ Instalar bibliotecas de UI (Angular Material, PrimeNG, Tailwind, Bootstrap)
- ❌ Usar `localStorage` ou `sessionStorage` para qualquer dado de auth
- ❌ Usar `*ngIf`, `*ngFor`, `*ngSwitch` (usar @-syntax)
- ❌ Usar `ReactiveFormsModule` ou `FormBuilder` (usar Signal Forms)
- ❌ Injetar `HttpClient` diretamente em componentes (usar `ApiService`)
- ❌ Instanciar `socket.io-client` fora do `SocketService`
- ❌ Usar cores, espaçamentos ou radius hardcoded no SCSS
- ❌ Criar módulos NgModule (projeto é 100% standalone)
- ❌ Usar `any` no TypeScript (strict: true ativado)
- ❌ Adicionar lógica de negócio em componentes (extrair para services)
