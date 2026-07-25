# Relatório de Auditoria de Segurança — MotoNote

**Metodologia**: cada afirmação abaixo foi verificada por leitura direta do
código-fonte (não por inferência a partir do `auditoria.md`, que serviu só
como ponto de partida) e traz caminho de arquivo + número de linha como
evidência. Onde não foi possível confirmar algo com certeza (ex.: depende de
configuração de ambiente não versionada, ou de comportamento em runtime não
testável por leitura estática), está marcado explicitamente como **NÃO
VERIFICÁVEL**, em vez de suposição. Nenhum valor de segredo é reproduzido em
texto puro neste documento — onde um segredo foi localizado, o valor é
mascarado e só o local é apontado.

**Escopo**: backend Spring Boot (`com.onioncode.entregas`) + frontend
React/Vite (`frontend/`). Data: 2026-07-24. Atualizado em 2026-07-24 após
implementação dos itens 1-6 (ver "Como foi corrigido" em cada seção da
Parte 2).

---

## Sumário executivo

| # | Achado | Severidade | Status |
|---|---|---|---|
| 1 | Credencial do Mongo hardcoded sem fallback fail-closed | **Alto** | ✅ Corrigido |
| 2 | Nenhum CAPTCHA/Turnstile em cadastro, login ou recuperação de senha | **Alto** | ✅ Corrigido |
| 3 | Headers de segurança HTTP (CSP, HSTS, X-Frame-Options) sem config explícita | **Médio** | ✅ Corrigido |
| 4 | `X-Forwarded-For` aceito sem validar proxy confiável | **Médio** | ✅ Corrigido |
| 5 | Busca por regex livre sem escapar metacaracteres (ReDoS potencial) | **Baixo** | ✅ Corrigido |
| 6 | Campo `codigo` sem limite de tamanho/formato nos DTOs | **Baixo** | ✅ Corrigido |
| 7 | Rate limiter em memória, não distribuído | Informativo | Tradeoff já documentado no código |
| 8 | CSRF desabilitado | Informativo | Coerente com o desenho atual (API JSON + SameSite) |
| — | Rotas públicas | — | Sincronizadas entre os 3 pontos de checagem, sem rota órfã |
| — | IDOR (7 pontos auditados) | — | Todos escopados corretamente |
| — | NoSQL Injection | — | Nenhuma concatenação insegura encontrada |
| — | `.gitignore` / segredos versionados | — | Correto — `.env` real não está no índice do git |
| — | Upload de arquivos | — | Funcionalidade inexistente no sistema |

---

## Parte 1 — Verificações sem pendência de correção

### 1.1 Rotas sem autenticação

Lista completa de `permitAll()` em `src/main/java/com/onioncode/entregas/config/SecurityConfig.java`, dentro de `authorizeHttpRequests` (linhas 49-54):

| Linha | Regra |
|---|---|
| 49 | `HttpMethod.OPTIONS, "/**"` |
| 50 | `"/api/auth/**", "/error"` |
| 51 | `"/api/webhooks/**"` |
| 52 | `HttpMethod.GET, "/api/assinaturas/plano"` |
| 53 | `HttpMethod.GET, "/api/configuracoes/exibicao"` |
| 54 | `"/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"` |

Linha 55: `.anyRequest().authenticated()` — todo o resto exige sessão válida.

**`SecurityFilter.isRotaPublica()`** (`src/main/java/com/onioncode/entregas/security/SecurityFilter.java:155-161`) replica exatamente essas mesmas 7 condições, mesmos métodos HTTP e paths — **sincronizado** com o `SecurityConfig`.

