# Auditoria do Sistema — MotoNote

Documento gerado por leitura direta do código-fonte do repositório, em
2026-07-24. Descreve o estado atual do sistema: stack, arquitetura, rotas,
modelo de dados e configurações. Não contém avaliação de qualidade nem
sugestões — apenas o que existe.

---

## 1. Stack

### 1.1 Backend

- **Linguagem**: Java 21
- **Framework**: Spring Boot 4.1.0 (via `spring-boot-starter-parent`)
- **Build**: Maven (wrapper `mvnw`/`mvnw.cmd` incluído no repositório)
- **Banco de dados**: MongoDB (driver `spring-boot-starter-data-mongodb`)
- **Projeto**: `com.onioncode:entregas:0.0.1-SNAPSHOT`

**Dependências declaradas em `pom.xml`:**

| Dependência | Versão | Escopo |
|---|---|---|
| spring-boot-starter-data-mongodb | (herdada do parent) | compile |
| spring-boot-starter-webmvc | (herdada do parent) | compile |
| spring-boot-starter-thymeleaf | (herdada do parent) | compile |
| spring-boot-starter-security | (herdada do parent) | compile |
| spring-boot-starter-validation | (herdada do parent) | compile |
| spring-boot-devtools | (herdada do parent) | runtime, optional |
| lombok | (herdada do parent) | optional |
| springdoc-openapi-starter-webmvc-ui | 2.8.5 | compile |
| jjwt-api | 0.12.7 | compile |
| jjwt-impl | 0.12.7 | runtime |
| jjwt-jackson | 0.12.7 | runtime |
| stripe-java | 33.1.1 | compile |
| spring-boot-starter-data-mongodb-test | (herdada do parent) | test |
| spring-boot-starter-webmvc-test | (herdada do parent) | test |

Uso do Thymeleaf: exclusivamente para renderizar o corpo HTML de e-mails
transacionais (`EmailTemplateService`, via `TemplateEngine.process` direto),
não como view resolver — os controllers permanecem `@RestController`
retornando JSON.

### 1.2 Frontend

- **Framework**: React 19.2.7 + Vite 8.1.1
- **Gerenciador de pacotes**: npm (`package-lock.json` presente)
- **Localização**: `frontend/`

**`frontend/package.json`:**

| Campo | Valor |
|---|---|
| name | frontend |
| version | 0.0.0 |
| type | module |

**Scripts**: `dev` (vite), `build` (vite build), `lint` (oxlint), `preview` (vite preview)

**Dependencies:**
| Pacote | Versão |
|---|---|
| exceljs | ^4.4.0 |
| lucide-react | ^1.25.0 |
| react | ^19.2.7 |
| react-dom | ^19.2.7 |
| react-modal | ^3.16.3 |

**DevDependencies:**
| Pacote | Versão |
|---|---|
| @types/react | ^19.2.17 |
| @types/react-dom | ^19.2.3 |
| @vitejs/plugin-react | ^6.0.3 |
| oxlint | ^1.71.0 |
| vite | ^8.1.1 |

### 1.3 Integrações externas

- **Stripe** (`stripe-java`) — cobrança de assinatura (checkout, billing portal, webhooks).
- **Resend** — envio de e-mail transacional, via chamada HTTP direta (`RestClient`) à API REST do Resend, sem SDK dedicado.

### 1.4 Infraestrutura

- **Banco**: MongoDB 8 (imagem oficial `mongo:8`, via Docker Compose)
- **Containers de produção**: `mongodb`, `backend` (Spring Boot), `frontend` (build estático servido por Nginx)
- **Proxy reverso de produção**: Nginx Proxy Manager (externo ao `docker-compose.prod.yml`, referenciado via rede Docker `proxy`)

---

## 2. Arquitetura

### 2.1 Estrutura de pacotes (backend)

