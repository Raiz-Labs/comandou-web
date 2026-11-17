# Investigação: categorias somem no formulário de produto

- **Issue:** #45 — https://github.com/Raiz-Labs/comandou-web/issues/45
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

Issue reporta app travando e "sumindo" as categorias de produtos após reiniciar. A única evidência é um print (sem passos de reprodução, sem log de console/network, sem comentários adicionais na issue).

Analisando o print: a tela é o painel "Novo produto" aberto, com o select "Categoria" mostrando só o placeholder "Selecione uma categoria" — nenhuma opção real. Ao mesmo tempo, a tabela de produtos ao fundo segue populada normalmente, com produtos exibindo a categoria "Espetos" na coluna Categoria. Isso é uma contradição relevante: se as categorias tivessem sido de fato apagadas no banco, os produtos não teriam mais `categoria.nome` pra mostrar. O nome da categoria na tabela vem embutido no objeto de cada produto (join do backend); o dropdown do painel vem de uma chamada separada (`GET /categorias`). Isso aponta pra uma falha **só na busca do dropdown**, não pra perda de dado real.

Confirmado lendo `produtos.component.ts` (linha 319-320 em `origin/main`):
```ts
protected readonly categorias = resource({
  loader: () => this.adminService.listarCategorias(),
});
```
e no template (linha 205): `@for (cat of categorias.hasValue() ? categorias.value() : []; track cat.id) { ... }` — sem nenhum `@if (categorias.error())`, sem indicação de loading, sem botão de retry. Se a chamada a `/categorias` falhar (timeout, 401 transitório, erro 500) ou ainda estiver em voo, o template silenciosamente renderiza `[]` — o usuário vê um dropdown vazio, sem nenhum sinal de que algo deu errado, e não tem como tentar de novo a não ser recarregar a página inteira.

Contraste: o `resource` de `produtos` no mesmo arquivo *tem* tratamento de erro (`@else if (produtos.error())`, linha 90), e a tela dedicada de Categorias (`categorias.component.ts`, linha 80) também trata `categorias.error()`. O ponto que falta é especificamente o `resource` de categorias usado **só para popular o `<select>` dentro do painel de produto**.

Isso explica o "sumiram as categorias" sem exigir perda de dado no banco. Não explica com certeza o "travou a aplicação" — essa parte do relato ainda não tem evidência técnica (sem stack trace, sem print de erro no console) e pode ser só a percepção do usuário ao ver o formulário "quebrado" (campo obrigatório sem opção pra preencher). Por isso a issue pede investigação, não só correção direta.

## Escopo

**Dentro:**
- Reproduzir a falha de forma controlada (simular erro/timeout em `GET /categorias` isolado de `GET /produtos`) pra confirmar a hipótese acima antes de mexer em código;
- Checar se há indício de perda de dado real: confirmar com o usuário/backend se a categoria "Espetos" (e demais) ainda existiam no banco logo após o incidente relatado — sem isso, não faz sentido tratar como bug de dado;
- Corrigir `categorias` resource em `produtos.component.ts` (linhas 319-320 e 205) pra parar de mascarar erro como lista vazia: exibir estado de erro visível no dropdown/painel com opção de tentar novamente (`categorias.reload()`), consistente com o padrão já usado pro `resource` de `produtos` no mesmo arquivo e pela tela de Categorias;
- Registrar no console (ou onde o app já loga erros de rede) a falha real de `/categorias` quando ela ocorrer, pra próximas investigações terem rastro em vez de depender de print.