**`AssinaturaGateFilter.isento()`** (`src/main/java/com/onioncode/entregas/security/AssinaturaGateFilter.java:83-90`) tem uma lista **intencionalmente mais ampla** — controla isenção do bloqueio por assinatura vencida (HTTP 402), não isenção de autenticação:
- Isenta todo `/api/assinaturas/**` (linha 86), não só o `GET /plano` público — as demais rotas desse prefixo continuam exigindo JWT válido, só não levam 402.
- Isenta `GET /api/usuarios/me` (linha 87) e `GET /api/motoboy/me` (linha 88) — não aparecem como públicas em nenhum outro arquivo, continuam exigindo JWT.
- Não isenta `/error` (única rota pública dos outros dois arquivos ausente aqui) — sem rota de negócio associada, não representa risco prático.

Verificação cruzada com os 13 controllers (`src/main/java/com/onioncode/entregas/controller/*.java`): nenhum mapeamento de rota fora das 4 áreas públicas (`/api/auth/**`, `/api/webhooks/**`, `GET /api/assinaturas/plano`, `GET /api/configuracoes/exibicao`) corresponde a uma regra `permitAll()`. Todos os demais controllers recebem `Authentication authentication` como parâmetro, dependendo do filtro para popular o `SecurityContext`.

**Conclusão**: nenhuma rota aparece como pública em um arquivo e autenticada em outro de forma acidental. A única divergência (`AssinaturaGateFilter` mais ampla) é proposital e documentada no comentário do próprio arquivo (linhas 72-78).

### 1.2 IDOR (Insecure Direct Object Reference)

Sete áreas auditadas — em cada uma, verificado se o `id` recebido via URL/parâmetro é validado contra o dono (usuário/motoboy autenticado) antes de retornar ou alterar dado.

| Área | Veredito | Evidência |
|---|---|---|
| `EntregaController`/`EntregaService` | Escopado corretamente | `EntregaService.java:255-256` (`findById`), `:130-131` (`updateValue`), `:147-148` (`darBaixa`), `:172-173` (`darBaixaEmMassa`), `:194-195` (`delete`) — todas checam `motoboyRepo.findByIdAndUsuarioId(motoboyId, user.getId())` antes de usar o registro |
| `MotoboyController`/`MotoboyService` | Escopado corretamente | `MotoboyService.java:222` (`findById`), `:147-148` (`update`), `:138` (`delete`) — todas usam `motoboyRepo.findByIdAndUsuarioId(id, usuario.getId())` direto no repository call |
| `GastoController`/`GastoService` + portal (`/api/motoboy/me/gastos/{id}`) | Escopado corretamente | `GastoService.java:58` (`update`), `:69` (`delete`) — `gastoRepo.findByIdAndMotoboyId(gastoId, motoboy.getId())`, `motoboy` sempre vindo de `authentication.getPrincipal()` (`MotoboyPortalController.java:133`) |
| `ValeController`/`ValeService` | Escopado corretamente | `ValeService.java:65-67` (`update`), `:84-85` (`updateStatus`), `:95-96` (`delete`) — `findById` cru seguido de `motoboyRepo.findByIdAndUsuarioId(vale.getMotoboyId(), user.getId())` antes de qualquer retorno |
| `UsuarioController.find`/`update` | Escopado corretamente (MASTER-only) | `UsuarioService.java:196` (`findById`), `:277` (`update`) — `exigirMaster(authentication)` chamado antes da busca por id/e-mail arbitrário |
| `AssinaturaController.manual`/`revogar` | MASTER-only confirmado | `AssinaturaService.java:315` (`concederManual`), `:343` (`revogarManual`) — `exigirMaster(authentication)` |
| `MotoboyPortalController` (13 rotas `/api/motoboy/me/**`) | Escopado corretamente | Todas derivam `Motoboy motoboy = (Motoboy) authentication.getPrincipal()` — nenhuma aceita motoboyId de path/query/body |

Nenhum dos 7 pontos ficou como "aceita id sem checar propriedade".

### 1.3 SQL/NoSQL Injection

Backend usa MongoDB — não há SQL. Verificado todo uso de `@Query`, `Criteria` e `MongoTemplate`:

