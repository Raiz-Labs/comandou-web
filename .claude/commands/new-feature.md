# /new-feature — Criar scaffold de nova feature

Cria a estrutura completa de uma nova feature seguindo os padrões do projeto.

## O que será criado

Dado o argumento `$ARGUMENTS` (ex: `garcom/historico`), criar:

```
src/app/features/<feature>/
  <nome>.component.ts     — componente standalone com b-system
  <nome>.service.ts       — service com ApiService injetado (se necessário)
  <nome>.routes.ts        — rota lazy loading (se feature própria)
```

## Padrões obrigatórios no scaffold

### Componente
- `standalone: true`
- `inject()` para dependências (nunca construtor)
- `resource()` para dados assíncronos
- `<app-skeleton>` durante loading
- `<app-connection-banner>` se usar WebSocket
- Estilos apenas com tokens `var(--b-*)`
- Template com `@if / @for / @switch` (nunca *ngIf/*ngFor)

### Service
- `providedIn: 'root'`
- Usar `ApiService` para HTTP (nunca HttpClient direto)
- Usar `SocketService` para WebSocket (nunca socket.io direto)
- Métodos retornam `Observable<T>` ou `Promise<T>`

### Rota
- Adicionar em `app.routes.ts` com `loadComponent`
- Aplicar `perfilGuard(['perfil'])` adequado

## Argumento

$ARGUMENTS — caminho relativo da feature (ex: `garcom/historico`)
