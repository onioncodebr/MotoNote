# Migração do MotoNote para Tailwind CSS

> Planejamento de como sair do CSS puro atual (`App.css` + `index.css` + estilos
> inline pontuais) para Tailwind, sem quebrar o sistema de temas (claro/escuro +
> cor de destaque) já em produção. Este documento é só o plano — a migração em
> si é feita depois, aos poucos.

> **Status: setup feito + 2 lotes migrados.** Tailwind v4 instalado (via
> `@tailwindcss/vite`, não a config `postcss`/v3 do rascunho original da seção
> 5 — ver nota lá). Lote 1: `IconButton.jsx`, `Skeleton.jsx`/`SkeletonRow`,
> `Toast.jsx`. Lote 2: `Button.jsx` (novo componente) substituindo `.button`/
> `.button-dark/-light/-outline/-danger`/`.small-button`/`.full-button` nos
> 25 arquivos que usavam essas classes. `Logo.jsx` e `ConfirmDialog.jsx`
> continuam de fora (ver seção 6) — o `ConfirmDialog` já usa `<Button>` agora,
> mas `.form-actions`/`.form-error`/`.modal-header` em si ainda não foram
> migrados. **Achado importante do lote 2, ver seção 4-A:** um bug real de
> cascade layers do Tailwind v4 (`a { color: inherit }` sem `@layer` vencendo
> qualquer utilitário de cor do Tailwind em tags `<a>`) foi encontrado e
> corrigido — relevante pra qualquer CSS pré-existente que ainda sobrar no
> app durante o resto da migração.

## 1. Objetivo e motivação

Hoje o frontend do MotoNote (`frontend/`) é 100% CSS "na mão": um `App.css`
com 1108 linhas e um `index.css` com 359 linhas, mais um arquivo de estilos
inline (`modalStyles.js`) pros modais. Isso funciona, mas tem custo de
manutenção crescente — classes globais que colidem em potencial, dificuldade
de saber "quem usa essa classe" ao mexer nela, e nenhum tooling de purge/lint
pra estilos mortos.

Tailwind resolve isso trazendo utilitários compostos direto no JSX (o que já
é o estilo dominante — 36 dos componentes usam `className`), com autocomplete,
purge automático de classes não usadas, e consistência de escala (espaçamento,
tipografia) forçada pelo config em vez de depender de disciplina manual.

**Fora do escopo deste plano:** reescrever a lógica dos componentes, mudar a
paleta de cores/tema visual (Liquid Glass, ver `liquidglass.md`), ou trocar a
estratégia de theming (continua sendo `data-theme`/`data-accent` no `<html>`).
Isso é uma migração de *como* o CSS é escrito, não de *como o app parece*.

## 2. Situação atual (o que existe hoje)

- **`frontend/src/index.css`** (359 linhas): ~235 CSS custom properties —
  escala tipográfica (`--fs-*`), espaçamento (`--space-*`), raios (`--radius-*`),
  sombras (`--shadow-*`), paleta semântica (`--color-success`, `--color-danger`,
  etc.), paleta de gráficos (`--chart-*`) e os tokens `--dash-*` (fundo,
  superfície, texto, borda do dashboard) que **mudam de valor** conforme os
  atributos `[data-theme]` e `[data-accent]` no `<html>`.
- **`frontend/src/App.css`** (1108 linhas): a maior parte do styling do
  dashboard — `.dashboard-shell`, `.rider-avatar`, os efeitos "Liquid Glass"
  (glassmorphism) e as transições de entrada/saída do `react-modal`.
- **`frontend/src/components/modalStyles.js`**: estilos inline em JS
  (`getModalStyles()`) que referenciam `var(--dash-*)` diretamente — não são
  classes CSS, são objetos de estilo React.
- **Troca de tema**: `App.jsx` (linhas ~516-521) seta
  `document.documentElement.dataset.theme` e `.dataset.accent` em resposta à
  escolha do usuário em `AparenciaPanel.jsx`. Todo o resto do app reage a isso
  via seletores CSS `[data-theme=...]`/`[data-accent=...]` nos dois arquivos
  acima — **não há lógica de tema em JS além de setar esses dois atributos**.
- **Stack**: Vite puro (`vite.config.js` só tem `@vitejs/plugin-react`), React
  19, sem CSS Modules, sem styled-components. `package.json` não tem nenhuma
  dependência de Tailwind/PostCSS hoje.
- **Volume**: ~6.4k linhas de JSX somadas em `src/components/*.jsx` + `App.jsx`,
  a maioria usando `className` (só 7 arquivos têm `style={{...}}` inline).

