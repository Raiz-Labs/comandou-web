# /task — Iniciar implementação de uma task

Dado o ID de uma task (ex: TASK-FE-010), implemente-a seguindo rigorosamente a spec e os padrões do CLAUDE.md.

## Passos obrigatórios

1. **Leia o CLAUDE.md** antes de qualquer coisa
2. **Identifique a task** em `tasks-frontend-v4.md` pelo ID fornecido
3. **Leia o stub existente** do componente alvo antes de modificá-lo
4. **Implemente** seguindo:
   - Padrões Angular v21 (Signals, Signal Forms, resource(), standalone)
   - b-system tokens (sem hardcode de cor/espaçamento/radius)
   - Touch targets mínimos 44px em views mobile/tablet
   - Skeleton durante loading, Toast para feedback de ações
   - ConfirmDialog antes de ações destrutivas
5. **Atualize** o status da task no `CLAUDE.md` de `[ ]` para `[x]`
6. **Commit** com a mensagem no formato:
   ```
   feat: <descrição curta> (TASK-FE-XXX)
   ```

## Argumento

$ARGUMENTS — ID da task (ex: `TASK-FE-010`) ou nome da feature (ex: `grid de mesas`)