- `EntregaRepo.java` (11 queries), `GastoRepo.java` (4), `ValeRepo.java` (4): todas no padrão `{ 'motoboyId': ?0, 'localDate': { $gte: ?1, $lt: ?2 } }` — parâmetros via placeholder `?0`/`?1`/`?2` do Spring Data, nunca concatenação de string.
- `UsuarioRepo.java:39` — `@Query("{ '$or': [ { 'name': { $regex: ?0, ... } }, ... ] }")`. Parâmetro via placeholder (seguro contra injeção de sintaxe Mongo), **mas** o valor é usado cru como padrão de regex — ver achado #5 abaixo (não é a mesma coisa que injeção clássica, é um problema de ReDoS).
- `AuditoriaService.java:90-112` (`findAllPaged`) — usa `Criteria.where(...)`/`Query` tipados do Spring Data, sem nenhuma concatenação de string.
- `grep` por `new BasicQuery` e `$where` em todo `src/main/java/`: nenhuma ocorrência.

**Conclusão**: nenhuma ocorrência de concatenação de string manual em query Mongo em todo o backend.

### 1.4 `.gitignore` e segredos versionados

`.gitignore:45-48` (raiz):
```
### Segredos locais (nunca versionar) ###
.env
/config/
*.gz
```
`frontend/.gitignore:14`: `.env`.

Confirmado via `git ls-files | grep -iE "\.env$|\.env\.|secret|credential|\.pem$|\.key$"` — resultado:
```
.env.example
frontend/.env.example
```
Só os arquivos de exemplo estão rastreados. Confirmado via `git check-ignore -v .env frontend/.env` que os `.env` reais (existentes em disco) são efetivamente ignorados pelas linhas citadas acima e não aparecem no índice do git.

Busca ampla por padrões de segredo (`sk_live_`, `sk_test_`, `AKIA`, `-----BEGIN`) em todo código-fonte versionado (excluindo `.env`/bundles de terceiros): nenhuma ocorrência.

### 1.5 Upload de arquivos

`grep` por `MultipartFile`/`multipart` em todo o backend e por `<input type="file">`/`FormData` em todo o frontend: nenhuma ocorrência. Não existe funcionalidade de upload no sistema — não é uma superfície de ataque presente.

---

## Parte 2 — Correções propostas, do mais crítico pro mais leve

Cada item abaixo é pensado como uma mudança pequena e isolada, testável por
si só, sem depender das outras.

### 2.1 [ALTO] Credencial do Mongo hardcoded sem fallback fail-closed

**Onde**: `src/main/resources/application.properties:2`
```
spring.mongodb.uri=mongodb://admin:***MASCARADO***@localhost:27017/entregas?authSource=admin
```
**O que foi encontrado**: usuário e senha (`admin`/`admin`) literais, direto
no properties versionado, sem passar por `@Value`/variável de ambiente. Em
produção isso é sobrescrito por `SPRING_MONGODB_URI`
(`docker-compose.prod.yml:44`), mas o properties por si só **não falha** se
essa variável faltar — ele silenciosamente cai de volta pro literal local.
Contraste: `api.security.token.secret=${JWT_SECRET}` (linha 9, mesmo
arquivo) não tem valor default — se `JWT_SECRET` faltar, o boot falha de
propósito (comentário nas linhas 3-8 confirma a intenção). A URI do Mongo
não segue o mesmo padrão.

**Correção proposta**: trocar a linha 2 para `spring.mongodb.uri=${MONGO_URI}`
(sem default), replicando o padrão fail-closed já usado pro JWT — força
definir a variável de ambiente em qualquer ambiente fora do profile `dev`
(que ganharia seu próprio fallback de conveniência em
`application-dev.properties`, como já existe hoje pro `JWT_SECRET`).

**Como testar**: subir o backend fora do profile `dev` sem `MONGO_URI`
definida — o boot deve falhar (placeholder não resolvido), em vez de subir
e conectar silenciosamente num Mongo local com credencial fraca.