```
src/main/java/com/onioncode/entregas/
├── config/       (CorsConfig, MongoConfig, SecurityConfig, StripeConfig, SwaggerConfig)
├── controller/   (13 controllers REST)
├── domain/       (entidades/documentos Mongo e enums)
├── dto/          (objetos de entrada/saída dos endpoints)
├── exception/    (24 exceptions customizadas + GlobalExceptionHandler + ApiError)
├── repository/   (interfaces Spring Data MongoDB)
├── security/     (filtros, TokenService, RateLimiter, AuthorizationService)
├── service/      (regras de negócio)
└── util/         (PaginacaoUtils, CodigoUtils)
```

### 2.2 Estrutura de diretórios (frontend)

```
frontend/src/
├── App.jsx, main.jsx          (raiz — roteamento manual via state machine, sem react-router)
├── components/                 (33 arquivos .jsx/.js — telas e painéis)
├── services/                   (api.js — client HTTP; exportService.js — exportação Excel)
└── utils/                      (date.js, entregaPagamento.js, format.js, periodo.js, status.js)
```

### 2.3 Autenticação e sessão

- Autenticação stateless via **JWT** (biblioteca `jjwt`).
- Token assinado com HMAC-SHA a partir de `api.security.token.secret` (env var `JWT_SECRET`).
- **TTL do token**: 2 horas (`TokenService.TOKEN_TTL`).
- Token entregue ao cliente via **cookie httpOnly** chamado `auth_token`; também aceito via header `Authorization: Bearer <token>`.
- Cookie: `httpOnly=true`, `sameSite=Lax`, `secure` controlado pela propriedade `app.cookie-secure` (`false` só no profile `dev`).
- Dois tipos de principal autenticável pelo mesmo endpoint `/api/auth/login`: `Usuario` (dono da conta/admin/master) e `Motoboy` (portal restrito).
- Senہas armazenadas com `BCryptPasswordEncoder`.

### 2.4 Cadeia de filtros de segurança

Ordem efetiva de execução (`SecurityConfig.java`):

1. **`AuthRateLimitFilter`** — limita requisições por IP (janela fixa em memória, `RateLimiter`). Regra geral cobrindo toda `/api/**` (limite configurável em runtime) + regras específicas por rota sensível (login, signup, códigos de verificação, plano público).
2. **`SecurityFilter`** — extrai e valida o JWT (cookie ou header), popula o `SecurityContextHolder`, recarrega o usuário do Mongo a cada request (permite bloqueio quase imediato de contas desativadas), atualiza `ultimoAcessoEm` com throttle de 5 min.
3. **`MotoboyAccessGateFilter`** — se o principal autenticado for um `Motoboy`, restringe o acesso só a `/api/auth/**` e `/api/motoboy/me/**`; qualquer outra rota retorna 403.
4. **`AssinaturaGateFilter`** — bloqueia com 402 usuários (dono de conta ou motoboy) cuja assinatura não esteja ativa/em trial; MASTER sempre passa.

### 2.5 Autorização por papel (Role)

- `Role` (enum): `MASTER`, `ADMIN`, `USER`.
- A distinção MASTER-only **não** é feita no `SecurityConfig` (que só distingue rota pública vs. autenticada) — é aplicada dentro dos métodos de serviço via checagem explícita (`exigirMaster(authentication)`, que lança `AcessoNegadoException` → 403 se `role != MASTER`).
- `Motoboy` é uma entidade separada de `Usuario`, com seu próprio conjunto de rotas (`/api/motoboy/me/**`).

### 2.6 Tratamento de erros

- `GlobalExceptionHandler` (`@RestControllerAdvice`) centraliza todas as respostas de erro.
- Formato padrão de erro (`ApiError`): `timestamp`, `status`, `error`, `message`, `path`.
- Alguns handlers retornam `Map<String,String>` campo→mensagem em vez de `ApiError` (validação de formulário, ex.: e-mail duplicado, senhas não conferem).
- `spring.web.error.include-stacktrace=never` — stack trace nunca é incluído na resposta HTTP.
- Handler catch-all (`Exception.class`) loga a exceção completa no servidor e retorna 500 genérico ao cliente.

