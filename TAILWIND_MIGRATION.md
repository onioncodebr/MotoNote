# Migração do MotoNote para Tailwind CSS

> Planejamento de como sair do CSS puro atual (`App.css` + `index.css` + estilos
> inline pontuais) para Tailwind, sem quebrar o sistema de temas (claro/escuro +
> cor de destaque) já em produção. Este documento é só o plano — a migração em
> si é feita depois, aos poucos.

> **Status: setup feito + 8 lotes migrados.** Tailwind v4 instalado (via
> `@tailwindcss/vite`, não a config `postcss`/v3 do rascunho original da seção
> 5 — ver nota lá). Lote 1: `IconButton.jsx`, `Skeleton.jsx`/`SkeletonRow`,
> `Toast.jsx`. Lote 2: `Button.jsx` (novo componente) substituindo `.button`/
> `.button-dark/-light/-outline/-danger`/`.small-button`/`.full-button` nos
> 25 arquivos que usavam essas classes — achado importante nesse lote, ver
> seção 4-A: um bug real de cascade layers do Tailwind v4 (`a { color:
> inherit }` sem `@layer` vencendo qualquer utilitário de cor do Tailwind em
> tags `<a>`) foi encontrado e corrigido. Lote 3: `.form-actions`/
> `.form-error`/`.form-success`/`.modal-header` inlinados (sem componente
> novo — são só layout/cor, sem variantes) nos 3+5+7 arquivos que usavam.
> `ConfirmDialog.jsx` e `FormModal.jsx` agora só têm `.modal-form` e
> `.confirm-dialog-message` como classes legado restantes. Lote 4:
> `Logo.jsx` — a cor contextual (`.dashboard-shell .brand`) virou a variante
> arbitrária `[.dashboard-shell_&]:text-[var(--dash-text-strong)]` do
> Tailwind em vez de uma prop nova no componente, ver seção 6 item 4. Lote 5:
> `.panel`/`.panel-header`/`.dashboard-toolbar`/`.pagination-bar`/
> `.empty-state`/`.view-loading`/`.view-error` inlinados (18, 25, 16, 10, 14,
> 1 e 13 arquivos) — descoberta importante ao investigar essa rodada: as
> "telas médias" do plano original não eram isoladas, dependiam de um
> mini design-system de tabela (`.table-header`/`.table-row` com
> `grid-template-columns` específico por view) usado por 7-18 arquivos cada.
> Esse conjunto (`.table-header`/`.table-row`/`.table-actions`/
> `.cell-title`/`.delete-button`/`.modal-form`) fica deliberadamente de fora
> por enquanto — ver seção 6 item 5. Lote 6: layout específico das telas
> grandes que *não* esbarrava no sistema de tabela — `.toolbar-filters`
> (5 arquivos), `.configuracoes-grid`/`.configuracoes-grid-full` (6),
> `.configuracoes-section-title` (3), `.panel-perfil-body`/
> `.perfil-subcampos` (1 cada) e a dupla `.entregas-view .view-content-grid`
> (usada também por `GastosView.jsx`, apesar do nome — a classe
> `.entregas-view` virou só um wrapper genérico reaproveitado, sem estilo
> próprio, então saiu de vez das duas telas). `.delivery-form` ficou de fora
> pelo mesmo motivo do `.modal-form` (estiliza `label`/`input`/`select`
> soltos, usado em vários arquivos). O sistema de gráficos/métricas de
> `VisaoGeralView.jsx`/`VisaoGeralMasterView.jsx` (`.analytics-grid`,
> `.metric-card`, `.donut`, `.rider-avatar` etc.) também ficou de fora —
> visualmente complexo (donut chart, eixos de gráfico) e demonstrou ser
> compartilhado entre as duas telas, merece rodada própria. Ver seção 6
> item 6 pra detalhes de tudo que ficou de fora. Lote 7:
> `AparenciaPanel.jsx` (`.appearance-section`, `.theme-mode-toggle`,
> `.accent-swatches`/`.accent-swatch`/`.accent-swatch-circle`/
> `.accent-swatch-label` — todas exclusivas desse arquivo). Interações
> testadas de verdade (não só visual): `.accent-swatch:hover
> .accent-swatch-circle { transform: scale(1.08) }` virou `group`/
> `group-hover:scale-[1.08]`, e `.accent-swatch[aria-pressed="true"]
> .accent-swatch-circle { box-shadow: ... }` virou `group-aria-pressed:
> shadow-[...]` (variante ARIA do Tailwind, composta com `group`) —
> confirmado via `getComputedStyle` que o anel de seleção só aparece com
> `aria-pressed="true"` e some com `"false"`. Lote 8: containers de
> `.modal-form`/`.delivery-form`/`.filters-form` (13 arquivos) — só o
> `display`/`grid-template-columns`/`gap`/`margin-top` do container em si,
> **mantendo as 3 classes como gancho** pro `label`/`input`/`select`/
> `textarea` soltos dentro delas, que vêm de `{children}` passados por 9
> arquivos via `<FormModal>` além dos consumidores diretos — migrar campo a
> campo (~70+ elementos) não valia o risco/esforço pra um estilo 100%
> idêntico em todo lugar; ficou como CSS compartilhado de propósito, mesmo
> padrão já usado em `.dashboard-toolbar`/`.panel`. Override contextual
> resolvido calculando o valor final direto (mesma técnica dos lotes
> anteriores): `.panel-perfil-body .delivery-form` foi eliminado por completo
> — a classe `panel-perfil-body` não tinha mais nenhum outro uso, então saiu
> do `ConfiguracoesView.jsx` também.

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
3. **Lote 3 — feito: `.form-actions`/`.form-error`/`.form-success`/
   `.modal-header` (3, 5, 7 e 1 arquivos, com sobreposição — 9 arquivos no
   total).** Diferente do `.button`, esses são só layout/cor sem variantes —
   não valia criar componente, foram inlinados direto como utilitários
   Tailwind em cada `className`. Duas contextualizações resolvidas calculando
   o valor final direto (em vez de manter hook class):
   - `.foto-perfil-coluna .form-actions { justify-content: center }` →
     `FotoPerfilPanel.jsx` já nasce com `justify-center` em vez do
     `justify-end` padrão.
   - `.filters-form .form-actions { margin-top: 0; justify-content:
     flex-start }` e `.filters-error { margin-top: 15px }` →
     `RelatoriosView.jsx` recebeu esses valores já calculados
     (`mt-0 justify-start` no lugar das ações, `mt-[15px]` no erro).
   `.modal-header h2` também migrou (só existia dentro do `.modal-header` que
   sumiu, então precisava ir junto). **`.modal-form` ficou de fora de
   propósito** — estiliza `label`/`input`/`select` que em `FormModal.jsx` vêm
   de `{children}` passados por outros arquivos (não só do próprio
   `FormModal`/`ConfirmDialog`), então migrar exige mapear quem usa
   `<FormModal>` primeiro — fica pra outra rodada.