**Fora:**
- Tratamento de edição concorrente / dado obsoleto entre admins (isso é o escopo da issue #17, que cobre as mesmas 4 telas do admin — produtos, categorias, mesas, usuários). Se a investigação confirmar que a causa é a mesma classe de problema do #17, a decisão de unificar os dois fixes fica pra depois desta spec, não implícita nela;
- Paginação das listagens do admin (issue #19) — fora de escopo, não relacionado ao sintoma relatado;
- Qualquer mudança em `categorias.component.ts` (a tela dedicada de Categorias) — já trata erro corretamente, não é onde o bug está;
- Investigar/alterar timeout de requisições HTTP — já coberto pela spec #42 (`docs/specs/42-timeout-requisicoes-http.md`), que já mudou `ApiService` pra usar `timeout()`; esta spec assume esse comportamento como dado, não repete o trabalho;
- Confirmar ou refutar "a aplicação travou" no sentido literal (freeze de JS/UI) — sem stack trace ou repro determinístico isso não é investigável só por leitura de código; se a investigação (passo abaixo) não achar evidência de freeze real, a spec trata o relato como a percepção do formulário "quebrado" descrita acima, e não abre uma frente de investigação de performance/memory leak à parte.

## Abordagem

1. **Investigação (antes de qualquer fix):**
   - Simular localmente uma falha isolada em `GET /categorias` (mock de erro ou delay maior que o timeout de `ApiService`) mantendo `GET /produtos` normal, e confirmar visualmente que o print da issue é reproduzido exatamente (dropdown vazio, tabela de produtos normal);
   - Checar se esse mesmo padrão de `resource` sem tratamento de erro se repete em outros pontos onde `categorias` é consumida fora da tela de Categorias — para dimensionar se o bug é local a este componente ou uma classe de problema mais ampla (relevante pra decisão de escopo do #17, mas essa decisão fica registrada aqui como achado, não como mudança de código nesta spec);
   - Se possível, confirmar com o backend/log de auditoria se houve algum erro de servidor (500, timeout) em `/categorias` no horário do print (2026-08-26, print embutido no corpo da issue) — evidência mais forte que a inferência por código.

2. **Fix:** seguir o mesmo padrão já usado por `produtos` no mesmo componente e por `categorias.component.ts` — adicionar branch de erro no template onde o dropdown é renderizado (`produtos.component.ts:205`), mostrando mensagem + ação de retry que chama `this.categorias.reload()` (o método já existe e já é usado em outro fluxo do mesmo arquivo, linha 465, pra recarregar após uma categoria ser excluída durante a edição).

**Resultado da investigação:** reproduzido em ambiente local (API + Postgres + frontend rodando, tenant `burguer-test`, admin logado). Forçando `listarCategorias()` a rejeitar e disparando `categorias.reload()` no componente já montado, o sintoma do print (dropdown vazio, sem aviso) se reproduziu exatamente antes do fix. Não há indício de perda de dado: os dados de categoria seguem intactos no banco (a falha é só na chamada, não no dado).

## Critério de aceite

- [x] Passo de investigação documentado (nesta spec ou no PR) com o resultado da reprodução: confirma ou refuta que uma falha isolada em `GET /categorias` reproduz o sintoma do print da issue;
- [x] Se não houver evidência de perda de dado real (categorias inexistentes no banco), a issue/PR deixa isso explícito — não fecha como "corrigido" um bug de perda de dado que não existiu;
- [x] Quando `GET /categorias` falha, o painel "Novo produto"/"Editar produto" mostra um estado de erro visível (não um `<select>` silenciosamente vazio) com uma ação pra tentar de novo;
- [x] Ao clicar em "tentar de novo", `categorias.reload()` é chamado e, se a chamada suceder dessa vez, o dropdown passa a listar as categorias normalmente sem precisar recarregar a página inteira;
- [x] Uma chamada de `GET /categorias` bem-sucedida continua funcionando exatamente como hoje (sem regressão no fluxo feliz);
- [x] Teste cobre o caso de erro: mock de `listarCategorias()` rejeitando, verificando que o estado de erro aparece no componente (não lista vazia sem explicação).

## Questões em aberto

- Se a investigação achar evidência concreta de perda de dado real no banco (não só falha de fetch no frontend), esta spec não cobre o fix — abriria uma issue/spec separada, já que a causa seria backend/dado, não UI;
- Se a investigação confirmar que o mesmo padrão (resource sem tratamento de erro) se repete nas outras 3 telas do admin (mesas, usuários) além de categorias/produtos, decidir com o time se isso amplia esta spec ou se vira parte do #17 — não decidido aqui.