### 2.7 Testes automatizados

- Backend: 1 arquivo de teste (`src/test/java/com/onioncode/entregas/EntregasApplicationTests.java`).
- Frontend: nenhum arquivo de teste (`*.test.js`, `*.spec.js` ou pasta `__tests__`) encontrado.

---

## 3. Rotas HTTP

Legenda de acesso: **Público** = `permitAll` no `SecurityConfig` (sem necessidade de sessão); **Autenticado** = qualquer `Usuario`/`Motoboy` com sessão válida; **MASTER** = autenticado + checagem `exigirMaster()` no service; **Motoboy-only** = as únicas rotas de negócio que um `Motoboy` autenticado consegue alcançar (`MotoboyAccessGateFilter`).

### 3.1 `AuthenticationController` — `/api/auth` (todas Públicas)

| Método | Rota |
|---|---|
| POST | /api/auth/signup |
| POST | /api/auth/signup/iniciar |
| POST | /api/auth/signup/confirmar |
| POST | /api/auth/forgot-password |
| POST | /api/auth/reset-password |
| POST | /api/auth/login |
| POST | /api/auth/logout |

### 3.2 `StripeWebhookController` — `/api/webhooks` (Público, autenticidade via assinatura HMAC do Stripe)

| Método | Rota |
|---|---|
| POST | /api/webhooks/stripe |

### 3.3 `ConfiguracaoExibicaoController` — `/api/configuracoes` (Público)

| Método | Rota |
|---|---|
| GET | /api/configuracoes/exibicao |

### 3.4 `AssinaturaController` — `/api/assinaturas`

| Método | Rota | Acesso |
|---|---|---|
| GET | /api/assinaturas/plano | Público |
| GET | /api/assinaturas/me | Autenticado |
| POST | /api/assinaturas/checkout-session | Autenticado |
| POST | /api/assinaturas/portal-session | Autenticado |
| POST | /api/assinaturas/manual | MASTER |
| POST | /api/assinaturas/revogar | MASTER |
| GET | /api/assinaturas/findAll | MASTER |

### 3.5 `UsuarioController` — `/api/usuarios`

| Método | Rota | Acesso |
|---|---|---|
| POST | /api/usuarios/save | MASTER |
| GET | /api/usuarios/findAll | MASTER |
| GET | /api/usuarios/find | MASTER |
| PUT | /api/usuarios/update | MASTER |
| PATCH | /api/usuarios/status | MASTER |
| DELETE | /api/usuarios/delete | MASTER |
| GET | /api/usuarios/me | Autenticado |
| PUT | /api/usuarios/me/senha | Autenticado |
| PUT | /api/usuarios/me/nome | Autenticado |
| POST | /api/usuarios/me/telefone/solicitar-codigo | Autenticado |
| POST | /api/usuarios/me/telefone/confirmar | Autenticado |

### 3.6 `MotoboyController` — `api/motoboys` (sem barra inicial no `@RequestMapping`)

| Método | Rota | Acesso |
|---|---|---|
| POST | api/motoboys | Autenticado |
| GET | api/motoboys | Autenticado |
| GET | api/motoboys/pagina | Autenticado |
| GET | api/motoboys/findAll | MASTER |
| GET | api/motoboys/{id} | Autenticado |
| DELETE | api/motoboys | Autenticado |
| PUT | api/motoboys | Autenticado |

### 3.7 `MotoboyPortalController` — `/api/motoboy/me` (Motoboy-only; também alcançável por `Usuario`)

| Método | Rota |
|---|---|
| GET | /api/motoboy/me |
| GET | /api/motoboy/me/entregas |
| GET | /api/motoboy/me/relatorio |
| GET | /api/motoboy/me/relatorio/pagina |
| GET | /api/motoboy/me/resumo |
| PUT | /api/motoboy/me/senha |
| GET | /api/motoboy/me/gastos |
| POST | /api/motoboy/me/gastos |
| PUT | /api/motoboy/me/gastos/{id} |
| DELETE | /api/motoboy/me/gastos/{id} |
| GET | /api/motoboy/me/gastos/resumo |
| GET | /api/motoboy/me/vales |
| GET | /api/motoboy/me/vales/resumo |

