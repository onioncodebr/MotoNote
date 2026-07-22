# Configurando o Stripe (modo teste)

Passo a passo para deixar a assinatura mensal funcionando de ponta a ponta. Isso é trabalho manual no Dashboard do Stripe — o código já está pronto e só espera as chaves configuradas no `.env`.

## 1. Criar a conta

1. Crie uma conta em https://dashboard.stripe.com/register.
2. Não é preciso completar a ativação "live" agora — o **modo teste** (toggle "Test mode" no canto superior direito do Dashboard) já é suficiente pra desenvolver e testar tudo.

## 2. Criar o produto e o preço mensal

1. Dashboard → **Product catalog** → **+ Add product**.
2. Nome: `MotoNote — Plano Mensal` (ou o nome que preferir).
3. Em **Pricing**: `Recurring`, `Monthly`, moeda `BRL`, valor do plano.
4. Salve e copie o **Price ID** (começa com `price_...`) — é o `STRIPE_PRICE_ID`.

## 3. Pegar a Secret Key

1. Dashboard → **Developers** → **API keys**.
2. Copie a **Secret key** do modo teste (começa com `sk_test_...`) — é o `STRIPE_SECRET_KEY`.
3. **Nunca** use a `pk_test_...` (essa é a chave publicável) — o backend é quem fala com o Stripe, o frontend só recebe uma URL pronta e redireciona.

## 4. Habilitar o Customer Portal

1. Dashboard → **Settings** → **Billing** → **Customer portal**.
2. Ative o portal (se não fizer isso, o botão "Gerenciar assinatura" do app vai falhar ao criar a sessão).
3. Configure o que o cliente pode fazer no portal (cancelar assinatura, trocar cartão) — os padrões já servem pra começar.

## 5. Webhook — desenvolvimento local

O webhook é a **fonte da verdade** do status da assinatura (o app não confia só no retorno do Checkout no navegador). Em dev, use a Stripe CLI:

```bash
# instalar (uma vez): https://docs.stripe.com/stripe-cli
stripe login

# com o backend rodando em localhost:8080, deixe isso rodando numa aba separada:
stripe listen --forward-to localhost:8080/api/webhooks/stripe
```

O comando `stripe listen` imprime um `whsec_...` — é esse valor (não o de produção) que vai no `STRIPE_WEBHOOK_SECRET` do `.env` local. **Sem esse comando rodando, nenhum evento chega no backend e a assinatura nunca sai de "processando"**, mesmo que o pagamento tenha sido aprovado no Checkout.

## 6. Webhook — produção

Quando tiver um domínio público:

1. Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**.
2. URL: `https://<seu-dominio>/api/webhooks/stripe`.
3. Eventos a selecionar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copie o **Signing secret** desse endpoint (também é um `whsec_...`, mas **diferente** do de dev) e use como `STRIPE_WEBHOOK_SECRET` do ambiente de produção.

## 7. Preencher o `.env`

Copie `.env.example` (na raiz do projeto) para `.env` e preencha:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # o impresso pelo `stripe listen` em dev
STRIPE_PRICE_ID=price_...
STRIPE_TRIAL_DAYS=15
FRONTEND_URL=http://localhost:5173
```

O Spring Boot **não carrega `.env` sozinho** — exporte essas variáveis no shell antes de rodar o backend, ou configure-as na run configuration da IDE (IntelliJ: Run → Edit Configurations → Environment variables). Sem `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_ID` preenchidos, o backend sobe com esses valores vazios e qualquer chamada ao Stripe vai falhar.

## 8. Testar o fluxo completo

Com `stripe listen` rodando e o backend com as variáveis configuradas:

1. Acesse a landing page → **Criar conta grátis** → preencha nome/e-mail/senha.
2. Você é redirecionado pro Checkout hospedado do Stripe.
3. Use um cartão de teste:

   | Cartão | Resultado |
   |---|---|
   | `4242 4242 4242 4242` | Sucesso — qualquer CVC e validade futura |
   | `4000 0000 0000 0341` | Anexa o cartão mas falha ao cobrar (testa o que acontece quando o trial acaba e a cobrança falha) |
   | `4000 0025 0000 3155` | Exige autenticação 3D Secure |

4. Após pagar, você volta pro app (`?checkout=success`) e cai na tela **Assinatura**, que confirma o status em alguns segundos (fica tentando de novo enquanto o webhook não chega).
5. Confira no terminal onde `stripe listen` está rodando se os eventos `checkout.session.completed` e `customer.subscription.updated` chegaram (devem aparecer como `200 OK`).
6. No Mongo, a coleção `assinatura` deve ter um documento com `status: "TRIALING"` pra esse usuário.

### Avançar o trial sem esperar 15 dias

Use **Test Clocks** (Dashboard → Developers → Test clocks), não o comando `stripe trigger` — o `trigger` só envia um payload de evento avulso, não simula a passagem de tempo de uma assinatura de verdade. Crie o Test Clock, associe o Customer de teste a ele, e avance o relógio pra ver a cobrança automática acontecer (com sucesso ou falha, dependendo do cartão usado).

## 9. Migrar usuários que já existem no banco

Contas criadas **antes** dessa integração não têm nenhuma `Assinatura` vinculada e, por padrão, ficam bloqueadas (402) assim que o gate de acesso estiver ativo. Para liberar (cortesia, ou enquanto testa), logado como MASTER:

```
POST /api/assinaturas/manual
Authorization: Bearer <token do MASTER>
Content-Type: application/json

{ "usuarioId": "<id do usuário>", "diasCortesia": 30 }
```

Isso vale tanto pros usuários legados quanto como ferramenta permanente de suporte (dar cortesia, resolver pagamento feito fora do Stripe, etc).

## Cuidado

- **Nunca edite o Price** depois que já existirem assinaturas ativas nele — se o valor mudar, crie um novo Price e migre os assinantes.
- Mantenha as chaves de **teste** e **produção** em arquivos/variáveis separados — não reaproveite `sk_test_...` em produção nem vice-versa.
