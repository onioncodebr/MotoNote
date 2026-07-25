# Tema "Liquid Glass" (claro e escuro)

Documento de planejamento, sem implementação. Documenta como construir um
tema visual adicional estilo "Liquid Glass" da Apple (vidro fosco
translúcido, blur, brilho nas bordas), com versão clara e escura, encaixado
no sistema de temas que já existe. Serve de referência pra quando isso
virar uma tarefa de implementação.

## Como o sistema de temas funciona hoje (base pra encaixar o novo)

- **Tema claro/escuro**: `theme` (`'light'`/`'dark'`), estado em `App.jsx`,
  persistido em `localStorage`, aplicado como atributo `data-theme` no
  `<html>` (`document.documentElement.dataset.theme = theme`). O CSS reage
  via `:root[data-theme="dark"] { --dash-bg: ...; --dash-surface: ...; }`
  (`index.css`) — só 12 variáveis (`--dash-*`) mudam entre os dois.
- **Cor de destaque**: `accentColor` (7 opções), mesmo padrão —
  `data-accent` no `<html>`, e cada cor redefine `--brand-accent` e mais 5
  variáveis dentro de `.dashboard-shell`, com um bloco pra claro e outro
  pra escuro (`:root[data-accent="azul"] .dashboard-shell {...}` /
  `:root[data-theme="dark"][data-accent="azul"] .dashboard-shell {...}`).
- Praticamente todo o visual (sidebar, cards, header, modais) já usa só
  essas variáveis (`--dash-surface`, `--dash-border`, `--dash-text-*`,
  `--brand-accent`, `--shadow-*`) — nenhum componente tem cor hardcoded.
  Isso é uma base ótima: um tema novo não precisa mexer em nenhum
  componente React, só em CSS.
- Hoje não existe nenhum `backdrop-filter`/blur/glassmorphism no projeto —
  o visual é 100% opaco (superfícies sólidas + borda 1px + sombra leve).

## Decisão de design: "Liquid Glass" como um terceiro eixo, não substituindo claro/escuro

Um tema **adicional** que funcione tanto claro quanto escuro não pode ser
um terceiro valor de `theme` (isso obrigaria escolher entre "Escuro" OU
"Liquid Glass", perdendo a combinação). A abordagem correta é um **novo
eixo independente**, do mesmo jeito que `accentColor` já é independente de
`theme`:

- Novo estado `estiloVisual` (`'padrao'` / `'glass'`), mesmo padrão dos
  outros dois: `localStorage`, atributo novo no `<html>`
  (`data-style="glass"`), passado como prop até `AparenciaPanel`.
- Resultado: **Claro+Padrão** (atual), **Escuro+Padrão** (atual),
  **Claro+Glass** (novo) e **Escuro+Glass** (novo) — todos combináveis
  também com as 7 cores de destaque já existentes, sem precisar duplicar
  a tabela de 7 cores (o glass só tinge o vidro usando `var(--brand-accent)`
  que a cor escolhida já define).

## A receita visual do "Liquid Glass"

Aproximação realista em CSS puro (sem WebGL/shaders — o efeito real da
Apple usa refração dinâmica, mas o "look" dá pra chegar perto com):

1. **Superfície translúcida com blur**: em vez de `--dash-surface` sólido,
   `background: rgba(255,255,255,.55)` (claro) / `rgba(20,20,20,.55)`
   (escuro) + `backdrop-filter: blur(24px) saturate(160%)` (com prefixo
   `-webkit-backdrop-filter` pra Safari).
2. **Brilho na borda superior** (simula reflexo de luz no vidro): borda de
   1px com gradiente, ou `box-shadow: inset 0 1px 0 rgba(255,255,255,.35)`
   no topo do card/sidebar.
3. **Sombra mais suave e espalhada**: sombras atuais (`--shadow-sm`) são
   discretas; vidro pede uma sombra mais larga e difusa por baixo
   (`0 8px 30px rgba(0,0,0,.15)`), pra dar sensação de "flutuando".
4. **Cantos mais arredondados**: Liquid Glass da Apple usa cantos bem
   generosos (efeito "pílula/bolha") — aumentar `border-radius` nos
   containers principais só quando `data-style="glass"`.
