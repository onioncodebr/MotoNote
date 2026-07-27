# Plano de animações suaves no frontend

> **Status: implementado (Fases 1-6, todas).** Este documento foi escrito como
> planejamento puro e virou tarefa de implementação na mesma sessão — ficou como
> referência do raciocínio original, mas o app já reflete tudo que está descrito
> abaixo. Duas correções de bugs reais foram feitas no processo, sem estar no plano
> original: (1) o fade do label ao colapsar a sidebar (Fase 1) inicialmente só usava
> `opacity`, o que descentralizava o ícone — corrigido zerando `max-width` junto; (2)
> o `padding` do corpo do accordion "Como usar" (Fase 5) não encolhia com a track do
> grid, deixando uma fresta do texto visível fechado — corrigido animando o padding
> vertical também. Fase 6 saiu como a "rede de segurança" global (não o wrap
> individual dos ~28 hovers soltos), por ser mais robusta a esquecimentos futuros.

Documento de planejamento, sem implementação (na origem — ver status acima). Mapeia o que já existe em termos de
transição/animação no app (`entregas/frontend`), onde estão os pontos que hoje trocam
de estado de forma abrupta, e propõe uma receita consistente pra suavizar isso —
seguindo o mesmo estilo de tokens/convenções que o projeto já usa, sem introduzir
nenhuma biblioteca nova. Serve de referência pra quando isso virar tarefa de
implementação (idealmente em fases, não tudo de uma vez — ver seção de fases).

## Como o sistema de transições funciona hoje (base pra encaixar o novo)

O projeto não usa nenhuma lib de animação (sem framer-motion, gsap, react-spring —
confirmado no `package.json`). Tudo é CSS puro, e já existem alguns tokens de timing
centralizados em `frontend/src/index.css:99-102` que devem continuar sendo a única
fonte de verdade pra duração/easing:

```css
--ease-out: cubic-bezier(.16, 1, .3, 1);
--duration-fast: 150ms;
--duration-base: 250ms;
```

Só existem 3 `@keyframes` hoje, todos em `App.css`, e todos já corretamente embrulhados
em `@media (prefers-reduced-motion: no-preference)` — esse é o padrão a estender, não
reinventar:

- `hero-in` (`App.css:51`) — fade + slide de entrada, landing/hero.
- `shimmer` (`App.css:511`) — loading dos `Skeleton`/`SkeletonRow`.
- `toast-in` (`App.css:554`) — entrada do toast (`Toast.jsx`).

Fora dos keyframes, há ~28 seletores `:hover`/`:focus`/`:active` com `transition:`
(botão primário, cards, ícones, swatch de cor de destaque etc.) — funcionam bem, mas
**não** estão dentro de nenhum `prefers-reduced-motion`, ao contrário dos keyframes.
Isso é uma lacuna: hoje quem pede menos movimento ainda vê hover de card subir
(`transform: translateY`), seta de botão deslizar, swatch dar `scale(1.08)`, etc.

### Pontos que trocam de estado sem nenhuma transição

Levantamento feito diretamente no código (não é suposição):

| Onde | Arquivo | Estado hoje |
|---|---|---|
| Troca de view no Dashboard (clicar num item da sidebar) | `App.jsx:290-330` (if/return dentro do `<Suspense>` de `App.jsx:425`) | Troca instantânea da subárvore React, `.dashboard-content` (`App.css:360`) só tem `padding`, nenhum `transition`/`animation` |
| Abrir/fechar qualquer modal (`FormModal`, `ConfirmDialog`, `CropFotoModal`, `NovidadePopup`) | todos usam `react-modal` (`package.json`) | Monta/desmonta o DOM na hora — sem `closeTimeoutMS`, sem classes `--after-open`/`--before-close`, sem nenhuma regra em `modalStyles.js` ou `App.css:518-528` |
| Backdrop da gaveta mobile da sidebar | `.sidebar-backdrop`, renderizado condicionalmente em `App.jsx:334`, CSS em `App.css:881` | Aparece/some no DOM abrupto, sem `opacity`/`transition` |
| Texto dos itens do menu ao colapsar a sidebar (desktop) | `App.css:941` (`.sidebar.collapsed .side-nav button`) | O container (`.sidebar`) já anima `width` (`App.css:283`), mas o `<span>` do label some junto, sem fade próprio |
| Accordion "Como usar" | `<details>` nativo em `ComoUsar.jsx:166`, chevron anima (`App.css:193-194`) | O corpo (`.doc-item-body`, `App.css:196`) expande/colapsa do jeito nativo do `<details>` — sem altura animada, "pula" |
| Saída/dismiss do toast | `Toast.jsx:15-19` (`dismiss` só filtra o array) | Entrada é animada (`toast-in`), saída é instantânea — remove do array e o React desmonta na hora |
| Anel de foco de inputs de formulário | `App.css:527-528` | `box-shadow`/`border-color` mudam de valor sem `transition` — aparecem de uma vez |

