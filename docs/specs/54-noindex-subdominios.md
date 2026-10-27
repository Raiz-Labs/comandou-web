# Subdomínios do app indexáveis pelo Google competem com a landing

- **Issue:** #54 — https://github.com/Raiz-Labs/comandou-web/issues/54
- **Status:** Em implementação
- **Repo:** Raiz-Labs/comandou-web

## Problema

A landing page saiu em `www.comandou.app.br`, no projeto Vercel `comandou-landing`, e já está cadastrada no Search Console. O app continua respondendo em `*.comandou.app.br`, que inclui `master.`, `demo.` e cada restaurante, além de `comandou-web.vercel.app`. Nada no app diz aos buscadores para não indexar essas páginas:

- O `vercel.json` (`origin/main`) só tem o rewrite da SPA (`/(.*)` → `/index.html`), sem bloco de `headers`.
- O `src/index.html` tem `<title>Comandou</title>` fixo e nenhum `<meta name="robots">`.
- Por causa do rewrite total, `/robots.txt` devolve o HTML do app com status 200.

Resultado: o Google pode indexar `/login`, `/master/login` e telas de restaurantes com o título "Comandou". Essas páginas disputam a busca pela marca com a landing e expõem os endereços dos tenants.

**Notas da análise de código (`origin/main`):**
- O tenant é resolvido pelo subdomínio (`resolverSlugPuro` em `src/environments/environment.ts`: `hostname` com 3 partes ou mais usa a primeira).
- Em `src/app/app.routes.ts`, `/cardapio` é a única rota pública fora login e master (linha 47) e não tem guard. O `**` manda para `login`.
- O cardápio público é a vitrine do restaurante. Aparecer no Google interessa ao cliente, então ele continua indexável.

## Escopo

**Dentro:**
- Bloco `headers` no `vercel.json`:
  - `X-Robots-Tag: noindex` em todos os caminhos **exceto** os que começam com `/cardapio`: `"source": "/((?!cardapio).*)"`;
  - `X-Robots-Tag: noindex` em **todos** os caminhos do host `demo.comandou.app.br`, cardápio incluído: `"has": [{ "type": "host", "value": "demo.comandou.app.br" }]`, para o cardápio de exemplo não ser indexado.
- `buildCommand`, `outputDirectory` e `rewrites` continuam como estão.

**Fora:**
- `robots.txt` com `Disallow`. Ele impediria o rastreamento, então o Google nunca leria o noindex, e a URL ainda poderia aparecer sem descrição.
- `<title>` e meta description por restaurante no cardápio (SEO do cardápio). Vale uma issue separada se os restaurantes pedirem.
- `<meta name="robots">` no `index.html` ou via `Meta` do Angular. O cabeçalho resolve no servidor, sem depender do JS rodar.
- Mudanças na landing (`comandou-landing`), que é outro repo e outro projeto Vercel.

## Abordagem

Só configuração, sem código: um bloco `headers` no `vercel.json`, com duas regras. A Vercel aplica `headers` pelo caminho da requisição original, antes do `rewrite` para `/index.html`. Por isso `/cardapio` continua sem o cabeçalho mesmo sendo servido pelo mesmo `index.html`. Quando várias regras definem a mesma chave, a última prevalece. Aqui as duas dão o mesmo valor, e a do host `demo` garante o noindex no cardápio de exemplo.

```json
"headers": [
  {
    "source": "/((?!cardapio).*)",
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
  },
  {
    "source": "/(.*)",
    "has": [{ "type": "host", "value": "demo.comandou.app.br" }],
    "headers": [{ "key": "X-Robots-Tag", "value": "noindex" }]
  }
]
```

Os assets (`*.js`, `*.css`, `icons/*`) também recebem noindex. Isso não afeta a renderização: o Googlebot continua baixando os assets para renderizar o cardápio, porque noindex não é `Disallow`.

## Critério de aceite

Os cabeçalhos só podem ser validados **em produção, depois do merge**. A Vercel coloca `x-robots-tag: noindex` em todo deploy de preview sem domínio de produção, e o preview fica atrás do login da Vercel. No preview, confira só que o build passa e que o app funciona.

- [ ] `curl -sI https://master.comandou.app.br/master/login` retorna `x-robots-tag: noindex`.
- [ ] `curl -sI https://<slug-de-restaurante-real>.comandou.app.br/login` retorna `x-robots-tag: noindex`.
- [ ] `curl -sI https://<slug-de-restaurante-real>.comandou.app.br/cardapio` **não** retorna `x-robots-tag`.
- [ ] `curl -sI https://demo.comandou.app.br/cardapio` retorna `x-robots-tag: noindex`.
- [ ] `curl -sI https://comandou-web.vercel.app/login` retorna `x-robots-tag: noindex`.
- [ ] `curl -sI https://www.comandou.app.br/` (landing, outro projeto) **não** retorna `x-robots-tag`.
- [ ] Todas as URLs acima continuam com status 200, e o app abre e funciona normalmente em `demo.comandou.app.br`, incluindo o login e o cardápio.
- [ ] Depois do deploy em produção, a Inspeção de URL do Search Console (propriedade `comandou.app.br`) em `https://master.comandou.app.br/master/login` → "Testar URL publicado" mostra que a indexação **não é permitida** por causa de `noindex` no cabeçalho `X-Robots-Tag`.

## Riscos / perguntas em aberto

- Se um restaurante usar o slug `demo`, o cardápio dele não será indexado. Hoje não existem slugs reservados (a validação fica em `comandou-api/src/modules/master/master.schemas.ts`). Isso é tratado à parte, na lista de slugs reservados.
- `/cardapio` continua indexável em `master.comandou.app.br` e em `comandou-web.vercel.app`, onde não há tenant real. O impacto é baixo, porque são telas vazias sem links apontando para elas. Se aparecerem no Search Console, adicionar regras `has` de host como a do `demo`.
- O padrão `/((?!cardapio).*)` também deixa de fora caminhos como `/cardapiox`. Esses caminhos caem no `**` e redirecionam para login no cliente, então o impacto é desprezível.
- Se no futuro o cardápio ganhar sub-rotas (`/cardapio/...`), elas continuam indexáveis pelo mesmo padrão. Se surgir outra página pública que deva ser indexada, ela precisa entrar na exceção do `source`.
