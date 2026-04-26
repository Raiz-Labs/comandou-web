# /check-spec — Verificar conformidade com a spec

Audita o código atual contra a spec (`spec-frontend-v4.md`) e os padrões do `CLAUDE.md`.

## O que verificar

### 1. Segurança de autenticação
- JWT nunca em `localStorage` ou `sessionStorage`
- `authState` signal é a única fonte do token
- `withCredentials: true` nas requests que precisam do cookie

### 2. b-system Design System
- Buscar por valores hardcoded de cor (ex: `#`, `rgb(`, `hsl(`)
- Buscar por `border-radius` sem `var(--b-radius-`
- Buscar por `padding`/`margin` com valores px sem `var(--b-space-`
- Confirmar que Nunito está sendo usada via `var(--b-font-sans)`

### 3. Padrões Angular v21
- Buscar uso de `*ngIf`, `*ngFor`, `*ngSwitch` (devem ser @-syntax)
- Buscar `FormBuilder` ou `FormGroup` (devem ser Signal Forms)
- Buscar `HttpClient` injetado em componentes (deve ser via ApiService)
- Confirmar `standalone: true` em todos os componentes

### 4. Acessibilidade
- Touch targets < 44px em elementos interativos
- Atributos `aria-label` em botões sem texto visível
- Contraste adequado (tokens b-system garantem WCAG AA)

### 5. Status das tasks
- Comparar tasks marcadas como `[x]` no CLAUDE.md com o código existente
- Identificar tasks marcadas como concluídas mas incompletas

## Output esperado

Lista de não-conformidades encontradas com arquivo e linha, agrupadas por categoria.
Se não houver problemas: confirmação de conformidade por categoria.

## Argumento

$ARGUMENTS — escopo da verificação (ex: `auth`, `b-system`, `garcom`, ou vazio para checar tudo)