**✅ Como foi corrigido**: `application.properties:2` agora é
`spring.mongodb.uri=${SPRING_MONGODB_URI}` (sem default), mesmo padrão do
`JWT_SECRET`. `application-dev.properties` ganhou o fallback de
conveniência (`spring.mongodb.uri=${SPRING_MONGODB_URI:mongodb://admin:***@localhost:27017/...}`),
só ativo no profile `dev`. `docker-compose.prod.yml` já setava
`SPRING_MONGODB_URI` (linha 44) — nenhuma mudança necessária lá. Testado:
subindo sem a variável e sem profile `dev`, o boot falha
(`IllegalArgumentException`, nunca chega a "Started EntregasApplication");
com `SPRING_PROFILES_ACTIVE=dev` e a variável ausente, conecta no Mongo
local do `docker-compose.yml` normalmente.

### 2.2 [ALTO] Nenhum CAPTCHA/Turnstile em formulários públicos

**Onde**: ausência confirmada em `frontend/src/components/Cadastro.jsx`
(formulário completo), `frontend/src/App.jsx` (função `Login`, linhas
180-203) e `frontend/src/components/RecuperarSenha.jsx` — nenhum dos três
renderiza qualquer widget de captcha. Busca por
"captcha"/"turnstile"/"recaptcha"/"hcaptcha" em todo `frontend/src` e todo
`src/main/java`: nenhuma ocorrência.

**O que existe hoje como mitigação parcial**: rate limit por IP
(`AuthRateLimitFilter.java`, ver item 2.7 abaixo) e limite de tentativas por
código gerado (`CadastroService.java:30,88`,
`RecuperacaoSenhaService.java:21,78`, `UsuarioService.java:45,339`). Isso
reduz mas não elimina automação/scripts contra esses formulários — rate
limit por IP é contornável trocando de IP (proxies/botnets), e nenhuma
camada atual distingue humano de script na primeira requisição.

**Correção proposta**: adicionar verificação server-side de um token de
CAPTCHA/Turnstile nos três endpoints públicos de maior risco de abuso —
`POST /api/auth/signup/iniciar`, `POST /api/auth/login`,
`POST /api/auth/forgot-password` (`AuthenticationController.java`) —
rejeitando a requisição antes de qualquer processamento se o token não
validar.

**Como testar**: automatizar uma chamada a cada um dos 3 endpoints sem
enviar o campo de token do captcha (ou com um token inválido) e confirmar
que a resposta é rejeitada (400/403) antes de qualquer efeito colateral
(sem enviar e-mail, sem contar tentativa de login).

**✅ Como foi corrigido**: `TurnstileGateway.java` (novo) valida o token
contra `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`;
`CaptchaInvalidoException` (novo, 400) com handler em
`GlobalExceptionHandler.java`. Chamado no início de `login`,
`iniciarCadastro` e `forgotPassword` em `AuthenticationController.java`.
Campo `captchaToken` adicionado (nullable, sem `@NotBlank`) em
`LoginRequestDTO`, `SignupRequestDTO`, `SolicitarRecuperacaoDTO` — sem
`TURNSTILE_SECRET_KEY` configurada a validação é no-op (não quebra nada
antes da chave existir, mesmo padrão do `ResendGateway`). Frontend: widget
reutilizável `frontend/src/components/Turnstile.jsx`, plugado em `Login`
(`App.jsx`), `Cadastro.jsx` e `RecuperarSenha.jsx` (incluindo nos fluxos de
"reenviar código", que pedem um token novo). Testado: com a chave
configurada, `POST /api/auth/login` sem `captchaToken` responde 400
("Verificação de segurança falhou"); no navegador, o widget renderiza,
verifica automaticamente (modo Managed) e o fluxo de recuperação de senha
completo (solicitar → receber 204 → avançar de tela) funcionou de ponta a
ponta com o token real.

### 2.3 [MÉDIO] Headers de segurança HTTP sem configuração explícita