4. **Lote 4 — feito: `Logo.jsx`.** A cor contextual (`:root { --ink }` fixo
   fora do dashboard vs. `.dashboard-shell .brand { color:
   var(--dash-text-strong) }` dentro dele, pra funcionar no escuro) resolvida
   com a variante arbitrária do Tailwind
   `[.dashboard-shell_&]:text-[var(--dash-text-strong)]` — sem prop nova no
   componente, já que dashboard e landing/login nunca renderizam ao mesmo
   tempo (o ancestral no DOM já basta pra decidir o tom). Testado
   isoladamente via `getComputedStyle`: o texto muda de `#181818` fixo pra
   `--dash-text-strong` (claro no tema escuro) só quando envolvido por
   `.dashboard-shell`. `.brand-subtitle` continua existindo como classe
   vazia (mesmo padrão dos lotes anteriores) só pelo `.landing-nav
   .brand-subtitle { display: none }` no mobile.
5. **Lote 5 — feito: primitivos de painel/toolbar (não eram "telas médias"
   isoladas como o rascunho original desta seção previa).** Investigando
   `GastosView`/`ValesView`/`UsuariosView`/`MotoboysView` antes de mexer,
   apareceu um padrão bem maior: `.panel` (18 arquivos), `.panel-header`
   (25), `.dashboard-toolbar` (16), `.pagination-bar` (10), `.empty-state`
   (14), `.view-loading` (1) e `.view-error` (13) — um mini design-system de
   painel/tabela usado por quase todo o dashboard, não algo particular de
   4 telas. Migrados via script (substituição de string exata do
   `className`, não regex, pra não arriscar casar coisa errada) direto pra
   utilitários Tailwind, com hook classes mantidas onde uma regra CSS
   descendente ainda depende delas:
   - `panel` → estiliza `<h2>` solto via `.panel h2` (sem classe própria).
   - `dashboard-toolbar` → estiliza `<strong>`/`<span>`/`<select>` soltos e
     o breakpoint de telefone.
   - `empty-state`/`view-error` → estilizam o `<svg>` do ícone (cor
     diferente em cada um).
   - `pagination-bar` e `view-loading` **não precisaram de hook** — o
     primeiro porque seu único filho estilizado (`button`) já é sempre um
     `<Button>` desde o lote 2 (não depende mais de CSS ancestral), o
     segundo porque não tem nenhuma regra descendente.
   Verificado via `getComputedStyle` (cor do ícone de empty-state/view-error,
   cor do `<strong>` do toolbar) e visualmente num painel de exemplo, em vez
   de só inspecionar código.
   **Ficou de fora de propósito — `.table-header`/`.table-row`/
   `.table-actions`/`.cell-title`/`.delete-button`:** têm
   `grid-template-columns` diferente por view (10+ variações) e um sistema
   inteiro de responsividade "linha vira card no celular" via `:has()`/
   `:not()` (ver `@media (max-width: 900px)` em `App.css`) — migrar isso
   exige decidir como representar colunas variáveis em Tailwind (arbitrary
   `grid-cols-[...]` por view, provavelmente) e mexer no CSS responsivo com
   cuidado. Fica pra uma rodada própria, junto do `.modal-form` já adiado.
