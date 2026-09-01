# Recarregar listas do admin ao voltar o foco da aba

- **Issue:** #17 — https://github.com/Raiz-Labs/comandou-web/issues/17
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

A issue original pedia 3 coisas pra evitar admin operando sobre dado obsoleto: (1) comparar timestamp após cada mutação e recarregar se divergir, (2) recarregar o recurso antes do toast de sucesso, (3) diálogo de conflito ao editar dado obsoleto. O commit `c23592a` (01/08/2026, mensagem "Closes #10, #17") já cobriu o cenário concreto descrito na issue: hoje, salvar ou excluir um registro contra uma referência que outro admin já removeu/alterou (categoria excluída, número de mesa duplicado, registro já apagado) mostra mensagem específica e recarrega o recurso — nas 4 telas (produtos, categorias, mesas, usuários). Excluir algo que já foi excluído por outro admin também virou sucesso idempotente em vez de erro. O "Closes #17" desse commit não fechou a issue no GitHub (não estava vinculado a um PR com esse texto no corpo), então ela ficou órfã, aberta, mesmo com a maior parte do trabalho já feita.

O que sobra é um caso passivo, não coberto pelo tratamento reativo existente: um admin com uma dessas listas **aberta e parada** — sem editar nem salvar nada — não tem nenhuma forma de saber que os dados mudaram em outro lugar. Só descobre se tentar interagir com algo que já mudou (aí cai no tratamento reativo já existente) ou se recarregar a página manualmente.

## Escopo

**Dentro:**
- Recarregar a listagem de cada uma das 4 telas do admin (produtos, categorias, mesas, usuários) quando a aba volta a ficar visível depois de ter ficado em background — usa a Page Visibility API nativa do browser, mesmo mecanismo que `RelogioService` (`src/app/core/relogio/relogio.service.ts`) já usa pra pausar/retomar o relógio;
- Utilitário pequeno e reutilizável pra registrar esse listener com cleanup automático (`DestroyRef`), evitado repetir `addEventListener`/`removeEventListener` em 4 componentes;
- Aplicado só ao `resource()` principal de listagem de cada tela (o array de produtos/categorias/mesas/usuários) — não a cada resource secundário (ex.: o `categorias` usado só pra popular o dropdown dentro do painel de produto, que é escopo da spec da #45).

**Fora:**
- Comparação de timestamp por mutação (item 1 do plano original) — o tratamento reativo já existente (recarregar + mensagem específica quando o backend rejeita a mutação por 404/409/422) já cobre o caso de mutação contra dado obsoleto; adicionar diff de timestamp por cima disso é reforçar algo que já funciona, sem caso concreto que o justifique;
- Diálogo de conflito antes de editar (item 3 do plano original) — mesma razão: o admin já é avisado e o recurso já recarrega quando a mutação de fato conflita; interromper a edição com um diálogo antes disso é fricção extra sem sinal de que o toast+reload reativo esteja insuficiente;
- Eventos em tempo real via WebSocket (`categoria:atualizada`, `produto:atualizado`, etc.) — decisão explícita de não criar essa infra nova no backend pra um risco "Médio" num painel de baixa concorrência; recarregar ao focar a aba cobre o caso comum (admin trocou de aba/app e voltou) a custo bem menor;
- Qualquer mudança no tratamento reativo já existente (404/409/422 nas 4 telas) — já funciona, não é tocado;
- Recarregar em polling/intervalo enquanto a aba está visível — só recarrega na transição de invisível → visível, não fica com um `setInterval` rodando.

## Abordagem

Novo utilitário em `src/app/shared/utils/recarregar-ao-focar.ts`, algo como:
```ts
export function recarregarAoFocar(callback: () => void): void {
  const destroyRef = inject(DestroyRef);
  const listener = () => {
    if (document.visibilityState === 'visible') callback();
  };
  document.addEventListener('visibilitychange', listener);
  destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', listener));
}
```
Chamado uma vez no construtor/campo de cada um dos 4 componentes (contexto de injeção válido, mesmo padrão de `inject()` usado em todo o resto do projeto), ex. em `produtos.component.ts`: `recarregarAoFocar(() => this.produtos.reload())`.

Reaproveita o padrão de Page Visibility já validado em produção pelo `RelogioService`, mas como um utilitário chamado por componente (não um singleton `providedIn: 'root'`) porque cada tela precisa recarregar um `resource()` diferente — não faz sentido centralizar isso num serviço único.

Como o painel de edição (`abrirEditar()`) copia os campos do registro pra um `model` signal local em vez de manter uma referência viva ao item da lista, recarregar a lista por baixo enquanto o painel está aberto não corrompe o formulário em edição — se o registro editado tiver sido removido nesse meio tempo, o `catch` do `salvar()` já existente cobre isso ao submeter.

## Critério de aceite

- [x] Deixar a aba em background e voltar recarrega a lista principal das 4 telas (produtos, categorias, mesas, usuários);
- [x] Carregar a tela pela primeira vez não dispara um reload duplicado (o listener só age na transição pra `visible`, não no mount inicial);
- [x] Ter o painel de criar/editar aberto e trocar de aba e voltar não perde o que o admin já tinha digitado no formulário;
- [x] Nenhum `setInterval`/polling fica ativo — só o listener de `visibilitychange`;
- [x] Teste cobre o utilitário `recarregarAoFocar`: dispara o callback quando `visibilitychange` ocorre com `document.visibilityState === 'visible'`, não dispara quando fica `hidden`, e remove o listener ao destruir o componente.

## Resultado da implementação

Confirmado ao vivo no browser (não só nos testes unitários): reload dispara só na transição pra `visible` (nenhuma request ao ficar oculto, uma request ao voltar), e o painel de "Novo produto" aberto com texto digitado sobrevive ao ciclo oculto→visível sem perder o que estava no formulário.

O PR desta spec usa "Closes #17" no corpo — diferente do commit `c23592a`, que não estava vinculado a nenhum PR e por isso nunca fechou a issue automaticamente.
