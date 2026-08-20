# Timeout em requisições HTTP

- **Issue:** #42 — https://github.com/Raiz-Labs/comandou-web/issues/42
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

Nenhuma chamada feita via `ApiService` tem timeout. Se uma requisição travar na rede — sem nunca resolver nem rejeitar — a `Promise` retornada por `firstValueFrom(...)` fica pendente pra sempre: o `finally` do handler nunca roda, o signal de loading nunca reseta, e não há toast de erro. O usuário fica com um botão preso em loading (ex.: "Adicionando...") sem nenhuma saída a não ser recarregar a página, perdendo o que estava fazendo.

Reproduzido em `demo.comandou.app.br`: adicionar um item numa comanda (`POST /comandas/:id/itens`) ficou preso em "Adicionando..." indefinidamente; a rede mostrou apenas o `OPTIONS` preflight (204) sem o `POST` nunca completar. Ocorreu simultâneo a um banner "Sem conexão em tempo real" (WebSocket), o que sugere instabilidade pontual na API/rede naquele momento — mas o problema de fundo (zero timeout/recovery em qualquer chamada HTTP do app) existe independente da causa dessa instabilidade específica, e pode se repetir em qualquer tela.

## Escopo

**Dentro:**
- Timeout padrão aplicado a toda chamada HTTP feita via `ApiService` (`src/app/core/api/api.service.ts`), nos métodos `get`, `post`, `put`, `patch`, `delete`;
- Ao estourar o timeout, o handler chamador recebe um erro (via `catch`) igual a qualquer outro erro de rede — reutiliza o mesmo caminho de `toast.danger(...)` e reset de loading signal já existente em cada componente (ex.: `confirmarAdicao()` em `comanda-detalhe.component.ts:1259`, que já tem `try/catch/finally`);
- Valor de timeout único e centralizado (uma constante), não configurável por chamada nesta primeira versão.

**Fora:**
- Retry automático da requisição — timeout apenas encerra a espera e devolve erro; tentar de novo continua sendo ação manual do usuário (clicar de novo);
- Mudar o texto/UX dos toasts de erro existentes — cada componente já trata seu próprio erro, isso não muda;
- Resolver a causa da instabilidade de rede/API observada durante o teste (isso é operacional/infra, não um bug de código);
- Timeout no lado do WebSocket (`SocketService`) — é um transporte separado (`socket.io-client`), já tem sua própria lógica de reconexão com `reconnectionAttempts`/`reconnectionDelayMax`, e não foi o que travou nesse caso (a requisição HTTP trava independente do estado do socket).

## Abordagem

Usar o operador `timeout()` do RxJS diretamente nos métodos de `ApiService` (`src/app/core/api/api.service.ts`), envolvendo o `Observable` retornado por cada chamada do `HttpClient` antes de devolvê-lo — mantém o timeout num único lugar central em vez de espalhar por cada service de feature. Um valor razoável tipo 15s cobre o caso comum sem interferir em uploads/relatórios mais lentos que existam hoje (nenhum identificado no momento — todas as chamadas atuais são JSON pequeno).

Quando o timeout estoura, RxJS emite `TimeoutError`, que já cai no `catchError`/`catch` que cada componente já tem — nenhuma mudança adicional é necessária nos handlers, já que eles tratam qualquer erro de forma genérica (`catch { this.toast.danger(...) }`).

## Critério de aceite

- [x] Uma chamada via `ApiService` que não recebe resposta do servidor dentro do timeout configurado rejeita a Promise correspondente (em vez de ficar pendente pra sempre);
- [x] O handler chamador (ex.: `confirmarAdicao()`) recebe esse erro no `catch`, executa o `finally` (reset do loading signal) e mostra o toast de erro já existente — sem precisar de código novo no componente;
- [x] Uma chamada que responde normalmente dentro do timeout não é afetada (comportamento idêntico ao atual);
- [x] Teste cobre o caso de timeout: mock de uma requisição que nunca resolve, junto com fake timers do RxJS, verificando que o Observable erra após o tempo configurado.
