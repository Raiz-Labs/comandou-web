# CI fase 3: qualidade e segurança profundas

- **Issue:** #69 — https://github.com/Raiz-Labs/comandou-web/issues/69
- **Status:** Implemented, com escopo reduzido (gitleaks e actionlint + zizmor, num único PR, 24/11/2026). Itens 3 a 7 adiados, ver "Escopo reduzido"
- **Repo:** Raiz-Labs/comandou-web
- **Plano:** `docs/PLANO-PIPELINES-CI.md` (fase 3)
- **Par na api:** Raiz-Labs/comandou-api#74
- **Depende de:** #68

## Problema

Depois da #68, o CI do web cobre:
- lint: `eslint.recommended`, `typescript-eslint` e `angular-eslint`;
- typecheck;
- testes com cobertura;
- `npm audit`;
- budgets de bundle.

Ficam de fora:
- segredos no histórico (o projeto tem `.env.example`, e um `.env` commitado por engano passaria);
- erros de segurança nos próprios workflows;
- código morto e dependências sem uso;
- duplicação;
- regras de tipo mais rígidas;
- SAST;
- evolução do tamanho do bundle PR a PR (o budget só barra o limite absoluto).

As ferramentas nativas pagas do GitHub não estão disponíveis no Free. O caminho é usar ferramentas gratuitas, com resultado no job summary, em anotações e em artefatos.

## Escopo reduzido (decisão de 23/11/2026, a mesma da api, Raiz-Labs/comandou-api#74)

Entram só os itens de baixo custo que protegem algo concreto, sem conta nem serviço externo:
1. **gitleaks:** segredos no histórico inteiro.
2. **zizmor + actionlint:** segurança e sintaxe dos workflows.

Os dois entram num **único PR**: a linha de base do web é trivial, e as ferramentas já foram validadas na api (#108 e #109 de lá).

**Adiados**, reavaliar se surgir necessidade:
- **3. knip** e **4. jscpd:** higiene de código, sem risco de produção.
- **5. typescript-eslint type-checked + sonarjs:** maior valor entre os adiados, mas exige triagem grande da base.
- **6. Semgrep CE:** se sobrepõe ao item 5.
- **7. BundleMon:** histórico e comentário no PR dependem do serviço `bundlemon.dev`. Se for retomado, trocar por comparação de tamanho no próprio CI.

## Escopo

**Dentro.** Itens em ordem, **um PR por item**:

| # | Item | Estágio | Entra como | Vira bloqueio quando |
|---|---|---|---|---|
| 1 | gitleaks (binário ou imagem oficial pinada por digest, histórico completo, `--redact`) | security | bloqueio | imediato, depois de tratar os achados da base |
| 2 | zizmor + actionlint nos workflows | security | bloqueio | imediato |
| 3 (adiado) | knip (com o plugin Angular; código morto, exports e deps sem uso) | quality | aviso | base limpa |
| 4 (adiado) | jscpd em `src/` com `--threshold` = duplicação medida + 1 ponto | quality | bloqueio | imediato (catraca) |
| 5 (adiado) | typescript-eslint `recommendedTypeChecked` (`projectService: true`) + `eslint-plugin-sonarjs` | quality | regras novas como `warn` | regra a regra, um PR por grupo |
| 6 (adiado) | Semgrep CE (`p/typescript`, sem login) | security | aviso | após triagem da base |
| 7 (adiado) | BundleMon: tamanho do bundle comparado com a `dev`/`main` no comentário do PR | build | aviso | crescimento acima de 10% vira bloqueio |

Para cada item:
- o resultado vai para o job summary;
- os relatórios brutos ficam como artefato por 7 dias;
- o job `report` da #68 passa a citar o item.

**Fora:**
- Trivy e Docker: o web não gera imagem, porque o deploy é pela Vercel.
- CodeQL, GitHub Code Quality, secret scanning nativo, Sonar e Socket (api#75 ou plano pago).
- Corrigir todos os achados de `warn` dentro desta issue. Eles viram issues próprias.
- e2e Playwright no CI (api#75).

## Abordagem

### Regras
São as mesmas da api#74.
- **Um PR por ferramenta:** branch `ci/fase-3-<ferramenta>` saindo da `dev`.
- **Linha de base:** a contagem de achados por severidade fica registrada na descrição do PR.
- **Exceções:** ficam versionadas no arquivo de configuração da ferramenta, com motivo e data. Nunca com `|| true`.
- **Execução:** binário ou imagem pinada por digest. Nada de action de terceiros sem SHA.

### Comandos de referência
Conferir as flags na primeira execução:
```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks@sha256:<digest> git /repo --redact --exit-code 1
pipx run zizmor .github/workflows
npx knip
npx jscpd src --threshold <base+1> --reporters console,markdown --output reports/jscpd
docker run --rm -v "$PWD:/src" semgrep/semgrep@sha256:<digest> semgrep scan --config p/typescript --error
```
O **BundleMon** lê `dist/comandou-web/browser/**/*.js` e `*.css` depois do `ng build`. Ele guarda o histórico no serviço BundleMon. Conferir o plano gratuito e a configuração `bundlemon` no `package.json` antes de adotar.

## Critério de aceite

- [x] Os itens 1 e 2 estão no CI, num único PR com a linha de base na descrição.
- [x] gitleaks e zizmor/actionlint **bloqueiam** o PR quando há achado novo. _Validado num clone local descartável com o mesmo comando do step: o gitleaks sai com 2 com um token falso, e o zizmor sai com código diferente de 0 num workflow com `template-injection`. Isso evita commit temporário com force-push no PR._
- [x] Nenhum `uses:` de terceiros novo foi adicionado: as ferramentas rodam por `docker run` com imagem pinada por digest.
- [x] ~~O job `report` lista os novos itens.~~ _Ajustado: as ferramentas são steps do estágio `security`, que já aparece na tabela. Cada uma registra o resultado no job summary._

## Questões em aberto

- Se o BundleMon exigir conta ou token externo incompatível com repo privado, trocar por um script que compara os tamanhos de `dist/` com o artefato do último build da `dev`.