### 3.8 `EntregaController` — `/api/entregas` (Autenticado)

| Método | Rota |
|---|---|
| POST | /api/entregas |
| PATCH | /api/entregas/{id}/valor |
| PATCH | /api/entregas/{id}/baixa |
| PATCH | /api/entregas/baixa-em-massa |
| DELETE | /api/entregas/{id} |
| GET | /api/entregas/{id} |
| GET | /api/entregas |
| GET | /api/entregas/data |
| GET | /api/entregas/motoboy/{motoboyId} |
| GET | /api/entregas/motoboy/{motoboyId}/data |
| GET | /api/entregas/relatorio |
| GET | /api/entregas/motoboy/{motoboyId}/relatorio |
| GET | /api/entregas/relatorio/pagina |
| GET | /api/entregas/resumo |
| GET | /api/entregas/pendentes |
| GET | /api/entregas/pendentes/resumo |

### 3.9 `GastoController` — `/api/gastos` (Autenticado)

| Método | Rota |
|---|---|
| GET | /api/gastos |
| GET | /api/gastos/resumo |

### 3.10 `ValeController` — `/api/vales` (Autenticado)

| Método | Rota |
|---|---|
| POST | /api/vales |
| PUT | /api/vales/{id} |
| PATCH | /api/vales/{id}/status |
| DELETE | /api/vales/{id} |
| GET | /api/vales |
| GET | /api/vales/resumo |

### 3.11 `AuditoriaController` — `/api/auditoria` (MASTER)

| Método | Rota |
|---|---|
| GET | /api/auditoria/findAll |

### 3.12 `MetricasController` — `/api/master` (MASTER)

| Método | Rota |
|---|---|
| GET | /api/master/metricas |
| GET | /api/master/metricas/cadastros-por-dia |
| GET | /api/master/metricas/entregas-por-dia |
| GET | /api/master/metricas/ranking-empresas |

### 3.13 `ConfiguracaoSistemaController` — `/api/master/configuracoes` (MASTER)

| Método | Rota |
|---|---|
| GET | /api/master/configuracoes |
| PUT | /api/master/configuracoes |
| PUT | /api/master/configuracoes/cadastro-publico |
| PUT | /api/master/configuracoes/rate-limit |
| PUT | /api/master/configuracoes/banner |
| PUT | /api/master/configuracoes/contato-suporte |
| PUT | /api/master/configuracoes/popup |

### 3.14 Rotas públicas de infraestrutura

| Rota | Descrição |
|---|---|
| `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html` | Documentação OpenAPI/Swagger — desabilitada por padrão (`springdoc.api-docs.enabled=${SPRINGDOC_ENABLED:false}`) |
| `/error` | Endpoint padrão de erro do Spring Boot |
| `OPTIONS /**` | Preflight CORS |

**Total: 13 controllers, 74 endpoints mapeados.**

---

## 4. Modelo de dados (MongoDB)

Banco único (`entregas`), 8 collections de negócio + 3 collections de código de verificação temporário (com TTL index, auto-expiração pelo Mongo).

### 4.1 `usuario` — classe `Usuario` (implementa `UserDetails`)

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| name | String | — |
| email | String | `@Indexed(unique=true)` |
| password | String | — |
| role | Role (MASTER/ADMIN/USER) | — |
| phone | String | — |
| createdAt | Instant | — |
| ativo | boolean (default `true`) | — |
| ultimoAcessoEm | Instant | — |

### 4.2 `motoboy` — classe `Motoboy` (implementa `UserDetails`)

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| name | String | — |
| usuarioId | String | `@Indexed` |
| email | String | `@Indexed(unique=true, sparse=true)` |
| password | String | — |