Não existem dropdowns/menus contextuais customizados no projeto hoje (só `<select>`
nativo e a própria sidebar) — não há nada herdado pra suavizar nessa categoria porque
o padrão ainda não existe.

## Decisão de design: princípios pra guiar a receita

- **Continuar sem biblioteca.** O app inteiro já é CSS puro com tokens próprios; trazer
  framer-motion/gsap só pra isso adicionaria peso ao bundle e uma segunda linguagem de
  animação convivendo com a que já existe. Tudo abaixo é resolvível com CSS
  (`transition`, `@keyframes`, e no caso do accordion, o truque de
  `grid-template-rows` — ver seção do accordion).
- **Reaproveitar os tokens existentes** (`--ease-out`, `--duration-fast`,
  `--duration-base`) em vez de valores soltos novos. Adicionar só o que faltar (ex.:
  uma `--duration-slow` pra movimentos maiores, tipo troca de view).
- **Sempre dentro de `prefers-reduced-motion: no-preference`**, do jeito que os 3
  keyframes atuais já fazem — e aproveitar esse trabalho pra fechar a lacuna dos ~28
  hovers/focus que hoje ficam fora disso (ver Fase 4).
- **Motion funcional, não decorativo.** A meta é preencher lacunas de continuidade
  (dar feedback de que algo mudou, suavizar o "pulo" entre estados), não adicionar
  floreio. Nenhuma das propostas abaixo deveria ser perceptível como "efeito" — só
  deveria parecer que o app ficou menos abrupto.

## A receita por área

### 1. Troca de view no Dashboard

Fade curto (sem slide — a view nova pode ter altura bem diferente da anterior, slide
vertical exageraria isso). Como a troca hoje é um `if/return` simples dentro do
`Suspense` (`App.jsx:290-330`), o jeito mais direto sem reestruturar a navegação é dar
uma `key` estável por view ao container de conteúdo e animar a entrada via
`@keyframes` com `animation: view-in ... both` (igual ao padrão já usado em
`hero-in`/`toast-in`), disparando de novo a cada troca de `key`. Não precisa animar
saída — a view antiga já é substituída no mesmo frame que a nova aparece, então só a
entrada é perceptível.

### 2. Modais (react-modal)

`react-modal` já suporta isso nativamente via a prop `closeTimeoutMS` + as classes
`ReactModal__Overlay`/`ReactModal__Content` com sufixos `--after-open`/
`--before-close` (basta passar `className`/`overlayClassName` como objeto
`{ base, afterOpen, beforeClose }` em vez de string, nos 4 usos: `FormModal.jsx`,
`ConfirmDialog.jsx`, `CropFotoModal.jsx`, `NovidadePopup.jsx`). O CSS entra em
`App.css` perto de `.modal-header`/`.modal-form` (hoje `App.css:518-528`): overlay
com fade de opacidade, conteúdo com fade + leve `scale`/`translateY` de entrada e
saída, `closeTimeoutMS` batendo com a duração do CSS (senão o React desmonta antes da
transição de saída terminar).

### 3. Backdrop da gaveta mobile

Mais simples do que parece: como já é condicional no JSX (`App.jsx:334`), dá pra
trocar pra sempre renderizado + uma classe de estado (`.sidebar-backdrop.visible`) com
`opacity`/`transition`, em vez de montar/desmontar — mesma ideia do `.sidebar-open`
que já existe pro próprio menu (`App.css:883-892`). Consistente com o slide que a
sidebar já tem.

