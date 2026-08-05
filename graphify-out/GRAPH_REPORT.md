# Graph Report - .  (2026-08-05)

## Corpus Check
- 320 files · ~159,235 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2262 nodes · 6302 edges · 113 communities (102 shown, 11 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 439 edges (avg confidence: 0.8)
- Token cost: not tracked precisely (semantic extraction ran via 28 host subagents, no API key); subagents self-reported ~712K tokens combined input+output across the run

## Community Hubs (Navigation)
- Expense (Gasto) API Controller
- Display/System Config Controllers
- Cash Advance (Vale) API Controller
- Spring Security Configuration
- Courier (Motoboy) API Controller
- Global Exception Handling
- Client (Cliente) API Controller
- Payment Method Enums
- Auth API Controller
- Account Settings Panels (Frontend)
- Audit Log Controller
- Main App Shell & Routing
- Delivery & Client Modals (Frontend)
- Page Visit Tracking Controller
- Landing Page & Signup Components
- Settings Panels UI
- Frontend Dependencies Manifest
- Metrics API Controller
- Clients & Pending Values UI
- Roles & Access Control
- Delivery API Controller
- User API Controller
- Delivery Service Layer
- Subscription & Users UI
- User Controller & DTOs
- Subscription & Client Mappers
- Registration Exceptions
- Delivery Service Tests
- Subscription Gate Filter Tests
- DB Migration Runner
- Registration & Email Services
- Stripe Webhook Controller
- Subscription Entity
- Delivery Entity
- Subscription Trial Reminders
- Subscription Service Tests
- Subscription Business Logic
- Audit & Motoboys Views
- Subscription API Controller
- User Entity
- Pending Change Repositories
- Password Recovery Code Entity
- Expense Entity
- Distributed Rate Limiter
- Reports Screen (Screenshot)
- Cash Advances View (Frontend)
- Motoboy & User Repositories
- Migration Config & Mapper
- Pending Password Change Entity
- Global Settings View (Frontend)
- Overview Screen Mobile Screenshot
- Client Service & Pagination
- Frontend Design Skill Docs
- Settings Screen Screenshot
- Motoboys Screen Screenshot
- Cash Advance Marketing Screenshot
- Pending Phone Change Entity
- Pending Signup Entity
- Mongo Backup Import Tool
- Maven Wrapper Script
- Change Password DTO & Exception
- Stripe Gateway & Tests
- Deliveries Screen Screenshot
- Deliveries Landing-Page Concepts
- PWA Manifest
- Subscription Portal DTO/Exception
- Docker Compose Stack
- Linter Configuration
- Subscription Access Cache
- CORS Configuration
- Expenses Screen Screenshot
- Overview Screen Screenshot
- Charts Marketing Screenshot
- Testcontainers Config
- Cash Advance Mobile Screenshot
- Pending Values Screen Screenshot
- Legal Pages (Privacy/Terms)
- Spring Boot App Tests
- OpenAPI/Swagger Config
- Cash Advance Screen Screenshot
- Overview Marketing Screenshot
- Stripe Configuration
- Update Name DTO
- Bulk Settle Response DTO
- Checkout Session DTO
- Manual Grant DTO
- Confirm Password Change DTO
- Confirm Phone Change DTO
- Logistics Status Count DTO
- Plan Response DTO
- Revenue Summary DTO
- Manual Revoke DTO
- Phone Change Request DTO
- Update User DTO
- Task Scheduling Config
- Deliveries Mobile Screenshot
- Spring Boot Main Class
- User Request DTO
- Vite Entry HTML
- Apple Touch Icon Asset
- Hero Marketing Image
- Favicon Asset (Black)
- Favicon Asset
- PWA Icon 192px
- PWA Maskable Icon 192px
- App Icon (Black)
- React Logo Asset
- Vite Logo Asset
- Maven Project Config

## God Nodes (most connected - your core abstractions)
1. `request()` - 96 edges
2. `Usuario` - 77 edges
3. `PageResponseDTO` - 54 edges
4. `AssinaturaService` - 51 edges
5. `UsuarioService` - 48 edges
6. `Motoboy` - 45 edges
7. `EntregaResponseDTO` - 45 edges
8. `UsuarioRepo` - 45 edges
9. `EntregaService` - 43 edges
10. `UsuarioResponseDTO` - 42 edges

## Surprising Connections (you probably didn't know these)
- `postgres (prod service, entregas-postgres-prod)` --references--> `postgres (dev service, entregas-postgres)`  [EXTRACTED]
  docker-compose.prod.yml → docker-compose.yml
- `Login()` --calls--> `login()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/services/api.js
- `Dashboard()` --calls--> `getConfiguracaoExibicao()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/services/api.js
- `Dashboard()` --calls--> `montarWhatsappUrl()`  [EXTRACTED]
  frontend/src/App.jsx → frontend/src/utils/whatsapp.js
- `AlterarSenhaPanel()` --calls--> `useToast()`  [EXTRACTED]
  frontend/src/components/AlterarSenhaPanel.jsx → frontend/src/components/Toast.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MotoNote Production Docker Stack (postgres, backend, frontend)** — docker_compose_prod_postgres_service, docker_compose_prod_backend_service, docker_compose_prod_frontend_service [EXTRACTED 1.00]
- **Frontend Design Skill Core Principles (Hero, Typography, Structure, Motion)** — _agents_skills_frontend_design_skill_hero_as_thesis, _agents_skills_frontend_design_skill_typography_carries_personality, _agents_skills_frontend_design_skill_structure_is_information, _agents_skills_frontend_design_skill_leverage_motion_deliberately [EXTRACTED 1.00]

## Communities (113 total, 11 thin omitted)

### Community 0 - "Expense (Gasto) API Controller"
Cohesion: 0.05
Nodes (45): S3Client, S3Presigner, GastoController, Authentication, GetMapping, RequestMapping, ResponseEntity, RestController (+37 more)

### Community 1 - "Display/System Config Controllers"
Cohesion: 0.05
Nodes (53): ConfiguracaoExibicaoController, GetMapping, RequestMapping, RestController, ConfiguracaoSistemaController, Authentication, GetMapping, PreAuthorize (+45 more)

### Community 2 - "Cash Advance (Vale) API Controller"
Cohesion: 0.06
Nodes (47): Authentication, DeleteMapping, GetMapping, PatchMapping, PostMapping, PutMapping, RequestMapping, ResponseEntity (+39 more)

### Community 3 - "Spring Security Configuration"
Cohesion: 0.05
Nodes (43): AuthenticationConfiguration, EnableMethodSecurity, EnableWebSecurity, HttpSecurity, ObjectMapper, OncePerRequestFilter, PreDestroy, SecurityFilterChain (+35 more)

### Community 4 - "Courier (Motoboy) API Controller"
Cohesion: 0.06
Nodes (37): Authentication, DeleteMapping, GetMapping, PostMapping, PreAuthorize, PutMapping, RequestMapping, ResponseEntity (+29 more)

### Community 5 - "Global Exception Handling"
Cohesion: 0.09
Nodes (22): AccessDeniedException, AccountStatusException, BadCredentialsException, ExceptionHandler, HttpMessageNotReadableException, JsonInclude, MethodArgumentNotValidException, MethodArgumentTypeMismatchException (+14 more)

### Community 6 - "Client (Cliente) API Controller"
Cohesion: 0.07
Nodes (34): ClienteController, Authentication, DeleteMapping, GetMapping, PostMapping, PutMapping, RequestMapping, ResponseEntity (+26 more)

### Community 7 - "Payment Method Enums"
Cohesion: 0.05
Nodes (37): FormaPagamento, CREDITO, DEBITO, DINHEIRO, PIX, ModoValorPedidoObrigatorio, SOMENTE_DINHEIRO, TODAS_ENTREGAS (+29 more)

### Community 8 - "Auth API Controller"
Cohesion: 0.07
Nodes (37): AuthenticationController, AuthenticationManager, HttpServletResponse, PostMapping, RequestMapping, ResponseEntity, RestController, ConfirmarCadastroDTO (+29 more)

### Community 9 - "Account Settings Panels (Frontend)"
Cohesion: 0.10
Nodes (37): Dashboard(), AlterarSenhaComCodigoPanel(), AlterarTelefonePanel(), AssinaturasView(), ConcederCortesiaModal(), Button(), SIZE_CLASSES, VARIANT_CLASSES (+29 more)

### Community 10 - "Audit Log Controller"
Cohesion: 0.08
Nodes (32): AuditoriaController, Authentication, GetMapping, PreAuthorize, RequestMapping, ResponseEntity, RestController, AuditLog (+24 more)

### Community 11 - "Main App Shell & Routing"
Cohesion: 0.06
Nodes (37): ACCENT_COLORS, App(), AssinaturasView, AuditoriaView, Cadastro, ClientesView, ComoUsar, ConfiguracaoGlobalView (+29 more)

### Community 12 - "Delivery & Client Modals (Frontend)"
Cohesion: 0.13
Nodes (36): AddClienteModal(), AlterarStatusModal(), EntregasPendentesView(), ABAS_STATUS, CONTAGEM_CAMPO, EntregasView(), hojeISO(), intervaloDe() (+28 more)

### Community 13 - "Page Visit Tracking Controller"
Cohesion: 0.08
Nodes (28): EqualsAndHashCode, MappedSuperclass, Persistable, PostLoad, PostPersist, PostMapping, RequestMapping, ResponseEntity (+20 more)

### Community 14 - "Landing Page & Signup Components"
Cohesion: 0.12
Nodes (28): Cadastro(), passos, telas, FAQ, LandingLP1(), PILARES, ABAS, COMPARACAO (+20 more)

### Community 15 - "Settings Panels UI"
Cohesion: 0.11
Nodes (32): AlterarSenhaPanel(), ACCENT_OPTIONS, AparenciaPanel(), ConfiguracoesView(), EntregasConfigPanel(), valoresIniciaisDe(), FotoPerfilPanel(), EditGastoModal() (+24 more)

### Community 16 - "Frontend Dependencies Manifest"
Cohesion: 0.05
Nodes (39): exceljs, dependencies, exceljs, lucide-react, react, react-dom, react-easy-crop, react-modal (+31 more)

### Community 17 - "Metrics API Controller"
Cohesion: 0.11
Nodes (18): Authentication, GetMapping, PreAuthorize, RequestMapping, RestController, MetricasController, AllArgsConstructor, Data (+10 more)

### Community 18 - "Clients & Pending Values UI"
Cohesion: 0.10
Nodes (32): ClientesView(), EditClienteModal(), OPCOES_ORDENACAO, PERIODOS_CLIENTES, PeriodoFilter(), PERIODOS_PENDENTES, ValoresPendentesView(), construirPontos() (+24 more)

### Community 19 - "Roles & Access Control"
Cohesion: 0.12
Nodes (14): Sort, Role, ADMIN, MASTER, USER, AcessoNegadoException, ArquivoInvalidoException, Service (+6 more)

### Community 20 - "Delivery API Controller"
Cohesion: 0.17
Nodes (14): AtualizarStatusLogisticoDTO, AtualizarStatusLogisticoEmMassaDTO, BaixaEmMassaRequestDTO, EntregaController, Authentication, DeleteMapping, GetMapping, PatchMapping (+6 more)

### Community 21 - "User API Controller"
Cohesion: 0.17
Nodes (14): HabilitadoDTO, Authentication, DeleteMapping, GetMapping, MultipartFile, PatchMapping, PostMapping, PreAuthorize (+6 more)

### Community 22 - "Delivery Service Layer"
Cohesion: 0.18
Nodes (3): EntregaService, Authentication, Authentication

### Community 23 - "Subscription & Users UI"
Cohesion: 0.10
Nodes (30): AssinaturaView(), diasRestantes(), formatarData(), Skeleton(), AddUsuarioModal(), EditUsuarioModal(), ROLE_LABELS, roleBadgeClass() (+22 more)

### Community 24 - "User Controller & DTOs"
Cohesion: 0.15
Nodes (8): AllArgsConstructor, Data, UsuarioResponseDTO, UsuarioNotFoundException, Authentication, Page, Pageable, UsuarioService

### Community 25 - "Subscription & Client Mappers"
Cohesion: 0.10
Nodes (14): AssinaturaMapper, Document, Logger, ClienteMapper, Document, ConfiguracaoSistemaMapper, Document, Document (+6 more)

### Community 26 - "Registration Exceptions"
Cohesion: 0.11
Nodes (6): SecureRandom, CadastroDesabilitadoException, CodigoInvalidoException, EmailJaCadastradoException, SenhasNaoConferemException, CodigoUtils

### Community 27 - "Delivery Service Tests"
Cohesion: 0.32
Nodes (3): EntregaSalvaCaptor, EntregaServiceTest, Test

### Community 28 - "Subscription Gate Filter Tests"
Cohesion: 0.28
Nodes (7): AfterEach, MockFilterChain, MockHttpServletResponse, AssinaturaGateFilterTest, ExtendWith, Test, Resultado

### Community 29 - "DB Migration Runner"
Cohesion: 0.17
Nodes (16): CommandLineRunner, ConfigurableApplicationContext, JpaRepository, JpaSpecificationExecutor, Component, Document, Logger, MongoDatabase (+8 more)

### Community 30 - "Registration & Email Services"
Cohesion: 0.14
Nodes (14): Compiler, CadastroService, PasswordEncoder, Service, EmailTemplateService, Service, Logger, Service (+6 more)

### Community 31 - "Stripe Webhook Controller"
Cohesion: 0.14
Nodes (14): Customer, Price, HttpServletRequest, PostMapping, RequestMapping, ResponseEntity, RestController, StripeWebhookController (+6 more)

### Community 32 - "Subscription Entity"
Cohesion: 0.14
Nodes (16): Assinatura, Entity, Getter, NoArgsConstructor, Setter, Table, StatusAssinatura, ATIVA (+8 more)

### Community 33 - "Delivery Entity"
Cohesion: 0.21
Nodes (11): Entrega, Entity, Getter, NoArgsConstructor, Setter, Table, EntregaRepo, Page (+3 more)

### Community 34 - "Subscription Trial Reminders"
Cohesion: 0.21
Nodes (9): AssinaturaRepo, Repository, Logger, Scheduled, Service, TrialLembreteService, ExtendWith, Test (+1 more)

### Community 35 - "Subscription Service Tests"
Cohesion: 0.27
Nodes (5): AssinaturaServiceTest, ExtendWith, Invoice, Subscription, Test

### Community 36 - "Subscription Business Logic"
Cohesion: 0.19
Nodes (7): AssinaturaService, Authentication, Event, Invoice, Service, Session, Subscription

### Community 37 - "Audit & Motoboys Views"
Cohesion: 0.21
Nodes (17): ACAO_LABELS, AuditoriaView(), formatarDetalhes(), MotoboysMasterView(), SkeletonRow(), getAuditoriaPaged(), getMotoboysMasterPaged(), baixarWorkbook() (+9 more)

### Community 38 - "Subscription API Controller"
Cohesion: 0.17
Nodes (11): AssinaturaController, Authentication, GetMapping, PostMapping, PreAuthorize, RequestMapping, RestController, AssinaturaResponseDTO (+3 more)

### Community 39 - "User Entity"
Cohesion: 0.17
Nodes (11): Entity, Getter, GrantedAuthority, NoArgsConstructor, Override, Setter, Table, Usuario (+3 more)

### Community 40 - "Pending Change Repositories"
Cohesion: 0.14
Nodes (9): AlteracaoTelefonePendenteRepo, Repository, CadastroPendenteRepo, Repository, Logger, Scheduled, Service, LimpezaExpiradosJob (+1 more)

### Community 41 - "Password Recovery Code Entity"
Cohesion: 0.18
Nodes (13): CodigoRecuperacaoSenha, Entity, Getter, NoArgsConstructor, Setter, Table, CodigoRecuperacaoSenhaMapper, Document (+5 more)

### Community 42 - "Expense Entity"
Cohesion: 0.20
Nodes (12): Gasto, Entity, Getter, NoArgsConstructor, Setter, Table, GastoMapper, Document (+4 more)

### Community 43 - "Distributed Rate Limiter"
Cohesion: 0.19
Nodes (11): Autowired, Component, ConditionalOnProperty, Override, StringRedisTemplate, RedisRateLimiter, ExtendWith, StringRedisTemplate (+3 more)

### Community 44 - "Reports Screen (Screenshot)"
Cohesion: 0.16
Nodes (19): Dark mode toggle control (top right), Date range filter (Data Início / Data Fim), Relatórios de Entregas (Delivery Reports) feature, 'Exportar para Excel' export action, 'Gerar Relatório' primary action button, Motoboy filter dropdown (opcional, 'Todos os motoboys'), MotoNote Application (delivery/motoboy management SaaS), Nav item: Configurações (Settings) (+11 more)

### Community 45 - "Cash Advances View (Frontend)"
Cohesion: 0.19
Nodes (15): AddValeModal(), EditValeModal(), hojeISO(), ParcelasFields(), parcelaVazia(), STATUS_VALE_CLASSES, STATUS_VALE_LABELS, ValesView() (+7 more)

### Community 46 - "Motoboy & User Repositories"
Cohesion: 0.20
Nodes (10): Page, Pageable, Repository, MotoboyRepo, UsuarioRepo, AuthorizationService, Override, Service (+2 more)

### Community 47 - "Migration Config & Mapper"
Cohesion: 0.17
Nodes (7): ConfigurationProperties, Document, MotoboyMapper, Component, Profile, MigrationProperties, Override

### Community 48 - "Pending Password Change Entity"
Cohesion: 0.21
Nodes (10): AlteracaoSenhaPendente, Entity, Getter, NoArgsConstructor, Setter, Table, AlteracaoSenhaPendenteMapper, Document (+2 more)

### Community 49 - "Global Settings View (Frontend)"
Cohesion: 0.20
Nodes (14): BannerPanel(), CadastroPublicoPanel(), ConfiguracaoGlobalView(), ContatoSuportePanel(), PopupPanel(), RateLimitPanel(), TrialPanel(), atualizarBanner() (+6 more)

### Community 50 - "Overview Screen Mobile Screenshot"
Cohesion: 0.18
Nodes (14): Dark Mode Toggle Icon, Entregas no Período (Deliveries in Period) Metric Card, Faturamento no Período (Revenue in Period) Metric Card, Hamburger Menu / Sidebar Toggle, Landing Page Marketing Assets (frontend/public/lp), Líquido (Vales + Gastos) Metric Card, Líquido (Vales) Metric Card, Scheduled Maintenance Notice Banner (+6 more)

### Community 51 - "Client Service & Pagination"
Cohesion: 0.21
Nodes (7): AllArgsConstructor, Data, NoArgsConstructor, Page, PageResponseDTO, Pageable, Pageable

### Community 52 - "Frontend Design Skill Docs"
Cohesion: 0.20
Nodes (12): Apache License 2.0, Design Plan Token System (Color / Type / Layout / Signature), Two-Pass Design Process (Brainstorm, Explore, Plan, Critique, Build, Critique Again), Frontend Design (Skill), Ground It in the Subject, Hero Is a Thesis, Leverage Motion Deliberately, Restraint and Self-Critique (+4 more)

### Community 53 - "Settings Screen Screenshot"
Cohesion: 0.18
Nodes (12): Dados da conta card (Nome, E-mail, Perfil de acesso fields), Account footer widget (Empresa Teste QA, Sair da conta / logout), Configurações da conta (Account Settings) section, Alterar senha card (change password form), Dark mode toggle button (moon icon, top right), Precisa de ajuda? / Fale com nosso suporte link, MotoNote brand/logo, Multi-tenant SaaS company account model (delivery/logistics business accounts) (+4 more)

### Community 54 - "Motoboys Screen Screenshot"
Cohesion: 0.23
Nodes (12): Account panel ("Empresa Teste QA" / "Sair da conta"), "Adicionar Motoboy" (Add Courier) action button, Breadcrumb navigation (Dashboard / Motoboys), Motoboys (Couriers) management screen, Couriers table (Nome, E-mail, Ações columns) listing registered motoboys, Dark mode toggle control (top right), Editar / Excluir row actions for each courier, "Precisa de ajuda? Fale com nosso suporte" support help widget (+4 more)

### Community 55 - "Cash Advance Marketing Screenshot"
Cohesion: 0.24
Nodes (11): Adicionar Vale Button (orange CTA), Dark Mode Toggle Icon, Dashboard Breadcrumb Navigation (Dashboard / Vale), Filter Dropdowns (Todos os motoboys / Esse mês), Installment Plan Pattern (Parcela X/4 for fuel advances), Motoboy Entity (e.g. Carlos Mendes), Row Actions (Concluir/Reabrir, Editar, Excluir), Status Badges (PENDENTE / CONCLUÍDO) (+3 more)

### Community 56 - "Pending Phone Change Entity"
Cohesion: 0.31
Nodes (8): AlteracaoTelefonePendente, Entity, Getter, NoArgsConstructor, Setter, Table, AlteracaoTelefonePendenteMapper, Document

### Community 57 - "Pending Signup Entity"
Cohesion: 0.31
Nodes (8): CadastroPendente, Entity, Getter, NoArgsConstructor, Setter, Table, CadastroPendenteMapper, Document

### Community 58 - "Mongo Backup Import Tool"
Cohesion: 0.33
Nodes (6): MongoClient, MongoDBContainer, Logger, MongoDatabase, Override, MongoBackupImporter

### Community 59 - "Maven Wrapper Script"
Cohesion: 0.33
Nodes (6): mvnw script, clean(), die(), exec_maven(), set_java_home(), verbose()

### Community 60 - "Change Password DTO & Exception"
Cohesion: 0.29
Nodes (5): AlterarSenhaDTO, AllArgsConstructor, Data, NoArgsConstructor, SenhaAtualIncorretaException

### Community 62 - "Deliveries Screen Screenshot"
Cohesion: 0.33
Nodes (9): 'Adicionar Nova Entrega' form (motoboy, valor, forma de pagamento, valor do pedido), Entregas (Deliveries) screen in MotoNote dashboard, Delivery filters ('Todos os motoboys' and date range 'Hoje' dropdowns), Forma de Pagamento (payment method: Dinheiro, Pix, Crédito), entregas.jpg (Deliveries screen screenshot), Motoboy entity (delivery driver assigned to a delivery), 'Entregas Recentes' table (Motoboy, Data, Valor, Forma de Pagamento, Valor do Pedido, Status, Ações), MotoNote dashboard sidebar navigation (Visão geral, Entregas, Motoboys, Valores Pendentes, Gastos, Vale, Relatórios, Configurações) (+1 more)

### Community 63 - "Deliveries Landing-Page Concepts"
Cohesion: 0.33
Nodes (9): Dashboard Module (parent navigation), Entregas (Deliveries) Landing Page Screenshot, Entregas (Deliveries) Dashboard Page, Entregas Recentes (Recent Deliveries) Table, Filter Controls (Todos os motoboys / Esse mês), Forma de Pagamento (Payment Method: Crédito, Pix, Dinheiro), Motoboy (Delivery Driver) Entity, Adicionar Nova Entrega (Add New Delivery) Form (+1 more)

### Community 64 - "PWA Manifest"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 65 - "Subscription Portal DTO/Exception"
Cohesion: 0.31
Nodes (5): AllArgsConstructor, Data, NoArgsConstructor, PortalSessionResponseDTO, AssinaturaNaoEncontradaException

### Community 66 - "Docker Compose Stack"
Cohesion: 0.29
Nodes (8): postgres_data (dev volume), postgres (dev service, entregas-postgres), backend (prod service, motonote-backend-prod), frontend (prod service, motonote-frontend-prod), internal (Docker network, Postgres <-> backend only), postgres_data_prod (prod volume), postgres (prod service, entregas-postgres-prod), proxy (external Docker network, shared with Nginx Proxy Manager)

### Community 67 - "Linter Configuration"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 68 - "Subscription Access Cache"
Cohesion: 0.32
Nodes (3): AssinaturaAcessoCache, Entrada, Component

### Community 69 - "CORS Configuration"
Cohesion: 0.48
Nodes (5): CorsFilter, Order, CorsConfig, Bean, Configuration

### Community 70 - "Expenses Screen Screenshot"
Cohesion: 0.33
Nodes (7): Dark mode toggle button (top right of Gastos screen), Example expense record: Carlos Motoboy Teste, Gasolina, 23/07/2026, R$ 50,00, Motoboy and period filter controls ("Todos os motoboys", "Essa semana"), Motoboy (delivery driver) entity that expenses are attributed to, Gastos (Expenses) Screen UI, MotoNote sidebar navigation menu (Visão geral, Entregas, Motoboys, Valores Pendentes, Gastos, Vale, Relatórios, Configurações), Gastos dos Motoboys table (Motoboy, Descrição, Data, Valor columns)

### Community 71 - "Overview Screen Screenshot"
Cohesion: 0.52
Nodes (7): 'Distribuição por motoboy' (Revenue share by courier) chart widget, 'Entregas por dia' (Deliveries per day) chart widget, Overview filter controls ('Todos os motoboys' and 'Hoje' dropdown selectors), MotoNote brand header (logo + product name in sidebar), Visão Geral (Overview) Dashboard Screenshot, Sidebar navigation (Visão geral, Entregas, Motoboys, Valores Pendentes, Gastos, Vale, Relatórios, Configurações), Overview KPI stat cards (entregas no período, faturamento no período, faturamento líquido, motoboys ativos, ticket médio, valores pendentes, gastos, vales)

### Community 72 - "Charts Marketing Screenshot"
Cohesion: 0.48
Nodes (7): Carlos Mendes (motoboy, top faturamento: R$ 1055,00 / 29 entregas), Landing Page Screenshot: Dashboard de Gráficos (Entregas/Faturamento), Chart: Distribuição por motoboy (participação no faturamento, pizza, total R$ 1110,00), Chart: Entregas por dia (Quantidade de Entregas, mês corrente), Chart: Faturamento (R$ por dia, mesmo período de entregas), List: Motoboys em destaque (ranking por faturamento no período), Rafael Souza (motoboy, faturamento: R$ 55,00)

### Community 73 - "Testcontainers Config"
Cohesion: 0.48
Nodes (5): PostgreSQLContainer, ServiceConnection, Bean, TestcontainersConfiguration, TestConfiguration

### Community 74 - "Cash Advance Mobile Screenshot"
Cohesion: 0.47
Nodes (6): Landing Page Marketing Screenshots (mobile views), Motoboy (motorcycle courier) Management Domain, Scheduled Maintenance Notification Banner UI Pattern, Vale Feature (motoboy cash advances / deductions management), Vale Status Workflow (Pendente -> Concluir/Editar/Excluir), Vale (Cash Advance) Management Screen - Mobile Landing Page Screenshot

### Community 75 - "Pending Values Screen Screenshot"
Cohesion: 0.47
Nodes (6): Dar Baixa (settle/confirm payment) action, Entregas (Deliveries) navigation item, Motoboy (Delivery Driver) entity, MotoNote Application (branding/logo), Repasse de Valores / Cash Settlement Process, Valores Pendentes Screen (UI Screenshot)

### Community 77 - "Spring Boot App Tests"
Cohesion: 0.53
Nodes (4): Import, SpringBootTest, EntregasApplicationTests, Test

### Community 78 - "OpenAPI/Swagger Config"
Cohesion: 0.53
Nodes (4): OpenAPI, Bean, Configuration, SwaggerConfig

### Community 79 - "Cash Advance Screen Screenshot"
Cohesion: 0.60
Nodes (5): "Adicionar Vale" action button and filters (Todos os motoboys / Esse mes), MotoNote dashboard sidebar navigation (Visao geral, Entregas, Motoboys, Valores Pendentes, Gastos, Vale, Relatorios, Configuracoes), Vale management feature: track motoboy advances (adiantamentos) and deductions (descontos), Vale (Advances/Deductions) Screen - MotoNote Dashboard, Sample vale record: Carlos Motoboy Teste - Adiantamento - R$30,00 - PENDENTE (23/07/2026)

### Community 80 - "Overview Marketing Screenshot"
Cohesion: 0.70
Nodes (5): Visão Geral Dashboard Feature (operation overview page), Motoboy Entity (active delivery riders tracked in overview), Operation KPI Cards (entregas, faturamento, líquido, ticket médio, motoboys ativos, valores pendentes, gastos, vales), Landing Page Screenshot: Visão Geral (Overview Dashboard), Period/Motoboy Filter UI Pattern (dropdown filters: 'Todos os motoboys', 'Esse mês')

### Community 81 - "Stripe Configuration"
Cohesion: 0.60
Nodes (3): Configuration, PostConstruct, StripeConfig

### Community 82 - "Update Name DTO"
Cohesion: 0.70
Nodes (4): AtualizarNomeDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 83 - "Bulk Settle Response DTO"
Cohesion: 0.70
Nodes (4): BaixaEmMassaResponseDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 84 - "Checkout Session DTO"
Cohesion: 0.70
Nodes (4): CheckoutSessionResponseDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 85 - "Manual Grant DTO"
Cohesion: 0.70
Nodes (4): ConcederManualDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 86 - "Confirm Password Change DTO"
Cohesion: 0.70
Nodes (4): ConfirmarAlteracaoSenhaDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 87 - "Confirm Phone Change DTO"
Cohesion: 0.70
Nodes (4): ConfirmarAlteracaoTelefoneDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 88 - "Logistics Status Count DTO"
Cohesion: 0.70
Nodes (4): ContagemStatusLogisticoDTO, AllArgsConstructor, Data, NoArgsConstructor

### Community 89 - "Plan Response DTO"
Cohesion: 0.70
Nodes (4): AllArgsConstructor, Data, NoArgsConstructor, PlanoResponseDTO

### Community 90 - "Revenue Summary DTO"
Cohesion: 0.70
Nodes (4): AllArgsConstructor, Data, NoArgsConstructor, ResumoFaturamentoDTO

### Community 91 - "Manual Revoke DTO"
Cohesion: 0.70
Nodes (4): AllArgsConstructor, Data, NoArgsConstructor, RevogarManualDTO

### Community 92 - "Phone Change Request DTO"
Cohesion: 0.70
Nodes (4): AllArgsConstructor, Data, NoArgsConstructor, SolicitarAlteracaoTelefoneDTO

### Community 93 - "Update User DTO"
Cohesion: 0.70
Nodes (4): AllArgsConstructor, Data, NoArgsConstructor, UpdateUsuarioDTO

### Community 94 - "Task Scheduling Config"
Cohesion: 0.83
Nodes (3): EnableScheduling, Configuration, SchedulingConfig

### Community 95 - "Deliveries Mobile Screenshot"
Cohesion: 0.83
Nodes (4): Deliveries Mobile Shot (LP marketing screenshot), Mobile delivery/payment card list layout (client name header, Data/Valor/Forma de Pagamento/Valor do Pedido/Status rows, green-accented left border, Excluir action), Delivery/order record fields: Cliente, Data, Valor, Forma de Pagamento (Crédito/Pix), Valor do Pedido, Status, RECEBIDO status badge (green pill indicating payment received)

### Community 97 - "User Request DTO"
Cohesion: 0.83
Nodes (3): AllArgsConstructor, Data, UsuarioRequestDTO

### Community 98 - "Vite Entry HTML"
Cohesion: 1.00
Nodes (3): index.html (Vite entry HTML, MotoNote), #root mount div (React app mount point), main.jsx (React/Vite bootstrap entry, referenced by index.html)

### Community 99 - "Apple Touch Icon Asset"
Cohesion: 0.67
Nodes (3): Apple Touch Icon (Motonote Logo), Apple Touch Icon Web Convention (iOS Home Screen), Motonote Brand Mark (Orange with M)

### Community 100 - "Hero Marketing Image"
Cohesion: 0.67
Nodes (3): Purple gradient brand color treatment, Hero Image (isometric floating card icon), Landing page / marketing site

## Ambiguous Edges - Review These
- `Motoboys screen screenshot (motoboys.jpg)` → `Sample/QA test courier record (Carlos Motoboy Teste, carlos-motoboy-qa@example.com)`  [AMBIGUOUS]
  frontend/public/docs/motoboys.jpg · relation: references
- `Landing Page Screenshot: Visão Geral (Overview Dashboard)` → `Motoboy Entity (active delivery riders tracked in overview)`  [AMBIGUOUS]
  frontend/public/lp/shot-visao-geral.png · relation: references

## Knowledge Gaps
- **181 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Motoboys screen screenshot (motoboys.jpg)` and `Sample/QA test courier record (Carlos Motoboy Teste, carlos-motoboy-qa@example.com)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Landing Page Screenshot: Visão Geral (Overview Dashboard)` and `Motoboy Entity (active delivery riders tracked in overview)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `Usuario` connect `User Entity` to `Expense (Gasto) API Controller`, `Display/System Config Controllers`, `Cash Advance (Vale) API Controller`, `Spring Security Configuration`, `Client (Cliente) API Controller`, `Payment Method Enums`, `Auth API Controller`, `Page Visit Tracking Controller`, `Metrics API Controller`, `Roles & Access Control`, `User API Controller`, `Delivery Service Layer`, `User Controller & DTOs`, `Subscription & Client Mappers`, `Registration Exceptions`, `Delivery Service Tests`, `Subscription Gate Filter Tests`, `Registration & Email Services`, `Subscription Entity`, `Subscription Trial Reminders`, `Password Recovery Code Entity`, `Motoboy & User Repositories`, `Change Password DTO & Exception`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `PageResponseDTO` connect `Client Service & Pagination` to `Expense (Gasto) API Controller`, `Subscription Entity`, `Cash Advance (Vale) API Controller`, `Courier (Motoboy) API Controller`, `Subscription API Controller`, `Client (Cliente) API Controller`, `Payment Method Enums`, `Audit Log Controller`, `Roles & Access Control`, `Delivery API Controller`, `User API Controller`, `Delivery Service Layer`, `User Controller & DTOs`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `AssinaturaService` connect `Subscription Business Logic` to `Subscription Entity`, `Display/System Config Controllers`, `Subscription Trial Reminders`, `Spring Security Configuration`, `Subscription Access Cache`, `Subscription Portal DTO/Exception`, `Subscription API Controller`, `Subscription Service Tests`, `Auth API Controller`, `Audit Log Controller`, `Motoboy & User Repositories`, `Metrics API Controller`, `Roles & Access Control`, `Subscription Gate Filter Tests`, `Stripe Webhook Controller`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Expense (Gasto) API Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.050284031138228484 - nodes in this community are weakly interconnected._