### 4.3 `assinatura` — classe `Assinatura`

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| usuarioId | String | `@Indexed(unique=true)` |
| stripeCustomerId | String | — |
| stripeSubscriptionId | String | — |
| status | StatusAssinatura | `@Indexed` |
| trialTerminaEm | Instant | — |
| periodoAtualTerminaEm | Instant | — |
| criadoEm | Instant | — |
| atualizadoEm | Instant | — |

`StatusAssinatura` (enum): `TRIALING`, `ATIVA`, `INADIMPLENTE`, `CANCELADA`, `INCOMPLETA`, `SEM_ASSINATURA`.

### 4.4 `entrega` — classe `Entrega`

Índice composto: `motoboyId_localDate_idx` em `{motoboyId: 1, localDate: -1}`.

| Campo | Tipo |
|---|---|
| id | String (`@Id`) |
| value | Double |
| localDate | LocalDate |
| motoboyId | String |
| formaPagamento | FormaPagamento (DINHEIRO/PIX/CREDITO/DEBITO) |
| status | StatusRecebimento (PENDENTE/RECEBIDO) |
| valorPedido | Double |

### 4.5 `gasto` — classe `Gasto`

Índice composto: `motoboyId_localDate_idx` em `{motoboyId: 1, localDate: -1}`.

| Campo | Tipo |
|---|---|
| id | String (`@Id`) |
| motoboyId | String |
| descricao | String |
| value | Double |
| localDate | LocalDate |

### 4.6 `vale` — classe `Vale`

Índice composto: `motoboyId_localDate_idx` em `{motoboyId: 1, localDate: -1}`.

| Campo | Tipo |
|---|---|
| id | String (`@Id`) |
| motoboyId | String |
| descricao | String |
| value | Double |
| status | StatusVale (PENDENTE/CONCLUIDO) |
| localDate | LocalDate |

### 4.7 `auditoria_log` — classe `AuditLog`

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| actorId | String | — |
| actorNome | String | — |
| actorEmail | String | — |
| acao | TipoAcaoAuditoria | — |
| alvoTipo | String | — |
| alvoId | String | — |
| alvoDescricao | String | — |
| detalhes | Map<String,Object> | — |
| criadoEm | Instant | `@Indexed` |

`TipoAcaoAuditoria` (enum): `USUARIO_CRIADO`, `USUARIO_EDITADO`, `USUARIO_BLOQUEADO`, `USUARIO_REATIVADO`, `USUARIO_EXCLUIDO`, `ASSINATURA_CONCEDIDA_MANUAL`, `ASSINATURA_REVOGADA`, `CONFIGURACAO_ALTERADA`.

### 4.8 `configuracao_sistema` — classe `ConfiguracaoSistema` (documento singleton, id fixo `"default"`)

| Campo | Tipo |
|---|---|
| id | String (`@Id`) |
| trialDaysOverride | Integer |
| cadastroPublicoHabilitado | Boolean (objeto, nullable) |
| rateLimitLoginMaxTentativas | Integer |
| rateLimitGeralMaxTentativas | Integer |
| bannerHabilitado | boolean |
| bannerMensagem | String |
| contatoSuporteWhatsapp | String |
| contatoSuporteEmail | String |
| popupHabilitado | boolean |
| popupTitulo | String |
| popupDescricao | String |
| popupBotaoTexto | String |
| popupBotaoUrl | String |
| popupVersao | int |
| atualizadoEm | Instant |
| atualizadoPor | String |

### 4.9 `cadastros_pendentes` — classe `CadastroPendente` (TTL)

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| email | String | `@Indexed(unique=true)` |
| name | String | — |
| phone | String | — |
| senhaHash | String | — |
| codigoHash | String | — |
| tentativas | int | — |
| criadoEm | Instant | — |
| expiraEm | Instant | `@Indexed(expireAfterSeconds=0)` |