## 3. Estratégia: convivência incremental, não big-bang

Instalar o Tailwind **ao lado** do CSS existente e migrar componente por
componente, não tudo de uma vez. `App.css` e `index.css` continuam sendo
importados e funcionando durante toda a transição — um componente migrado usa
classes Tailwind, os que ainda não foram migrados continuam com as classes CSS
antigas. Isso permite testar visualmente a cada passo e não trava o resto do
desenvolvimento do produto enquanto a migração roda.

Critério prático de "migrado": o componente não referencia mais nenhuma classe
definida em `App.css`, só usa utilitários Tailwind (+ tokens do config).

## 4. Mapeamento dos design tokens para o `tailwind.config.js`

Os ~235 custom properties de `index.css` não desaparecem — viram a fonte de
verdade que alimenta `theme.extend` no Tailwind, assim os nomes ficam
consistentes (`text-fs-lg`, `bg-dash-surface`, `rounded-radius-md` etc. em vez
de números mágicos espalhados):

```js
// tailwind.config.js (rascunho)
theme: {
  extend: {
    fontSize: {
      '2xs': 'var(--fs-2xs)',
      xs: 'var(--fs-xs)',
      // ...resto da escala --fs-*
    },
    spacing: {
      1: 'var(--space-1)',
      // ...resto da escala --space-*
    },
    borderRadius: {
      sm: 'var(--radius-sm)',
      md: 'var(--radius-md)',
      lg: 'var(--radius-lg)',
      pill: 'var(--radius-pill)',
    },
    colors: {
      success: 'var(--color-success)',
      danger: 'var(--color-danger-strong)',
      // ...paleta semântica e --chart-*
      dash: {
        bg: 'var(--dash-bg)',
        surface: 'var(--dash-surface)',
        border: 'var(--dash-border)',
        // ...resto dos --dash-*
      },
    },
  },
}
```

**Ponto importante:** como os valores continuam sendo `var(--algo)` e não
literais, a troca de tema/cor de destaque continua funcionando exatamente como
hoje — o Tailwind só empresta o *nome* da classe, quem resolve o valor real
continua sendo o CSS custom property, trocado pelo mesmo mecanismo
`[data-theme]`/`[data-accent]` que já existe em `index.css`/`App.css`. Ou seja,
**não precisamos do `dark:` variant do Tailwind** para isso — o app não tem um
dark mode binário, tem tema claro/escuro *e* uma cor de destaque configurável
independentemente, o que já é resolvido pelos tokens `--dash-*`. Usar
`dark:` criaria um segundo mecanismo de tema conflitando com o existente.

Para tokens muito específicos que não vale a pena nomear no config, usar
arbitrary values do Tailwind diretamente: `bg-[var(--dash-surface)]`.

**Decisão tomada no lote 1 (atualiza o rascunho acima):** ainda não criamos o
bloco `@theme` com os aliases nomeados. Vários tokens existentes já se chamam
exatamente como o nome que o Tailwind v4 exigiria pro alias (`--color-success`,
por exemplo) — declarar `--color-success: var(--color-success)` dentro de
`@theme` seria uma auto-referência (mesmo nome dos dois lados), inválida em
CSS. Dá pra contornar com um nome intermediário (`--color-success` → alias
`--color-semantic-success` → utilitário `bg-semantic-success`), mas isso é uma
decisão de nomenclatura que merece sua própria rodada, não algo pra decidir
correndo no meio da migração de 3 componentes pequenos. Por ora, os
componentes já migrados (seção 6) usam **arbitrary values direto nos tokens
existentes** (`text-[var(--color-success)]`, `bg-[var(--dash-surface)]`,
`rounded-[var(--radius-sm)]`) — mais verboso, mas zero risco de colisão de
nome e sem precisar mexer no `tailwind.config.js`. O `@theme` com aliases
nomeados fica como próximo passo *depois* de ter mais componentes migrados
pra guiar quais nomes valem a pena existir.

## 4-A. Bug encontrado: cascade layers do Tailwind v4 vs. CSS legado sem camada

Ao migrar o `Button.jsx` (lote 2), o CTA "Falar com a gente" da landing
(`<Button as="a" variant="light">`) renderizou **com texto branco sobre fundo
branco** — completamente invisível, apesar da classe `text-[var(--ink)]`
estar gerada corretamente no CSS compilado (conferido direto no
`document.styleSheets`).

