# Comandou — Web

Interface web do sistema **Comandou** — PWA Angular para gestão de comandas em restaurantes.

## Stack

- **Angular v21** — Signals, Signal Forms, `resource()`, standalone components
- **b-system Design System** — Terracotta/Cream, Nunito, Lucide Icons
- **Socket.io-client** — WebSocket em tempo real
- **Chart.js + ng2-charts** — Relatórios
- **Vercel** — Deploy e CI/CD

## Perfis de Acesso

| Perfil  | Rota inicial         |
|---------|----------------------|
| garcom  | `/garcom/mesas`      |
| cozinha | `/cozinha/fila`      |
| caixa   | `/caixa/comandas`    |
| admin   | `/admin/dashboard`   |

## Estrutura

```
src/app/
  core/
    auth/         — AuthService, AuthGuard, AuthInterceptor, authState signal
    socket/       — SocketService (singleton, reconexão automática)
    api/          — ApiService (HttpClient base)
  features/
    login/        — ÉPICO 2
    garcom/       — ÉPICO 3
    cozinha/      — ÉPICO 4
    caixa/        — ÉPICO 5
    admin/        — ÉPICO 6
    cardapio/     — ÉPICO 7
  shared/
    components/   — Toast, Modal, Skeleton, StatusBadge, ConfirmDialog, ConnectionBanner
    pipes/        — currencyBr, statusLabel
    directives/   — touchTarget
    types/        — Tipos espelhando o backend
```

## Setup

```bash
npm install
npm start          # Dev server: http://localhost:4200
npm run build      # Build produção
npm run typecheck  # Checagem de tipos
npm run lint       # ESLint
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e configure:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
VITE_TENANT_SLUG=dev
```

## Autenticação

- JWT armazenado apenas em memória via **Signal** (`authState`)
- Refresh token em **cookie httpOnly** (sem acesso via JS)
- `AuthInterceptor` injeta token e faz refresh automático em 401
- Guards por perfil em todas as rotas protegidas
- JWT **nunca** em localStorage