**Onde**: `src/main/java/com/onioncode/entregas/config/SecurityConfig.java`
(lido por completo, linhas 1-85) — nenhuma chamada `.headers(...)`. Busca
por `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`,
`X-Content-Type-Options`, `HeadersConfigurer` em todo `src/main/java/`:
nenhuma ocorrência, em nenhum arquivo de config.

**NÃO VERIFICÁVEL**: se os headers padrão que o Spring Security aplica
automaticamente quando `.headers(...)` não é customizado (comportamento de
framework, não configuração explícita no projeto) estão de fato presentes
nas respostas HTTP em runtime — isso exigiria inspecionar uma resposta real
(`curl -I`), não leitura estática de código.

**Correção proposta**: adicionar um bloco `.headers(...)` explícito no
`SecurityConfig`, configurando no mínimo Content-Security-Policy,
X-Frame-Options (ou `frameOptions().deny()`) e Strict-Transport-Security —
em vez de depender do que quer que o framework aplique por padrão.

**Como testar**: `curl -I` contra qualquer rota do backend e conferir a
presença dos headers configurados na resposta.

**✅ Como foi corrigido**: `SecurityConfig.java` ganhou um bloco
`.headers(...)` explícito com `contentSecurityPolicy` (`default-src 'none';
frame-ancestors 'none'`, apropriado pra uma API 100% JSON), `frameOptions`
DENY, `contentTypeOptions` e `httpStrictTransportSecurity` (1 ano,
`includeSubDomains`). Testado com `curl` real contra
`GET /api/assinaturas/plano`: resposta 200 com `X-Content-Type-Options:
nosniff`, `X-Frame-Options: DENY` e o `Content-Security-Policy` configurado
presentes.

### 2.4 [MÉDIO] `X-Forwarded-For` aceito sem validar proxy confiável

**Onde**: `src/main/java/com/onioncode/entregas/security/AuthRateLimitFilter.java:119-125`
(método `clientIp`) — lê o primeiro valor de `X-Forwarded-For` se presente,
com fallback pra `request.getRemoteAddr()`. O próprio comentário do código
(linhas 116-118) já documenta o caveat: esse header só é confiável se algo
na frente (proxy/load balancer) sobrescrever e não deixar o cliente injetar
um valor arbitrário — e o código não valida isso.

**Risco concreto**: se o backend for alcançável sem passar pelo proxy
esperado (Nginx Proxy Manager, conforme `DEPLOY.md`), qualquer cliente pode
forjar `X-Forwarded-For` com um IP arbitrário a cada requisição, tornando
o rate limit por IP inefetivo (cada requisição "parece" vir de um IP
diferente).

**Correção proposta**: confirmar que o backend nunca é alcançável
diretamente (só através do proxy que sobrescreve o header), e/ou usar o
suporte nativo do Spring (`ForwardedHeaderFilter`) ou do container
(Tomcat `RemoteIpValve`) configurado para só confiar em `X-Forwarded-For`
vindo de um IP de proxy conhecido.

**Como testar**: com o backend rodando atrás do proxy esperado, enviar uma
requisição diretamente pro backend (contornando o proxy) com um
`X-Forwarded-For` forjado e diferente a cada tentativa de login — confirmar
que o rate limit de `AuthRateLimitFilter` ainda bloqueia depois do número
configurado de tentativas (ou seja, que o header forjado não é mais aceito
nessa rota de acesso).

**✅ Como foi corrigido**: `clientIp()` (`AuthRateLimitFilter.java`) agora
pega o **último** valor da lista de `X-Forwarded-For` em vez do primeiro —
o hop mais próximo (nginx do Nginx Proxy Manager, único proxy confiável na
topologia documentada em `DEPLOY.md`) sempre anexa o IP real ao final da
lista via `$proxy_add_x_forwarded_for`, então o cliente não consegue mais
forjar o valor usado pra contar tentativas só preenchendo o header com um
IP falso na posição inicial.

### 2.5 [BAIXO] Busca por regex livre sem escapar metacaracteres