**Causa raiz:** `@import 'tailwindcss'` declara internamente
`@layer theme, base, components, utilities;`. Todo utilitário do Tailwind
(incluindo `text-[var(--ink)]`) vive dentro de `@layer utilities`. Regras CSS
**sem nenhuma camada** (como o `a { color: inherit; }` que já existia em
`index.css`, escrito antes de existir Tailwind no projeto) **sempre vencem
qualquer regra em qualquer `@layer`, não importa a especificidade** — é assim
que a spec de CSS Cascade Layers funciona: camada nomeada perde pra "sem
camada" antes mesmo de comparar seletores. Resultado: `a { color: inherit }`
(specificidade baixíssima, um elemento) vencia `.text-\[var\(--ink\)\]`
(uma classe, specificidade maior) só por estar fora de qualquer `@layer`, e
o link herdava a cor branca do fundo escuro do `.contact-banner` ao redor.

Isso só afeta tags `<a>` porque só existia um `a { color: inherit }` — não
tem equivalente `button { color: ... }`/`span { color: ... }` genérico no
CSS legado, então `<button>`/`<span>` nunca sofreram esse bug (confirmado
via `getComputedStyle` num harness de teste antes de generalizar a correção).

**Correção:** envolver os resets genéricos de `index.css` (`*`, `html`,
`body`, `button`, `a`, `::selection`, o bloco de `prefers-reduced-motion`)
numa `@layer base { ... }` — a mesma camada que o próprio Tailwind usa pro
preflight dele. Isso não muda o comportamento entre essas regras e o resto
do CSS legado (que continua sem camada, então continua vencendo o que
restar de Tailwind onde ainda não migramos — está tudo bem assim, é o
comportamento "convivência" que a seção 3 pede), só faz essas regras
específicas pararem de vencer incondicionalmente qualquer utilitário do
Tailwind.

**Isso é importante pro resto da migração:** enquanto `App.css`/`index.css`
tiverem seletores de elemento genéricos (`button`, `a`, `input`, etc. sem
classe) competindo com propriedades que um componente migrado for tentar
controlar via Tailwind, o mesmo bug pode se repetir. Ao migrar um componente,
vale conferir rapidamente (`grep -nE '^(button|a|input|select|svg|h[1-6])\s*[,{]'`)
se não sobrou um seletor de elemento cru no CSS legado competindo com ele.

## 5. Setup técnico

**Nota:** o setup abaixo foi atualizado depois de rodar `npm view tailwindcss
version` e ver que o Tailwind atual é a v4 (não v3), com um plugin oficial
`@tailwindcss/vite` que dispensa `postcss.config.js`/`autoprefixer` manual e
`tailwind.config.js` obrigatório — mais simples que o rascunho original desta
seção (que previa a config `@tailwind base/components/utilities` da v3). Os
passos reais executados:

1. Instalar dependências:
   ```bash
   cd frontend
   npm install tailwindcss @tailwindcss/vite
   ```
2. Registrar o plugin em `vite.config.js`:
   ```js
   import tailwindcss from '@tailwindcss/vite'
   // ...
   plugins: [react(), tailwindcss()],
   ```
3. Importar o Tailwind em `frontend/src/index.css` — **como `@import` tem que
   vir antes de qualquer outra regra no arquivo**, e o import da fonte Google
   já ocupava a linha 1, a ordem que não gera warning de build é a fonte
   primeiro, Tailwind logo depois, tokens (`:root { ... }`) só depois disso:
   ```css
   @import url('https://fonts.googleapis.com/css2?...');
   @import 'tailwindcss';

   :root { /* tokens existentes, sem alteração */ }
   ```
4. Conferido com `npm run build` (sem warnings) e visualmente via
   `npm run dev` que o preflight do Tailwind não quebrou a landing page —
   nenhuma diferença visual encontrada.
5. `tailwind.config.js` **não foi criado nesta rodada** — sem ele, o Tailwind
   v4 já escaneia `src/**/*` por padrão via o plugin do Vite. Só vai ser
   necessário quando entrarmos na etapa de nomear tokens no `@theme` (seção 4).

## 6. Ordem de migração dos componentes

Do menor/mais isolado pro maior/mais acoplado ao tema, pra validar o processo
com baixo risco antes de encarar as partes complexas:

