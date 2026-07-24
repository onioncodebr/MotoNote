# Configurar o Resend (envio de e-mail)

O código já está pronto pra usar o [Resend](https://resend.com) pra mandar
e-mail de confirmação de cadastro, recuperação de senha e troca de telefone
(ver `ResendGateway.java`). Isso aqui é o que falta fazer **fora do código**,
na conta do Resend, pra esses e-mails saírem de verdade.

Sem isso, o backend continua funcionando normalmente (os fluxos de código
por e-mail respondem `503` até você configurar); em desenvolvimento local
(`SPRING_PROFILES_ACTIVE=dev`), os e-mails nem são necessários — o código de
6 dígitos aparece direto no log do backend, então dá pra testar tudo sem
conta no Resend.

## Passo a passo

1. **Criar conta** em [resend.com](https://resend.com).

2. **Adicionar e verificar seu domínio de envio** (Dashboard → Domains →
   Add Domain), ex.: `seudominio.com`. O Resend vai pedir pra você criar
   alguns registros DNS (SPF, DKIM e opcionalmente DMARC) no seu provedor de
   domínio. Enquanto o domínio não estiver verificado, o Resend só permite
   mandar e-mail usando o domínio de teste deles (`onboarding@resend.dev`),
   e só pro próprio e-mail da sua conta — bom pra um teste rápido, não serve
   pra produção com usuários reais.

3. **Gerar uma API Key** (Dashboard → API Keys → Create API Key). Permissão
   de envio ("Sending access") já é suficiente, não precisa de acesso total.

4. **Definir o remetente**, no formato `Nome <email@dominio>`, usando um
   endereço do domínio que você verificou no passo 2. Ex.:
   `MotoNote <naoresponda@seudominio.com>`.

5. **Preencher no `.env` local** (raiz do repo, arquivo já existe e já tem
   os dois campos vazios):
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL="MotoNote <naoresponda@seudominio.com>"
   ```

6. **Em produção**: adicionar as duas mesmas variáveis no `.env` da VPS
   (mesmo arquivo que já tem `JWT_SECRET`, `STRIPE_SECRET_KEY` etc. — ver
   `DEPLOY.md`). O `docker-compose.prod.yml` já está preparado pra repassar
   essas duas variáveis pro container do backend.

7. **Testar de verdade**: com o backend rodando (local ou produção) e as
   variáveis preenchidas, peça uma recuperação de senha pro seu próprio
   e-mail ("Esqueci minha senha" na tela de login) e confirme que o e-mail
   chega.

8. **De olho no limite do plano gratuito**: a conta gratuita do Resend tem
   um teto diário/mensal de e-mails enviados — confira o valor atual no
   dashboard deles (pode mudar). Se o volume de cadastros/recuperações de
   senha crescer, pode ser necessário migrar pra um plano pago.