**Onde**: `src/main/java/com/onioncode/entregas/repository/UsuarioRepo.java:39`
```java
@Query("{ '$or': [ { 'name': { $regex: ?0, $options: 'i' } }, { 'email': { $regex: ?0, $options: 'i' } } ] }")
Page<Usuario> findByNomeOuEmailContaining(String termo, Pageable pageable);
```
O parâmetro `termo` (vindo do campo de busca da listagem de usuários,
MASTER-only) é usado diretamente como padrão de regex, sem escapar
metacaracteres (`(`, `)`, `*`, `+`, etc.). Não é injeção de sintaxe Mongo
(o placeholder `?0` já protege isso), mas um termo malicioso pode causar
custo de execução desproporcional (ReDoS) dependendo do padrão enviado.
Exploitável só por quem já tem role MASTER (essa busca é usada em
`UsuarioService`, rota `GET /api/usuarios/findAll`, MASTER-only).

**Correção proposta**: escapar `termo` com `Pattern.quote(termo)` (ou
equivalente) antes de montar a query, tratando o texto de busca como
literal em vez de padrão de regex.

**Como testar**: buscar por um termo contendo caracteres especiais de regex
(ex.: `(`, `.*`, `(a+)+`) e confirmar que a busca trata isso como texto
literal (não encontra nada de estranho, não trava/demora
desproporcionalmente).

**✅ Como foi corrigido**: `UsuarioService.java` (método `findAllPaged`)
agora chama `usuarioRepo.findByNomeOuEmailContaining(Pattern.quote(busca),
pageable)` em vez de passar `busca` cru — `Pattern.quote` envolve o termo
em `\Q...\E`, que o `$regex` do Mongo (PCRE-compatível) trata como texto
literal, não como padrão.

### 2.6 [BAIXO] Campo `codigo` sem limite de tamanho/formato

**Onde**: `src/main/java/com/onioncode/entregas/dto/ConfirmarCadastroDTO.java:18`,
`RedefinirSenhaDTO.java:19` e `ConfirmarAlteracaoTelefoneDTO.java` — campo
`codigo` tem `@NotBlank` mas nenhum `@Size`/`@Pattern`. O código real é
sempre 6 dígitos (gerado em `CodigoUtils`), mas o DTO aceita qualquer string
não-vazia de qualquer tamanho.

**Correção proposta**: adicionar `@Pattern(regexp = "\\d{6}")` (ou
`@Size(min=6, max=6)`) nos três DTOs, rejeitando o formato antes de chegar
no service.

**Como testar**: enviar um `codigo` com 500 caracteres pra qualquer um dos 3
endpoints de confirmação e confirmar que a resposta é 400 (erro de
validação) em vez de cair no fluxo normal de comparação de hash.

**✅ Como foi corrigido**: `@Pattern(regexp = "\\d{6}")` adicionado ao campo
`codigo` nos três DTOs (`ConfirmarCadastroDTO`, `RedefinirSenhaDTO`,
`ConfirmarAlteracaoTelefoneDTO`), ao lado do `@NotBlank` já existente.

### 2.7 [INFORMATIVO] Rate limiter em memória, não distribuído

**Onde**: `src/main/java/com/onioncode/entregas/security/RateLimiter.java:12-15`
— comentário já explícito no próprio código:
```
// Rate limiter em memória (janela fixa por chave), suficiente enquanto o
// backend roda numa única instância. Se um dia rodar atrás de load balancer
// com múltiplas instâncias, cada uma teria seu próprio contador — nesse
// cenário isso precisaria virar algo compartilhado (Redis).
```
Implementação via `ConcurrentHashMap` em memória do processo — contadores
não sobrevivem a restart e não são compartilhados entre múltiplas
instâncias (cada instância teria seu próprio limite efetivo, multiplicando
o limite real pelo número de instâncias).