1. **Componentes pequenos e isolados — feito:** `IconButton.jsx`,
   `Skeleton.jsx`/`SkeletonRow`, `Toast.jsx`. Cada um usava uma classe
   (`.icon-button`, `.skeleton`/`.skeleton-row`, `.toast-stack`/`.toast-*`)
   referenciada por só aquele arquivo — migração direta pra utilitários
   Tailwind + arbitrary values, com as regras correspondentes removidas de
   `App.css`. Duas pegadinhas resolvidas:
   - `.icon-button`/`.toast` **continuam existindo como classes vazias** (sem
     estilo próprio) só como gancho pro seletor `@media (pointer: coarse)` em
     `App.css`, que aumenta o alvo de toque — removê-las totalmente também
     teria removido essa acessibilidade sem querer.
   - Os `@keyframes shimmer`/`toast-in`/`toast-out` saíram de dentro de
     `@media (prefers-reduced-motion: no-preference)` em `App.css` e viraram
     `@keyframes` soltos em `index.css`, acionados via classe Tailwind
     `motion-safe:animate-[...]` (que já compila pro mesmo media query).
   - `IconButton` ganhou uma prop `boxSize` (`'md'` 30px / `'sm'` 24px, usado
     pelo botão de fechar do toast) — evita misturar duas classes de largura
     conflitantes (`w-[30px]` e `w-6`) no mesmo `className`, que teriam
     especificidade igual e ordem de sobrescrita imprevisível.
2. **Lote 2 — feito: primitivo `.button` (25 arquivos).** Virou
   `Button.jsx` (`variant`: dark/light/outline/danger, `size`: normal/small,
   `full`, `as` pra suportar tanto `<button>` quanto `<a>`). Todos os 25
   arquivos que usavam `.button`/`.button-dark/-light/-outline/-danger`/
   `.small-button`/`.full-button` foram atualizados pra usar `<Button>`, e as
   classes correspondentes saíram de `App.css`. `.button`/`.icon-button`/
   `.toast` continuam existindo como classes vazias só pelos seletores
   contextuais/responsivos que ainda dependem delas (`.landing-nav .button`,
   `.hero-actions .button`, `.contact-banner .button`, `@media
   (pointer: coarse)`), mesmo padrão do lote 1. Achado relevante durante essa
   migração: o bug de cascade layers documentado na seção 4-A — só apareceu
   aqui porque foi o primeiro componente migrado a existir como `<a>`, não
   só `<button>`/`<span>`.
3. **Ainda adiados — `Logo.jsx` (não migrado) e o resto de `ConfirmDialog.jsx`
   (`.form-actions`/`.form-error`/`.modal-header`, não migrados; o próprio
   `ConfirmDialog` já usa `<Button>` desde o lote 2).**
   - `Logo.jsx` usa `.brand`, cuja cor **depende do contexto**:
     `:root { --ink: #181818 }` fixo fora do dashboard (landing/login), mas
     `.dashboard-shell .brand { color: var(--dash-text-strong) }` dentro do
     dashboard (pra funcionar no escuro). Migrar isso em utilitário Tailwind
     puro exige uma decisão de design (prop de tom no componente vs. variant
     ambiente do Tailwind) que não dá pra tomar de passagem — fica pra uma
     rodada dedicada.
   - `.form-actions` (5 arquivos), `.form-error` (7) e `.modal-header` (3)
     continuam como classes CSS compartilhadas — menor escopo que `.button`
     já foi, então é um lote menor e mais tranquilo pra próxima rodada.
4. **Primitivos restantes** (form-actions/form-error, modal-header) —
   próxima rodada real, ver item 3. Uma vez migrados, `Logo.jsx` (com a
   decisão de tom contextual tomada) e o resto de `ConfirmDialog.jsx` voltam
   a ser candidatos simples.
5. **Telas de tamanho médio com pouca dependência visual cruzada**:
   `GastosView.jsx`, `ValesView.jsx`, `UsuariosView.jsx`,
   `MotoboysView.jsx`, etc.
6. **Telas grandes/centrais**: `VisaoGeralView.jsx`, `EntregasView.jsx`,
   `ConfiguracoesView.jsx` (várias sub-abas, incluindo `AparenciaPanel.jsx` —
   migrar esse por último dentro do grupo, já que é o componente que *escreve*
   os atributos de tema).
7. **Por último, o núcleo compartilhado**: `App.css` (dashboard shell, Liquid
   Glass, transições do `react-modal`) e `modalStyles.js` — são os mais usados
   transversalmente, então qualquer regressão aqui afeta tudo. Só mexer depois
   que o padrão de uso dos tokens Tailwind já estiver validado nos passos
   anteriores.

A cada componente migrado, apagar do `App.css` só as classes que ficaram sem
nenhum uso (`grep -rn '\.classe-tal' src/` antes de remover).