6. **Lote 6 — feito: layout específico de `EntregasView`/`GastosView`/
   `ConfiguracoesView`/`MotoboyContaView`/`ConfiguracaoGlobalView`/
   `AparenciaPanel`/`ValesView`/`ValoresPendentesView`/`VisaoGeralView`
   (só a parte de layout que não esbarra em sistemas já adiados).**
   Confirmando a suspeita do item 5: investigar essas telas antes de mexer
   mostrou de novo que "grande" não é sinônimo de "acoplada" — a maior parte
   do conteúdo dessas telas já são primitivos dos lotes 2/3/5
   (`Button`/`panel`/`dashboard-toolbar`/etc.), só faltava o layout de grid
   específico de cada uma. Migrado:
   - `.toolbar-filters` (5 arquivos) — sem hook, a versão mobile também virou
     Tailwind (`max-[650px]:w-full`, arbitrary breakpoint já que o app usa
     650px, fora da escala padrão do Tailwind).
   - `.entregas-view .view-content-grid` → `grid grid-cols-[350px_1fr]
     max-[1080px]:grid-cols-1 ...` direto no elemento, sem hook — a classe
     `.entregas-view` em si nunca teve estilo próprio (só existia pra
     escopar essa regra), então saiu inteira dos dois arquivos que a usavam
     (`EntregasView.jsx` **e** `GastosView.jsx`, que reaproveitava o mesmo
     nome de classe apesar de não ser a tela de entregas).
   - `.configuracoes-grid` → mesmo tratamento, mas manteve o hook porque
     `.configuracoes-grid .delivery-form input:disabled` ainda depende dele.
   - `.configuracoes-grid-full` → virou `col-span-full` (utilitário nativo
     do Tailwind, equivalente exato a `grid-column: 1 / -1`).
   - `.configuracoes-section-title`, `.perfil-subcampos` → inlinados sem
     hook (nada mais depende deles).
   - `.panel-perfil-body` → manteve o hook pelo mesmo motivo do
     `.configuracoes-grid` (`.panel-perfil-body .delivery-form`).
   **Ficou de fora de propósito:**
   - `.delivery-form` — mesma razão do `.modal-form` (seção 7): estiliza
     `label`/`input`/`select`/`textarea` soltos, usado em vários arquivos
     além de onde foi visto aqui.
   - O sistema de gráficos/métricas de `VisaoGeralView.jsx` e
     `VisaoGeralMasterView.jsx` (`.analytics-grid`, `.metric-grid`,
     `.metric-card`, `.metric-icon`, `.big-chart`, `.chart-block`, `.donut`,
     `.grid-lines`, `.x-axis`/`.y-axis`, `.rider-avatar`, `.row-arrow`,
     `.table-amount`) — compartilhado entre as duas telas (não é exclusivo
     de uma), visualmente rico (gráfico de linha com eixos, donut chart via
     provavelmente `conic-gradient`, badges de cor por categoria) e arriscado
     de migrar sem testar visualmente com muito cuidado. Fica pra uma rodada
     própria, focada só nisso.
   - `AparenciaPanel.jsx` (grade de amostras de cor, toggle de tema) foi
     migrado por completo no lote 7, ver acima.
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