### 4.10 `codigos_recuperacao_senha` — classe `CodigoRecuperacaoSenha` (TTL)

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| email | String | `@Indexed` |
| codigoHash | String | — |
| tentativas | int | — |
| usado | boolean | — |
| criadoEm | Instant | — |
| expiraEm | Instant | `@Indexed(expireAfterSeconds=0)` |

### 4.11 `alteracoes_telefone_pendentes` — classe `AlteracaoTelefonePendente` (TTL)

| Campo | Tipo | Índice |
|---|---|---|
| id | String | `@Id` |
| usuarioId | String | `@Indexed` |
| novoTelefone | String | — |
| codigoHash | String | — |
| tentativas | int | — |
| criadoEm | Instant | — |
| expiraEm | Instant | `@Indexed(expireAfterSeconds=0)` |

### 4.12 Repositórios com queries customizadas

Todos os repositórios estendem `MongoRepository`. Além dos métodos derivados por nome (`findByX`, `existsByX`, `countByX`), usam `@Query` com sintaxe Mongo nativa para filtros de período (`localDate` entre duas datas UTC) em `EntregaRepo`, `GastoRepo` e `ValeRepo`, e para busca textual por regex (nome/e-mail) em `UsuarioRepo`.

---

## 5. Configurações

### 5.1 `src/main/resources/application.properties`

```properties
spring.application.name=entregas
spring.mongodb.uri=${SPRING_MONGODB_URI}
api.security.token.secret=${JWT_SECRET}
spring.data.mongodb.auto-index-creation=true
springdoc.api-docs.resolve-schema-properties=true
cors.allowed-origins=http://localhost:3000,http://localhost:5173
spring.web.error.include-stacktrace=never
springdoc.api-docs.enabled=${SPRINGDOC_ENABLED:false}
springdoc.swagger-ui.enabled=${SPRINGDOC_ENABLED:false}
stripe.secret-key=${STRIPE_SECRET_KEY:}
stripe.webhook-secret=${STRIPE_WEBHOOK_SECRET:}
stripe.price-id=${STRIPE_PRICE_ID:}
stripe.trial-days=${STRIPE_TRIAL_DAYS:15}
app.frontend-url=${FRONTEND_URL:http://localhost:5173}
resend.api-key=${RESEND_API_KEY:}
resend.from-email=${RESEND_FROM_EMAIL:MotoNote <onboarding@resend.dev>}
resend.log-fallback=${RESEND_LOG_FALLBACK:false}
```

`api.security.token.secret` não tem valor padrão no profile default — o boot falha se `JWT_SECRET` não estiver definido (fora do profile `dev`).

### 5.2 `src/main/resources/application-dev.properties`

```properties
api.security.token.secret=${JWT_SECRET:minhachavesupersecretadedesenvolvimentosassentrega}
app.cookie-secure=false
resend.log-fallback=true
```

Ativado via `SPRING_PROFILES_ACTIVE=dev`. Únicos dois arquivos de properties existentes no projeto (não há `application-prod.properties` nem outros profiles).

### 5.3 Variáveis de ambiente (`.env.example`, raiz do backend)

| Variável | Obrigatória | Descrição |
|---|---|---|
| JWT_SECRET | Sim (fora do profile dev) | Chave de assinatura do JWT |
| STRIPE_SECRET_KEY | Não (default vazio) | Chave secreta da API Stripe |
| STRIPE_WEBHOOK_SECRET | Não (default vazio) | Segredo de verificação HMAC do webhook Stripe |
| STRIPE_PRICE_ID | Não (default vazio) | ID do Price recorrente no Stripe |
| STRIPE_TRIAL_DAYS | Não (default 15) | Dias de trial padrão |
| FRONTEND_URL | Não (default `http://localhost:5173`) | URL usada em redirects do Stripe Checkout/Portal |
| RESEND_API_KEY | Não (default vazio) | Chave de API do Resend |
| RESEND_FROM_EMAIL | Não (default `MotoNote <onboarding@resend.dev>`) | Remetente dos e-mails transacionais |

