# Configurar o Cloudflare R2 (foto de perfil e comprovante de gasto)

O código já está pronto pra usar o [Cloudflare R2](https://developers.cloudflare.com/r2/)
pra guardar a foto de perfil do cliente e a foto de comprovante de gasto do
motoboy (ver `R2Gateway.java`). Isso aqui é o que falta fazer **fora do
código**, na sua conta Cloudflare, pra esses uploads funcionarem de verdade.

Sem isso, o backend continua funcionando normalmente — só os endpoints de
foto de perfil e de comprovante respondem `503` até você configurar.

São **dois buckets**, com propósitos diferentes:
- **Público** — foto de perfil (avatar). URL direta, acessível por qualquer
  um que tenha o link, mesmo padrão de qualquer avatar de app.
- **Privado** — comprovante de gasto (documento financeiro). Nunca fica
  público; o backend gera um link temporário assinado (válido por ~15 min)
  toda vez que o motoboy dono ou o dono da conta abrem a tela de gastos.

## Passo a passo

1. **Criar/usar sua conta Cloudflare** (a mesma que já usa pro Turnstile,
   se já tiver configurado). No painel, vá em **R2 Object Storage**.

2. **Criar o bucket público** (ex.: `motonote-perfil`):
   - Dashboard → R2 → Create bucket → nome do bucket → Create.
   - Entre no bucket → aba **Settings** → **Public Access** → habilite
     **"Allow Access"** via **"Public Development URL"** (o mais simples;
     não exige domínio próprio). O Cloudflare mostra uma URL no formato
     `https://pub-xxxxxxxx.r2.dev` — é esse valor que vai em `R2_PUBLIC_URL`.
   - (Opcional, mais profissional) Em vez da URL `pub-xxxx.r2.dev`, você
     pode conectar um domínio/subdomínio seu (ex.: `fotos.seudominio.com`)
     em **Custom Domains** — nesse caso, `R2_PUBLIC_URL` é essa URL própria.

3. **Criar o bucket privado** (ex.: `motonote-comprovantes`):
   - Mesmo processo do passo 2, **sem** habilitar nenhum acesso público —
     deixe como está por padrão (privado).

4. **Gerar as credenciais de API** (Dashboard → R2 → Manage API Tokens →
   Create API Token):
   - Permissão: **Object Read & Write**.
   - Escopo: restrinja aos dois buckets criados acima (`motonote-perfil` e
     `motonote-comprovantes`), em vez de "todos os buckets da conta".
   - Ao criar, o Cloudflare mostra **uma única vez** o `Access Key ID` e o
     `Secret Access Key` — copie os dois agora, não dá pra ver o secret de
     novo depois.

5. **Pegar o Account ID**: Dashboard → R2 (a barra lateral direita mostra o
   "Account ID", ou em qualquer tela do painel Cloudflare → canto inferior
   direito).

6. **Preencher no `.env` local** (raiz do repo, os seis campos já existem
   vazios):
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_PUBLICO=motonote-perfil
   R2_BUCKET_PRIVADO=motonote-comprovantes
   R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev
   ```
   (`R2_PUBLIC_URL` sem barra `/` no final.)

7. **Em produção**: adicionar as mesmas seis variáveis no `.env` da VPS
   (mesmo arquivo que já tem `JWT_SECRET`, `RESEND_API_KEY` etc. — ver
   `DEPLOY.md`). O `docker-compose.prod.yml` já está preparado pra repassar
   essas variáveis pro container do backend.

8. **Testar de verdade**: com o backend rodando (local ou produção) e as
   variáveis preenchidas, entre em Configurações → Foto de perfil e troque a
   foto; depois, como motoboy, anexe um comprovante num gasto e confirme que
   o link "Ver" abre a imagem.

9. **De olho no limite do plano gratuito**: o R2 tem um teto mensal
   generoso de armazenamento/operações no plano gratuito — confira o valor
   atual no dashboard deles (pode mudar). Diferente do S3 da AWS, o R2 não
   cobra por egress (tráfego de saída), só por armazenamento e operações.