### 4. Texto do menu ao colapsar a sidebar

Fade do `<span>` do label um pouco antes/junto do resize do container, pra não sumir
"cortado" no meio do encolhimento. Ajuste pequeno em `App.css:941` (adicionar
`transition: opacity` no span do label e coordenar com a mesma duração do `width` que
`.sidebar` já anima em `App.css:283`).

### 5. Accordion "Como usar"

`<details>` nativo não anima altura sem JS ou sem o truque de CSS Grid. Opção que
mantém a semântica nativa (`open`/toggle, acessibilidade grátis) sem introduzir JS: o
padrão de "grid-rows trick" — envolver o conteúdo de `.doc-item-body` num wrapper com
`display: grid; grid-template-rows: 0fr; transition: grid-template-rows` e o filho
direto com `overflow: hidden`, virando `1fr` quando `[open]`. Precisa checar suporte
de navegador (é um recurso relativamente recente de Grid, mas já amplamente
suportado) antes de implementar — ver seção de riscos.

### 6. Saída do toast

Hoje `dismiss()` (`Toast.jsx:15-19`) remove do array na hora. Precisa de um pequeno
ajuste de lógica, não só CSS: marcar o toast como `exiting: true` no state, disparar
uma classe (`.toast.exiting`) com a animação reversa de `toast-in`, e só remover do
array de fato depois que a animação terminar (via `onAnimationEnd` ou um
`setTimeout` do tamanho da duração da animação). Afeta tanto o dismiss manual (clique
no X) quanto o automático (o `setTimeout` de 3.5s em `Toast.jsx:24`).

### 7. Anel de foco dos inputs

O menor ajuste do plano: adicionar `transition: border-color .15s ease, box-shadow
.15s ease` em `App.css:527` (ou reaproveitar `--duration-fast`/`--ease-out`). Não tem
risco nenhum — é puramente cosmético e não depende de estado em JS.

## Onde NÃO aplicar

- **Skeleton (`shimmer`)** já está correto do jeito que está — não mexer.
- **Hero da landing (`hero-in`, `.reveal`, grids)** já está correto — não mexer, só
  serve de referência de estilo pro que for novo.
- **Tabelas com dado ao vivo** (listas de entregas/gastos que recarregam via
  polling/refetch) não deveriam ganhar fade a cada atualização — reduz legibilidade e
  pode mascarar erros de dado (uma linha "piscando" toda hora vira ruído, não
  suavização). Só a transição de *loading → carregado* (já coberta pelo skeleton) faz
  sentido animar.
- **Toggle de tema claro/escuro e troca de cor de destaque**: essas duas trocas de
  `data-theme`/`data-accent` já se propagam via CSS custom properties pra praticamente
  toda a UI de uma vez (dezenas de elementos). Animar isso globalmente (ex.: transition
  em `background`/`color` no `*`) é conhecido por ficar "pesado"/dessincronizado em
  telas com muito conteúdo — melhor deixar instantâneo aqui, como já é hoje.

## Riscos e pontos de atenção

- **Modal com `closeTimeoutMS`**: se o valor do JS não bater exatamente com a duração
  do CSS de saída, o modal pode "piscar" (reaparecer um frame) ou ser removido do DOM
  antes da transição visual terminar. Testar com throttling de CPU.
- **Troca de view via `key` + `@keyframes`**: como as views são `lazy()` com
  `Suspense` (`App.jsx:29-43`), clicar rápido entre dois itens da sidebar antes do
  fade da view anterior terminar não deve travar nem empilhar animações — testar
  cliques rápidos/repetidos antes de considerar pronto.
- **Grid-rows trick no accordion**: depende de suporte a animar
  `grid-template-rows`, que nem todo navegador mais antigo cobre bem — checar a
  matriz de compatibilidade antes de trocar o `<details>` nativo (que hoje funciona
  em qualquer navegador sem JS nenhum).
- **Escopo grande ("todo o projeto")**: fazer tudo de uma vez aumenta muito a
  superfície de regressão visual. A ordem de fases abaixo prioriza o que é mais
  isolado/barato primeiro.
