# Aplicar nova identidade visual (logo sino de balcão) no app

- **Issue:** #51 — https://github.com/Raiz-Labs/comandou-web/issues/51
- **Status:** Draft
- **Repo:** Raiz-Labs/comandou-web

## Problema

O app não usa nenhum logo. Os pontos de marca são ícones Lucide genéricos ao lado do texto "Comandou": `utensils` na sidebar e na topbar, `zap` no header e no login do Master. O favicon e os ícones PWA são um "C" branco sobre laranja. A marca nova (sino de balcão, com o nome "comandou" em Nunito ExtraBold vetorizada) já tem um kit completo, mas nada dele chegou ao app.

Além disso, `public/manifest.webmanifest` marca os dois ícones (192 e 512) como `"purpose": "maskable any"`. Por isso o launcher corta o desenho quando aplica a máscara.

**Notas da análise de código (`origin/main`):**
- O kit fica em `../docs/logo/kit/`, na raiz do monorepo e fora deste repositório. Leia o `GUIA-DE-USO.md` antes de começar. Os assets precisam ser **copiados** para dentro do comandou-web, porque o build não alcança `../docs`.
- O `kit/web/head-snippet.html` aponta para `/site.webmanifest` com caminhos absolutos. O app usa `manifest.webmanifest` e `<base href="/">` com caminhos relativos. Fica valendo o padrão do app.
- O `src/app/app.html` (com `.angular-logo`) é sobra do template inicial do Angular. O `AppComponent` (`src/app/app.ts`) usa template inline e nenhum arquivo referencia o `app.html`. O `src/app/app.scss` está vazio e também não é referenciado.
- As regras de código vêm de `.claude/CLAUDE.md`: standalone, `input()` signals, @-syntax, só tokens do b-system no SCSS, nenhuma lib de UI nova.

## Escopo

**Dentro:**
- Favicon e ícones PWA em `public/`, seguindo `docs/logo/kit/web/`:
  - trocar `favicon.ico`, `icons/icon-192.png` e `icons/icon-512.png`;
  - adicionar `favicon.svg` (a partir de `comandou-symbol-favicon.svg`), `apple-touch-icon.png` e `icons/maskable-512.png`.
- `public/manifest.webmanifest`: ícones `any` (192 e 512) separados do `maskable` (512).
- `src/index.html`: `<link>` do favicon SVG, do `.ico` com `sizes="48x48"` e do `apple-touch-icon`, mantendo `theme-color` `#D95C25` e o manifest atual.
- Novo componente `src/app/shared/components/marca/marca.component.ts` (`<app-marca>`), com variantes `horizontal`, `simbolo` e `empilhada`.
- Aplicar `<app-marca>` em:
  - `shared/components/shell/shell.component.ts`: `.sidebar__brand` (linhas 63-64) e `.topbar__brand` (linhas 142-143);
  - `shared/components/master-shell/master-shell.component.ts`: `.master-header__brand` (linhas 16-17), com o símbolo + "Comandou **Master**" em texto;
  - `features/master/login/master-login.component.ts`: `.card__icon` (linha 14), trocando `zap` pelo símbolo;
  - `features/login/login.component.ts`: `h1.login-card__title` (linha 16);
  - `features/cardapio/cardapio.component.ts`: só o rodapé (linha 181).
- Remover `src/app/app.html` e `src/app/app.scss`.
- Teste unitário de `<app-marca>`.

**Fora:**
- Mudar a paleta ou a tipografia do b-system. Nenhum token novo.
- Cabeçalho do cardápio público (`utensils-crossed`, linha 46). Ele é a vitrine do restaurante e continua assim.
- Ícones Lucide que não fazem papel de logo: o `zap` do banner de impersonação (`shell.component.ts:123`), o `zap` do dashboard admin e os placeholders `utensils` dos produtos no cardápio.
- Landing page ou site institucional.
- Animação do sino, por exemplo tocar quando um item fica pronto. Pode virar uma feature separada.
- Novos testes e2e de marca.

## Abordagem

