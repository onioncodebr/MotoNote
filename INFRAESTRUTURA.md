# Infraestrutura de deploy — como foi montada

Este arquivo explica **como e por que** cada arquivo de build/deploy foi
criado. Ele é sobre arquitetura e decisões técnicas — pra saber os *passos*
de como colocar isso no ar, o guia é o `DEPLOY.md`.

## Visão geral

A aplicação roda em **3 containers**: `mongodb`, `backend` (Spring Boot) e
`frontend` (Nginx servindo os arquivos estáticos do React). Nenhum deles
expõe porta pro host da VPS — o único ponto exposto nas portas 80/443 é o
Nginx Proxy Manager (NPM), que já roda separado na mesma VPS e alcança os
containers desta app por uma rede Docker compartilhada.

## `Dockerfile` (raiz — build do backend)

Multi-stage, duas imagens:

1. **`build`** (`maven:3.9-eclipse-temurin-21`) — compila o `.jar`.
   - `COPY pom.xml .` e `mvn dependency:go-offline` **antes** de copiar o
     código-fonte: isso separa o download de dependências numa camada de
     cache própria do Docker. Se só o código mudar (o caso comum), essa
     camada é reaproveitada e o build não baixa tudo de novo — só quando o
     `pom.xml` muda é que essa camada expira.
   - `mvn package -DskipTests`: os testes já rodam antes, no CI/localmente;
     não precisa rodar de novo dentro do build de imagem.
2. **`runtime`** (`eclipse-temurin:21-jre`, não a JDK completa) — só o
   necessário pra *rodar* Java, sem compilador, o que deixa a imagem final
   bem menor.
   - Roda como usuário `app` sem privilégio (`useradd --system`), não como
     `root` — se um dia uma vulnerabilidade permitir execução de código
     dentro do container, o estrago fica limitado ao que esse usuário sem
     privilégio consegue fazer.
   - Copia só o `.jar` final do stage anterior (`COPY --from=build`) — o
     código-fonte, o Maven e o JDK completo nunca entram na imagem final.

Removi antes uma flag `--enable-preview` que existia no `pom.xml`: nada no
código realmente precisa dela (confirmado compilando manualmente sem a
flag), e ela obrigaria rodar o `.jar` final com `java --enable-preview`,
uma dependência frágil e desnecessária pra produção.

## `.dockerignore` (raiz)

Evita copiar pro contexto de build coisas que nunca deveriam ir pra dentro
da imagem: `target/` (build antigo), `.git/`, `.env`/`config/` (segredos
locais), o próprio `frontend/` (imagem separada, não precisa dele), `.mvn`
e os wrappers (`mvnw*`, já embutido no estágio de build via a imagem Maven),
`*.md`, imagens soltas e pastas de IDE/`.claude/`.

## `frontend/Dockerfile` (build do frontend)

Também multi-stage:

1. **`build`** (`node:22-alpine`) — `npm ci` (instala exatamente o que está
   no `package-lock.json`, mais determinístico que `npm install`) e
   `npm run build` (Vite gera os arquivos estáticos em `dist/`).
   - **De propósito, sem `VITE_API_URL`/`.env` copiado aqui**: quando essa
     variável não existe, `services/api.js` cai no default de caminho
     relativo (`fetch` pra `/api/...` em vez de uma URL absoluta). Isso é o
     que deixa o mesmo build funcionar em qualquer domínio sem nada
     hardcoded — só faz sentido porque em produção frontend e backend
     ficam atrás do **mesmo domínio** (ver seção de arquitetura no
     `DEPLOY.md` — é também o motivo do cookie de sessão usar
     `SameSite=Lax` sem precisar abrir CORS/CSRF pra outro domínio).
   - **`VITE_WHATSAPP_NUMBER` como `ARG`/`ENV`**: diferente do
     `VITE_API_URL`, esse número *precisa* vir de fora (não tem fallback
     que funcione sem ele — sem o número, o botão de suporte cai num link
     morto `#contato`). Como o Vite só embute variáveis `VITE_*` no bundle
     durante o build (não dá pra injetar depois, em runtime, num app
     estático), a única forma de configurar isso por ambiente é via
     `ARG`/`ENV` no Dockerfile, recebido como *build arg* do
     `docker-compose.prod.yml`, que por sua vez lê do `.env` da VPS.
2. **`runtime`** (`nginx:alpine`) — copia só o `dist/` gerado e o
   `nginx.conf` customizado. Não tem Node nem código-fonte na imagem final,
   só arquivos estáticos + Nginx.