- **`prefers-reduced-motion`**: qualquer `@keyframes` novo tem que entrar no mesmo
  padrão `@media (prefers-reduced-motion: no-preference)` que os 3 existentes já
  seguem — não regredir esse comportamento.

## Fases sugeridas (ordem de implementação)

1. **Fase 1 — ganhos baratos e isolados, sem mudança de lógica em JS**: anel de foco
   (item 7), backdrop da gaveta mobile (item 3), fade do texto ao colapsar sidebar
   (item 4). Puramente CSS, zero risco de regressão de estado.
2. **Fase 2 — troca de view no Dashboard** (item 1): CSS + uma `key` no container,
   ainda sem tocar em componentes de terceiros.
3. **Fase 3 — modais** (item 2): mexe em 4 componentes + `react-modal`, precisa de
   teste mais cuidadoso de timing (`closeTimeoutMS`).
4. **Fase 4 — saída do toast** (item 6): pequena mudança de lógica de estado.
5. **Fase 5 — accordion "Como usar"** (item 5): a mais arriscada em termos de suporte
   de navegador, deixar por último.
6. **Fase 6 — fechar a lacuna do `prefers-reduced-motion`** nos ~28 hovers/focus que
   hoje ficam fora dele: envolver o conjunto num único bloco
   `@media (prefers-reduced-motion: no-preference)` em vez de deixá-los soltos (ou,
   alternativamente, uma regra "rede de segurança" que zera durações quando
   `prefers-reduced-motion: reduce` está ativo — decidir qual das duas abordagens ao
   chegar nessa fase).

## Resumo do que muda em cada arquivo (referência pra implementação futura)

- **`frontend/src/index.css`**: eventualmente um novo token `--duration-slow` (troca
  de view); nenhuma mudança estrutural nos temas de cor/claro-escuro.
- **`frontend/src/App.css`**: a maior parte do trabalho — novo `@keyframes view-in`;
  ajustes em `.sidebar-backdrop`, `.sidebar.collapsed .side-nav button span`,
  `.modal-form input:focus`; novo bloco de animação de entrada/saída pro modal perto
  de `App.css:518-528`; novo `@keyframes toast-out` perto de `App.css:553-555`;
  grid-rows trick em `.doc-item-body` (`App.css:196`).
- **`frontend/src/components/Toast.jsx`**: precisa de um campo `exiting` no state de
  cada toast e um delay antes de remover do array de vez (não é só CSS).
- **`frontend/src/components/FormModal.jsx`, `ConfirmDialog.jsx`, `CropFotoModal.jsx`,
  `NovidadePopup.jsx`**: passar `closeTimeoutMS` e `className`/`overlayClassName`
  como objeto `{ base, afterOpen, beforeClose }` pro `react-modal`.
- **`frontend/src/App.jsx`**: `key` estável no container de `renderActiveView()`
  (`App.jsx:290-330`/`425`) pra disparar a animação de entrada a cada troca; trocar
  a renderização condicional do backdrop (`App.jsx:334`) por sempre-renderizado +
  classe de estado.
- **`frontend/src/components/ComoUsar.jsx`**: wrapper extra em volta do conteúdo de
  `.doc-item-body` (`ComoUsar.jsx:166`) pro grid-rows trick.

## Verificação (quando isso virar implementação)

- Testar cada item com `prefers-reduced-motion: reduce` forçado nas devtools —
  confirmar que o comportamento cai pro estado final instantâneo, igual ao que os 3
  keyframes atuais já garantem.
- Testar interação rápida/repetida em cada área: clicar várias vezes seguidas em
  itens da sidebar, abrir/fechar modal repetidamente, disparar e dispensar toasts em
  sequência — nenhuma dessas ações deveria travar estado ou empilhar animações.
- Testar com CPU throttled (DevTools → Performance → CPU 4x/6x slowdown) pra garantir
  que as transições não engasgam em dispositivos mais fracos.
- Conferir suporte de navegador do grid-rows trick do accordion antes de trocar o
  `<details>` nativo por ele.
- Teste visual em claro/escuro × as 7 cores de destaque pra cada item novo (mesma
  varredura que já foi feita pro fundo do item selecionado da sidebar).