### 5.4 `frontend/.env.example`

```
VITE_API_URL=http://localhost:8080
VITE_APP_TITLE=Sistema de Gestão de Entregas
```

Variável de build adicional usada em produção (via `docker-compose.prod.yml` build arg): `VITE_WHATSAPP_NUMBER`.

### 5.5 CORS (`CorsConfig.java`)

- `CorsFilter` com `@Order(Ordered.HIGHEST_PRECEDENCE)`.
- `allowCredentials=true`.
- Origens permitidas: valor de `cors.allowed-origins` (lista separada por vírgula; default local `http://localhost:3000,http://localhost:5173`; em produção via `CORS_ALLOWED_ORIGINS`).
- Headers e métodos: todos (`*`) permitidos.

### 5.6 MongoDB (`MongoConfig.java`)

- Conversores customizados registrados para `LocalDate ↔ Date`, fixando a conversão em UTC (`ZoneOffset.UTC`) independentemente do fuso horário da JVM em que o backend roda.

### 5.7 Swagger/OpenAPI (`SwaggerConfig.java`)

- Um `SecurityScheme` do tipo HTTP Bearer (`bearerFormat=JWT`) registrado como requisito de segurança global do OpenAPI.
- Exposição da UI/spec controlada por `SPRINGDOC_ENABLED` (desligada por padrão).

### 5.8 Docker Compose

**`docker-compose.yml`** (desenvolvimento local — só o Mongo):
- Serviço único `mongodb` (imagem `mongo:8`), porta `27017` publicada no host, credenciais fixas `admin`/`admin`, volume nomeado `mongo_data`.

**`docker-compose.prod.yml`** (produção — projeto nomeado `entregas-prod`):
- `mongodb` (container `entregas-mongodb-prod`) — sem porta publicada no host, rede `internal`.
- `backend` (container `motonote-backend-prod`, build a partir do `Dockerfile` da raiz) — variáveis de ambiente injetadas via `${...}` do `.env` da VPS; sem `SPRING_PROFILES_ACTIVE` definido (roda no profile default); redes `internal` + `proxy`.
- `frontend` (container `motonote-frontend-prod`, build a partir de `frontend/Dockerfile`, recebendo `VITE_WHATSAPP_NUMBER` como build arg) — rede `proxy` apenas.
- Rede `proxy`: externa, compartilhada com o Nginx Proxy Manager (nome configurado manualmente no arquivo).
- Volume nomeado `mongo_data_prod`.

### 5.9 Dockerfiles

**`Dockerfile`** (backend, multi-stage):
1. Build: `maven:3.9-eclipse-temurin-21`, `mvn package -DskipTests`.
2. Runtime: `eclipse-temurin:21-jre`, usuário não-root (`app`), `EXPOSE 8080`, `ENTRYPOINT java -jar app.jar`.

**`frontend/Dockerfile`** (multi-stage):
1. Build: `node:22-alpine`, `npm ci` + `npm run build`; recebe `VITE_WHATSAPP_NUMBER` como `ARG`/`ENV`.
2. Runtime: `nginx:alpine`, serve `/app/dist`, config customizada via `nginx.conf`, `EXPOSE 80`.

### 5.10 Estrutura de topo do repositório

**Arquivos**: `DEPLOY.md`, `docker-compose.prod.yml`, `docker-compose.yml`, `Dockerfile`, `.dockerignore`, `entregas-backup.gz`, `.env`, `.env.example`, `.gitattributes`, `.gitignore`, `INFRAESTRUTURA.md`, `MANUAL_FRONTEND_API.md`, `mvnw`, `mvnw.cmd`, `pom.xml`, `RESEND_SETUP.md`, `skills-lock.json`, `STRIPE_SETUP.md`.

**Diretórios** (excluindo `node_modules`, `target`, `.git`): `.agents`, `.claude`, `config`, `frontend`, `.idea`, `.mvn`, `src`.