## `frontend/nginx.conf`

Configuração mínima pra servir uma SPA:

- `/assets/` (os arquivos com hash no nome que o Vite gera, tipo
  `index-CFg1UXBT.js`) ganham `Cache-Control: public, immutable` por 1 ano
  — como o hash muda sozinho quando o conteúdo muda, cachear "pra sempre"
  nunca serve algo desatualizado.
- `index.html` explicitamente `no-cache` — é ele que referencia os assets
  certos da última build; se ficasse cacheado, quem já tinha a página
  aberta (ou instalada como PWA) não veria um deploy novo.
- `try_files $uri $uri/ /index.html` — fallback de SPA. O app hoje não usa
  router (é tudo estado interno em `App.jsx`), mas isso deixa o servidor já
  preparado caso um dia precise de URLs próprias por tela.
- **Não** tem nada de `/api/*` aqui — esse roteamento é feito pelo Nginx
  Proxy Manager (Custom Location no proxy host), não por este Nginx interno.
  Este container só serve arquivo estático.

## `frontend/.dockerignore`

Fora do contexto de build: `node_modules/` (reinstalado do zero com
`npm ci`), `dist/` (build antigo), `.env`/`.env.example` (segredos/config
local), o próprio `Dockerfile` e `.git/`.

## `docker-compose.prod.yml`

Arquivo separado do `docker-compose.yml` de desenvolvimento (que só sobe o
Mongo local, pro backend rodar fora de Docker). Pontos importantes:

- **`name: entregas-prod` + nomes de container/volume com sufixo `-prod`**
  (`entregas-mongodb-prod`, `motonote-backend-prod`, `motonote-frontend-prod`,
  `mongo_data_prod`): isso existe por causa de um incidente real durante o
  desenvolvimento — rodar este compose na mesma pasta/máquina onde o
  `docker-compose.yml` de dev já tinha um container `entregas-mongodb`
  rodando fez o Compose *recriar* esse container (mesmo nome = mesmo
  recurso pro Docker), interrompendo o Mongo de desenvolvimento por um
  instante. Os dados não se perderam (o volume nomeado é reaproveitado),
  mas a interrupção não deveria acontecer — daí o projeto e os nomes terem
  sufixo próprio, garantindo que os dois arquivos nunca mais colidam.
- **Nenhum serviço publica porta pro host** (`ports:` não aparece em
  nenhum). Só o Nginx Proxy Manager (fora deste compose, já rodando na VPS)
  fica exposto nas portas 80/443/443; ele alcança `frontend` e `backend`
  pela rede Docker compartilhada.
- **Duas redes**: `internal` (só `mongodb` ↔ `backend`, o frontend nunca
  precisa falar direto com o banco) e `proxy` (`external: true`,
  compartilhada com o NPM — o nome real, específico desta VPS, é
  configurado trocando o placeholder `nome_da_rede_do_npm` pelo nome
  encontrado com `docker network ls`/`docker inspect`, ver `DEPLOY.md`
  passo 6).
- **Tudo vem de variáveis de ambiente** (`${JWT_SECRET}`,
  `${MONGO_INITDB_ROOT_USERNAME}`, `${STRIPE_SECRET_KEY}` etc.), lidas de
  um `.env` na mesma pasta na VPS — nunca commitado. A única exceção com
  valor fixo direto no compose é `MONGO_INITDB_DATABASE: entregas` (nome
  da base, não é segredo).
- **`VITE_WHATSAPP_NUMBER` como build arg do serviço `frontend`**: é o elo
  que liga o `.env` da VPS ao `ARG` do `frontend/Dockerfile` explicado
  acima.
- **Sem `SPRING_PROFILES_ACTIVE`** no `backend`: o profile `dev` existe só
  pra afrouxar coisas que não podem valer em produção (segredo JWT padrão,
  cookie sem `Secure`). Sem ele, o backend cai no `application.properties`
  base, que recusa subir se algo obrigatório (como `JWT_SECRET`) faltar —
  isso é proposital, funciona como uma trava de segurança.

## Nomes de container usados nesta VPS

`mongodb` ficou com o nome padrão `entregas-mongodb-prod` (nunca foi pedido
pra mudar); `backend` e `frontend` foram renomeados pra
`motonote-backend-prod`/`motonote-frontend-prod` a pedido, e é esse par de
nomes que entra no Forward Hostname/IP dos Proxy Hosts do NPM.
