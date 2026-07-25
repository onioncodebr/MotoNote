# Novo layout da aba Configurações

Documento atualizado para refletir o que foi **implementado** (o plano
original mudou bastante ao longo da implementação, por ajustes pedidos
durante o processo). Serve de referência do estado atual da tela.

## Layout implementado

`ConfiguracoesView.jsx` agora é dividido em seções, com título acima de
cada uma (exceto Perfil, cujo próprio card já tem o título):

1. **Perfil** (card único, largura cheia) — combina:
   - Foto de perfil (avatar à esquerda) + Nome/E-mail/Perfil de acesso
     (campos à direita), como antes.
   - Abaixo, separado por uma linha divisória: **Telefone** e **Senha**,
     como dois blocos compactos lado a lado (rótulo + valor atual + botão
     que abre um popup) — não são mais cards próprios.
2. **Assinatura** — largura cheia, só pra quem não é MASTER (sem mudança).
3. **Aparência** — tema e cor de destaque (sem mudança).
4. **Ajuda** — dois cards lado a lado: "Falar com o suporte" (WhatsApp) e
   "Como usar o sistema" (leva pra tela pública `ComoUsar`, reaproveitada
   de dentro do Dashboard via nova prop `onComoUsar`).

## Foto de perfil: recorte antes do upload

Implementado com `react-easy-crop` (~5KB, só depende de React). Ao
selecionar um arquivo, abre `CropFotoModal.jsx` — recorte circular 1:1,
arrastar pra reposicionar, zoom por scroll/pinça. O resultado do recorte
ainda passa por `comprimirImagem` (compressão/redimensionamento já
existente) antes do upload.

## Troca de senha com código por e-mail

Adicionado durante a implementação (não estava no plano original): a troca
de senha do **dono da conta** agora exige confirmação por código de 6
dígitos enviado por e-mail, mesmo padrão já usado pra troca de telefone.

- Backend: `AlteracaoSenhaPendente` (domínio + repo, TTL 15 min, mesma
  técnica de `AlteracaoTelefonePendente`), `UsuarioService.solicitarAlteracaoSenha`/
  `confirmarAlteracaoSenha`, endpoints `POST /api/usuarios/me/senha/solicitar-codigo`
  e `POST /api/usuarios/me/senha/confirmar`.
- O endpoint antigo (`PUT /api/usuarios/me/senha`, troca direta sem
  código) **continua existindo** — é o que o portal do motoboy usa
  (`MotoboyContaView`/`AlterarSenhaPanel`), que não passou a exigir
  código.
- Frontend: `AlterarSenhaComCodigoPanel.jsx` (novo, só usado pelo dono da
  conta) — 2 etapas: senha atual + nova senha → código.

## Espaçamento entre "Configurações" e o card de suporte no menu lateral

Causa raiz real (diferente do que constava no plano inicial): `.side-nav`
tinha `flex: 1 1 auto`, o que já fazia o menu **esticar sozinho** pra
preencher o espaço livre da barra lateral — trocar o `margin-top` do
`.sidebar-bottom` (de `auto` pra um valor fixo) não mudaria nada nesse
caso, porque o vão nem vinha dali.

O problema de verdade aparece no caso oposto: quando o menu é longo (ex.:
MASTER, com os itens extras de administração) e ocupa todo o espaço
disponível — aí `margin-top: auto` do card de suporte cai pra `0`, e ele
fica colado no último item do menu, sem respiro.

Correção aplicada: mantido `margin-top: auto` em `.sidebar-bottom` (segue
funcionando bem no caso comum), mais um `margin-bottom: 20px` fixo em
`.side-nav`, garantindo um espaçamento mínimo mesmo quando o menu enche a
barra lateral.

## Arquivos alterados

Backend:
- `domain/AlteracaoSenhaPendente.java`, `repository/AlteracaoSenhaPendenteRepo.java` (novos)
- `dto/ConfirmarAlteracaoSenhaDTO.java` (novo)
- `service/UsuarioService.java` (novos métodos)
- `controller/UsuarioController.java` (novos endpoints)

Frontend:
- `components/ConfiguracoesView.jsx` — layout em seções, Perfil combinado
- `components/FotoPerfilPanel.jsx` — sem card próprio, com recorte
- `components/CropFotoModal.jsx` (novo)
- `components/AlterarTelefonePanel.jsx` — sem card próprio, vira bloco compacto
- `components/AlterarSenhaComCodigoPanel.jsx` (novo — dono da conta, com código)
- `components/AlterarSenhaPanel.jsx` — mantido como popup simples (motoboy)
- `App.jsx` — prop `onComoUsar` no `Dashboard`; `montarWhatsappUrl` movida pra `utils/whatsapp.js`
- `utils/whatsapp.js` (novo)
- `services/api.js` — `updateFotoPerfil`, `removeFotoPerfil`, `requestPasswordChangeCode`, `confirmPasswordChange`
- `App.css` — seções da grid de Configurações, cards de Ajuda, correção do menu lateral
- `package.json` — nova dependência `react-easy-crop`

## Verificação feita

- `mvn -o compile` (backend) e `npm run build` (frontend) limpos.
- Testado via API (curl) com conta descartável: upload de foto/comprovante
  já existentes continuam funcionando; fluxo completo de troca de senha
  com código (solicitar → código errado rejeitado → código certo aceito →
  login com a senha nova).
- Testado visualmente no navegador: layout do card Perfil, popups de
  Telefone/Senha, seção Ajuda, navegação "Como usar" (ida e volta),
  espaçamento do menu lateral com o menu completo do MASTER.