## 7. Tratamento do `modalStyles.js`

`getModalStyles()` gera um objeto de estilo inline porque o `react-modal`
monta seu conteúdo via portal (fora da árvore de `.dashboard-shell`, ver
comentário no próprio arquivo) e precisa functionar tanto no tema claro quanto
escuro. Duas opções, decidir na hora de migrar esse arquivo (passo 7 da seção
6, não antes):

- **Opção A (recomendada)**: manter como estilo inline, mas trocar os valores
  literais por classes Tailwind aplicadas via `className` no componente
  `ReactModal` (`content` e `overlay` do react-modal aceitam `className`
  além de `style`), migrando só o que hoje é CSS fixo (padding, border-radius)
  e mantendo os `var(--dash-*)` que dependem de tema como estão.
- **Opção B**: usar arbitrary values (`className="bg-[var(--dash-surface)] text-[var(--dash-text-strong)]"`)
  para eliminar o objeto de estilo inline por completo.

Decisão final: registrar no próprio código (comentário) o motivo escolhido,
já que isso é exatamente o tipo de detalhe que confunde quem ler o código
depois.

## 8. Checklist de verificação a cada etapa

- `npm run dev` e navegar manualmente pelo componente migrado.
- Verificar visualmente nos **3 estados de tema relevantes**: claro, escuro,
  e pelo menos uma cor de destaque não-padrão (trocar em Configurações →
  Aparência) — regressão de tema é o risco #1 dessa migração.
- `npm run lint` (oxlint) sem novos erros.
- Conferir que nenhuma classe usada só existe como arbitrary value fora do
  `content` configurado no `tailwind.config.js` (senão o purge remove a classe
  do build de produção e ela "some" só no `npm run build`, não no `dev`) —
  rodar `npm run build && npm run preview` periodicamente, não só `npm run dev`.

## 9. Riscos e cuidados

- **Regressão visual silenciosa**: durante a convivência, uma classe Tailwind
  pode ter especificidade/ordem de cascata diferente de uma classe legado do
  `App.css` aplicada no mesmo elemento. Evitar misturar classe legado +
  Tailwind no mesmo elemento sempre que possível; migrar o elemento inteiro de
  uma vez.
- **Efeitos "Liquid Glass"**: `backdrop-filter`, sombras compostas
  (`--shadow-*` com RGB + alpha) e blends customizados podem não ter
  equivalente direto em utilitário Tailwind puro — nesses casos, usar
  arbitrary values (`backdrop-blur-[20px]`) em vez de forçar uma aproximação
  que perca o efeito visual.
- **`@tailwind base` (preflight)**: o reset do Tailwind zera margens/estilos
  default de elementos HTML; como o app não usa isso hoje, o primeiro `npm run
  dev` depois do setup pode mostrar diferenças de espaçamento em elementos
  ainda não migrados. Validar isso logo no passo 4 da seção 5, antes de seguir.
- **Volume/tempo**: ~6.4k linhas de JSX é uma migração de várias sessões, não
  uma tarde. Não tentar migrar tudo de uma vez — seguir a ordem da seção 6 e
  tratar cada componente como uma entrega isolada e testável.
- **Testar visualmente sem o backend real**: `VITE_API_URL` (`.env`) aponta
  pro IP da rede local do Cebola (`192.168.0.40:8080`), que não é alcançável
  de ambientes sandbox/CI — a tela trava para sempre em "Carregando sua
  sessão..." (`App.jsx`, `checkingSession`) esperando uma resposta que nunca
  chega, o que pode ser confundido com regressão do CSS. Pra testar
  visualmente sem o backend, ou usar a landing page (não depende de sessão
  autenticada) ou apontar `VITE_API_URL` temporariamente pra um endereço que
  falhe rápido (ex.: `http://127.0.0.1:9/`) — nunca deixar essa mudança de
  `.env` commitada.

## 10. Critério de conclusão

A migração termina quando:
- Nenhum componente em `src/components/*.jsx` ou `App.jsx` referencia classes
  definidas em `App.css`.
- `frontend/src/App.css` pode ser deletado (ou reduzido só aos `@keyframes`/
  seletores que o Tailwind não cobre bem, se sobrar algum caso assim).
- `modalStyles.js` foi resolvido conforme a decisão da seção 7.
- `index.css` mantém só: import de fonte, diretivas `@tailwind`, e os blocos
  de custom properties (`:root`, `[data-theme]`, `[data-accent]`) — sem CSS
  de componente solto.