**Componente `<app-marca>`** (standalone, `input()` signals, `@if`/`@switch` no template):
- Inputs: `variante` (`'horizontal' | 'simbolo' | 'empilhada'`, padrão `'horizontal'`) e `tamanho` (altura em px).
- SVG inline, com os paths copiados dos masters do kit: `comandou-horizontal.svg`, `comandou-stacked.svg`, `comandou-symbol.svg` e `comandou-symbol-small.svg`. O componente não depende de URL externa nem de `<img src>`.
- Cores no SVG: o sino usa `fill="var(--b-primary-500)"` e o nome usa `fill="var(--b-fg)"`, ou `currentColor` com `color` herdado do host. Como `--b-fg` já inverte em `[data-theme="dark"]` (`#F2EDE5`, em `src/assets/b-system/colors_and_type.css:216`), o nome fica claro no escuro sem nenhum código extra.
- Na variante `simbolo` com `tamanho < 32`, o componente usa o desenho de `comandou-symbol-small.svg` (sem o brilho e com vãos maiores), seguindo o guia.
- O `<svg>` raiz recebe `role="img"` e `aria-label="Comandou"`, e os elementos internos não têm `<title>` nem texto, para que o leitor de tela não leia o nome duas vezes.
- Os mínimos do guia (horizontal ≥ 96 px de largura, empilhada ≥ 56 px, símbolo ≥ 16 px) são respeitados por quem usa o componente e ficam registrados num comentário no componente. Não há validação em runtime.
- SCSS só com tokens do b-system: nenhuma cor, espaçamento ou radius hardcoded.

**Pontos de aplicação:**
- Shell (sidebar e topbar): `<app-marca variante="horizontal">`, que substitui `<lucide-icon name="utensils">` + `<span>Comandou</span>`.
- Header do Master: `<app-marca variante="simbolo">` + o texto "Comandou **Master**". O texto funciona como rótulo da área, não como a marca, então não conflita com a regra do guia de não redigitar o nome.
- Login do Master: `<app-marca variante="simbolo">` no `.card__icon`.
- Login do tenant: a marca (empilhada ou horizontal) entra acima do slug do tenant. Continua existindo um `<h1>` acessível, por exemplo com a marca dentro do `<h1>`, que herda o nome pelo `aria-label`.
- Rodapé do cardápio: "Cardápio digital ·" + `<app-marca variante="simbolo">` pequeno + o nome. O nome vem do wordmark (`comandou-wordmark.svg`) ou da própria variante horizontal em tamanho pequeno, nunca de texto redigitado. O que o guia permitir no tamanho final decide entre os dois.

**Assets:** copiar os arquivos de `../docs/logo/kit/web/` para `public/`. Os ícones PWA ficam em `public/icons/`, onde já estão hoje. O `site.webmanifest` do kit serve só de referência e não é copiado. O `background_color` do manifest continua `#FBF8F3`.

**Dependências:** nenhuma nova.

## Critério de aceite

- [ ] A aba do navegador mostra o sino: `favicon.svg` nos navegadores modernos e `favicon.ico` como fallback.
- [ ] `manifest.webmanifest` tem 3 ícones: `icon-192.png` (`any`), `icon-512.png` (`any`) e `maskable-512.png` (`maskable`). Nenhum ícone fica com `"maskable any"`.
- [ ] Em DevTools > Application > Manifest (ou no Maskable.app), o ícone maskable não fica cortado.
- [ ] `src/index.html` referencia `favicon.ico` (48x48), `favicon.svg` e `apple-touch-icon.png`, e mantém `<meta name="theme-color" content="#D95C25">` e o `manifest.webmanifest`.
- [ ] `<app-marca>` existe em `src/app/shared/components/marca/` e renderiza as três variantes com SVG inline, sem nenhuma URL externa.
- [ ] Na variante `simbolo` com `tamanho < 32`, o SVG renderizado é o desenho de `symbol-small` (sem o brilho).
- [ ] O `<svg>` raiz tem `role="img"` e `aria-label="Comandou"`.
- [ ] Sidebar, topbar mobile, header do Master, login do Master e login do tenant usam `<app-marca>`. Nenhum `utensils` ou `zap` continua como logo; continuam só os do banner de impersonação, do dashboard e dos placeholders do cardápio.
- [ ] O login do tenant mantém um `<h1>` com nome acessível "Comandou".
- [ ] A marca é legível nos temas claro e escuro: o nome usa `--b-fg` e fica claro com `data-theme="dark"`. Os dois temas foram conferidos visualmente.
- [ ] O rodapé do cardápio público mostra o símbolo. O cabeçalho do cardápio continua com o conteúdo do restaurante, sem mudanças.
- [ ] `src/app/app.html` e `src/app/app.scss` foram removidos, e `app.spec.ts` continua passando.
- [ ] O teste unitário `marca.component.spec.ts` renderiza cada variante, confere o `aria-label` e confere a troca para `symbol-small` abaixo de 32 px.
- [ ] O SCSS dos arquivos alterados não tem nenhuma cor, espaçamento ou radius hardcoded. Os fills do SVG usam só `var(--b-*)` ou `currentColor`.
- [ ] `package.json` continua sem dependências novas.
- [ ] Os testes e2e existentes (`e2e/login.spec.ts`) continuam passando.
- [ ] `ng build --configuration production` roda sem warnings novos, e `ng lint` passa.