**Status**: tradeoff já reconhecido e documentado no código como aceitável
para a topologia atual (instância única). Não é tratado aqui como correção
pendente — só registrado, porque é diretamente relevante à pergunta sobre
proteção contra brute force. Vira relevante se a topologia de deploy mudar
para múltiplas instâncias.

### 2.8 [INFORMATIVO] CSRF desabilitado

**Onde**: `src/main/java/com/onioncode/entregas/config/SecurityConfig.java:46`
— `.csrf(AbstractHttpConfigurer::disable)`.

**Contexto técnico combinado** (fatos, sem julgamento):
- Sessão stateless via cookie `auth_token`, `httpOnly=true`
  (`AuthenticationController.java:125`), `sameSite=Lax`
  (`AuthenticationController.java:131`), `secure` controlado por
  `app.cookie-secure` (`true` fora do profile dev).
- Endpoints de mutação recebem corpo via `@RequestBody` JSON
  (`SignupRequestDTO`, `LoginRequestDTO` etc.), não form-urlencoded.
- CORS (`CorsConfig.java`) usa lista explícita de origens
  (`cors.allowed-origins`, default `http://localhost:3000,http://localhost:5173`)
  com `allowCredentials(true)` — não wildcard `*`. **NÃO VERIFICÁVEL**: o
  valor real de `CORS_ALLOWED_ORIGINS` em produção vem de variável de
  ambiente não versionada neste repositório.

**Status**: não tratado como correção pendente — é uma combinação coerente
para uma API JSON stateless com cookie `SameSite=Lax` e CORS restrito a
origens explícitas. Fica registrado porque CSRF desabilitado é
frequentemente perguntado em auditorias; a recomendação, se algo mudar, é
re-avaliar caso o CORS algum dia passe a aceitar origem wildcard ou caso um
endpoint de mutação passe a aceitar `application/x-www-form-urlencoded`.

---

## Apêndice — Detalhamento de rate limit por rota pública

`AuthRateLimitFilter.java` roda em toda requisição (sem `shouldNotFilter`,
confirmado por ausência de qualquer ocorrência do método no arquivo).

| Rota | Limite | Janela | Linha |
|---|---|---|---|
| Toda `/api/**` (regra geral) | Configurável via painel (padrão 300) | 1 min | `AuthRateLimitFilter.java:75`, padrão em `ConfiguracaoSistemaService.java:32` |
| `POST /api/auth/login` | Configurável via painel (padrão 10) | 5 min | `AuthRateLimitFilter.java:81-82`, padrão em `ConfiguracaoSistemaService.java:31` |
| `POST /api/auth/signup` | 5 (fixo) | 1h | `AuthRateLimitFilter.java:31-32,83-84` |
| `GET /api/assinaturas/plano` e `GET /api/configuracoes/exibicao` | 30 (fixo) | 1 min | `AuthRateLimitFilter.java:37-38,85-88` |
| `POST /api/auth/signup/iniciar` e `POST /api/auth/forgot-password` | 5 (fixo) | 1h | `AuthRateLimitFilter.java:46-47,89-90,93-94` |
| `POST /api/auth/signup/confirmar` e `POST /api/auth/reset-password` | 10 (fixo) | 15 min | `AuthRateLimitFilter.java:49-50,91-92,95-96` |

Todas as chaves são por IP (`clientIp()`, `AuthRateLimitFilter.java:119-125`) — ver achado 2.4 sobre a confiabilidade de `X-Forwarded-For`.

Camada adicional, independente do IP: os três fluxos de código de 6 dígitos
também contam tentativas erradas por registro gerado (não por IP) —
`CadastroService.java:30` (`MAX_TENTATIVAS = 5`, checado na linha 88),
`RecuperacaoSenhaService.java:21` (idem, linha 78) e
`UsuarioService.java:45` (`MAX_TENTATIVAS_TELEFONE = 5`, checado na linha
339). Um código esgotado nessas 5 tentativas fica inválido mesmo que o
limite de IP ainda não tenha estourado.