5. **Fundo com "aurora" atrás do vidro** — **o ponto mais importante e o
   mais fácil de esquecer**: `backdrop-filter: blur()` só cria o efeito de
   vidro de verdade se houver *alguma coisa com detalhe/cor* atrás pra
   borrar. Hoje o fundo (`--dash-bg`) é uma cor sólida lisa — borrar uma
   cor sólida não produz nenhum efeito visível. Precisa de uma camada de
   fundo com gradientes suaves ("blobs" de cor, tipo aurora boreal) atrás
   do conteúdo, usando o `--brand-accent` escolhido + 1-2 cores
   complementares, baixa opacidade, `position: fixed` atrás de tudo (um
   `::before` em `.dashboard-shell`, só renderizado no modo glass).

## Onde aplicar (containers que já existem, só trocam de regra CSS)

Nenhum precisa de mudança estrutural, só novas regras `[data-style="glass"]`:

- `.sidebar` (`App.css:283`) — vidro fosco lateral.
- `.panel` (cards, `App.css:402`) — cada card vira um "vidro" flutuante.
- `.dashboard-header` (`App.css:344`) — barra superior translúcida.
- Modal (`modalStyles.js`, `getModalStyles`) — como é estilo inline (JS,
  não classe CSS), precisa de um pequeno ajuste: ler `estiloVisual` (ou o
  atributo do `<html>`) e escolher entre dois objetos de estilo, ou trocar
  pra `var(--dash-surface)`/`var(--dash-blur)` controlados por CSS vars
  (mais simples: já é `background: 'var(--dash-surface)'`, então só
  redefinir a variável já basta — o `backdrop-filter` do modal em si
  precisaria de uma linha nova no objeto de estilo, condicional).
- `.dashboard-shell` (`App.css:257`) — recebe a camada de "aurora" de
  fundo (item 5 acima).

## Onde NÃO aplicar translucidez forte (legibilidade)

Pra não comprometer contraste/legibilidade (a Apple também não aplica
Liquid Glass em texto denso, só em elementos de navegação/chrome):
tabelas de dados (Entregas, Gastos etc.), campos de formulário e o corpo
de texto continuam com fundo bem mais opaco (`rgba(...,.9)` ou até sólido)
mesmo no modo glass — só sidebar, header, cards-container e modais ganham
o efeito mais forte.

## Riscos e pontos de atenção pra quando isso virar implementação

- **Performance**: `backdrop-filter` é pesado pra GPU, e a sidebar é
  `position: sticky` (repinta ao rolar). Testar em celular de verdade (o
  público motoboy usa isso no celular) — se travar, considerar reduzir
  o blur ou desativar em telas pequenas via `@media (max-width: 640px)`.
- **Contraste/acessibilidade**: fundo com blur pode reduzir contraste de
  texto dependendo do que estiver atrás. Testar com o "aurora" de fundo em
  ambos os temas e reforçar opacidade da superfície se ficar difícil ler.
- **Suporte de navegador**: `backdrop-filter` tem suporte amplo hoje, mas
  o Safari sempre exigiu o prefixo `-webkit-`. Envolver as regras num
  `@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))`
  com um fallback translúcido sem blur pra navegadores muito antigos.

## Resumo do que muda em cada arquivo (referência pra implementação futura)

- `frontend/src/App.jsx` — novo estado `estiloVisual` + persistência
  `localStorage` + `data-style` no `<html>`, mesmo padrão de `theme`/`accentColor`.
- `frontend/src/components/AparenciaPanel.jsx` — nova seção "Estilo"
  (Padrão / Liquid Glass), reaproveitando o mesmo padrão visual dos
  botões de Modo já existentes.
- Novo arquivo `frontend/src/theme-glass.css` (importado uma vez, regras
  só ativas sob `[data-style="glass"]`) — mantém o `App.css` principal
  limpo, fácil de remover o tema inteiro revertendo um único import.
- `frontend/src/components/modalStyles.js` — pequeno ajuste condicional
  pra o `backdrop-filter` do modal.

## Verificação (quando isso virar implementação)

Testar visualmente as 4 combinações nas telas principais (Dashboard,
Configurações, um modal aberto), testar rolagem de uma tabela longa no
celular (performance), e checar contraste de texto em ambos os temas do
modo glass.
