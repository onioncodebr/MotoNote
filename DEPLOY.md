# Deploy em produção — MotoNote

Guia completo pra colocar o app no ar numa VPS, usando Docker e o Nginx Proxy
Manager (NPM) que você já roda por lá.

## 1. Arquitetura — não é um único container

São **3 containers desta aplicação**, nenhum deles publica porta pro host:

```
                    ┌─────────────────────────────────────┐
                    │         VPS (rede Docker)            │
                    │                                       │
 Internet ──────────┼──► Nginx Proxy Manager (80/443, TLS) │
 (seu domínio)      │         │                             │
                    │         ├── /api/*  ──► backend:8080  │
                    │         └── resto    ──► frontend:80  │
                    │                             │         │
                    │                        backend:8080   │
                    │                             │         │
                    │                        mongodb:27017  │
                    └─────────────────────────────────────┘
```

- **`mongodb`** — banco de dados. Só o `backend` fala com ele.
- **`backend`** — Spring Boot (Java), a API em `/api/*`.
- **`frontend`** — Nginx servindo os arquivos estáticos do React (build do Vite).
- **Nginx Proxy Manager** — já roda na sua VPS, em Docker (fora do
  `docker-compose.prod.yml` desta app). É o único ponto exposto nas portas
  80/443, com certificado TLS (Let's Encrypt) e roteamento por caminho pro
  container certo.

Frontend e backend ficam sob o **mesmo domínio** (`https://seudominio.com`),
só variando o caminho (`/api/*` vs resto). Isso é proposital: é o que faz o
cookie de sessão (`SameSite=Lax`, ver `AuthenticationController.java`)
funcionar sem precisar abrir CORS/CSRF pra outro domínio.

## 2. Pré-requisitos na VPS

- Docker + Docker Compose instalados
- Nginx Proxy Manager já rodando em Docker
- Domínio (ex.: `app.seudominio.com`) com registro DNS tipo A apontando pro
  IP da VPS
- Conta Stripe pronta pra ativação em modo live (dados bancários/fiscais à mão)

## 3. Preparar as variáveis de ambiente de produção

Na VPS, dentro da pasta onde o repo será clonado, crie um arquivo `.env`
(este arquivo **nunca é commitado** — já está no `.gitignore`):

```bash
# Backend
JWT_SECRET=                    # gere com: openssl rand -base64 48
CORS_ALLOWED_ORIGINS=https://SEUDOMINIO.com
FRONTEND_URL=https://SEUDOMINIO.com

# MongoDB (nunca use admin/admin em produção)
MONGO_INITDB_ROOT_USERNAME=
MONGO_INITDB_ROOT_PASSWORD=    # gere com: openssl rand -base64 24

# Stripe (modo LIVE — ver seção 4)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
STRIPE_TRIAL_DAYS=15

# Frontend (build-time — vira parte do bundle estático, sem o "+" nem espaços)
VITE_WHATSAPP_NUMBER=5547988641051
```

Gerar o `JWT_SECRET` e a senha do Mongo:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 24   # MONGO_INITDB_ROOT_PASSWORD
```

**Não existe fallback pra `JWT_SECRET` fora do modo de desenvolvimento** — se
ele faltar, o backend recusa subir de propósito (ver
`TokenService.validarSecret()`), então esse é o único item realmente
obrigatório antes do primeiro `docker compose up`.

## 4. Colocar a assinatura em modo live no Stripe

O `STRIPE_SETUP.md` já documenta a configuração em modo *teste* — os passos
abaixo são especificamente pra ir pra modo **live** (produção, cobrança real).
Nenhum objeto do modo teste (produto, preço, webhook) existe automaticamente
em modo live — tudo isso precisa ser recriado.

1. **Ativar a conta Stripe pra valer**: Dashboard → completar dados
   bancários/fiscais (obrigatório antes de qualquer cobrança real acontecer —
   modo teste não exige isso).
2. **Alternar o Dashboard pra Live mode** (chave no canto superior direito).
3. **Recriar o produto/preço em modo live**: Catálogo de produtos → novo
   produto → preço recorrente mensal → copiar o novo `price_...` →
   `STRIPE_PRICE_ID` no `.env`.
4. **Pegar a Secret Key live**: Developers → API keys → Secret key (modo
   live, começa com `sk_live_`) → `STRIPE_SECRET_KEY`.
5. **Reabilitar o Customer Portal em modo live**: Settings → Billing →
   Customer portal — é uma configuração separada por modo; habilitar em
   teste não habilita em live, precisa configurar de novo.
6. **Criar o webhook em modo live**: Developers → Webhooks → + Add endpoint
   → URL `https://SEUDOMINIO.com/api/webhooks/stripe` → mesmos 5 eventos já
   listados no `STRIPE_SETUP.md` (`checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`, `invoice.payment_succeeded`) → copiar o
   signing secret → `STRIPE_WEBHOOK_SECRET`.
7. Antes de divulgar: um teste real, com cartão de verdade (valor pequeno),
   confirmando que o checkout completa e o webhook chega (Dashboard →
   Webhooks → o evento aparece como entregue).

## 5. Clonar o repo e configurar a rede compartilhada com o NPM

```bash
git clone <url-do-seu-repo> entregas
cd entregas
# criar o .env de produção aqui (passo 3)
```

Como o NPM já roda em Docker na mesma VPS, descubra o nome da rede Docker
dele:

```bash
docker network ls
# ou, se souber o nome/ID do container do NPM:
docker inspect <container-do-npm> --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'
```

Edite `docker-compose.prod.yml` e troque `nome_da_rede_do_npm` (na seção
`networks: proxy:`) pelo nome real encontrado.

## 6. Subir os containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps      # os 3 devem estar "Up"
docker compose -f docker-compose.prod.yml logs -f backend   # confirma "Started EntregasApplication"
```

## 7. Configurar o Proxy Host no Nginx Proxy Manager

Na UI do NPM:

1. **Proxy Hosts → Add Proxy Host**
2. Domain: `SEUDOMINIO.com`
3. Forward Hostname/IP: `motonote-frontend-prod` (nome do container — o
   Docker resolve isso sozinho, os dois estando na mesma rede), porta `80`
4. Aba **SSL**: peça um certificado Let's Encrypt, ligue "Force SSL"
5. Aba **Custom locations** → adicione uma location `/api`:
   - Forward Hostname/IP: `motonote-backend-prod`
   - Port: `8080`

Isso faz `https://SEUDOMINIO.com/api/*` cair no backend e o resto cair no
frontend — os dois sob o mesmo domínio.

## 8. Teste de fumaça

- Abrir `https://SEUDOMINIO.com` — landing carrega, "15 dias grátis" aparece
  (confirma que o backend está respondendo)
- Cadastro de uma conta nova → checkout do Stripe (real) → volta pro app já
  logado
- Login / logout
- Conferir no Dashboard do Stripe que o webhook do checkout foi entregue

## 9. Backup do MongoDB

Os dados persistem no volume nomeado `mongo_data_prod` entre restarts e
atualizações dos containers, mas não existe backup automático hoje.
Recomendado agendar (`cron` na VPS):

```bash
docker exec entregas-mongodb-prod mongodump --username <user> --password <senha> --authenticationDatabase admin --archive=/tmp/backup.gz --gzip
docker cp entregas-mongodb-prod:/tmp/backup.gz ./backups/backup-$(date +%F).gz
```

## Atualizando depois do primeiro deploy

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Isso reconstrói só as imagens que mudaram e recria os containers — o volume
do Mongo não é afetado.
