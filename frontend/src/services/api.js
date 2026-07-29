const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const API_URL = configuredApiUrl ? configuredApiUrl.replace(/\/$/, '') : ''

// Handler registrável de 402 (assinatura inativa). Fica fora de qualquer
// componente porque este arquivo não tem acesso a contexto React — o App.jsx
// registra a função real (navegar pra tela de Assinatura) num useEffect de mount.
let on402Handler = null
export function setOn402Handler(fn) {
  on402Handler = fn
}

// Mesma ideia, pra token expirado/inválido (401) em qualquer chamada
// autenticada — desloga e manda de volta pro login em vez de deixar a tela
// atual travada com um erro genérico. Não dispara pra /api/auth/** porque
// login/cadastro com credencial errada também respondem 401, e esses são
// erros de formulário normais, não uma sessão expirando.
let on401Handler = null
export function setOn401Handler(fn) {
  on401Handler = fn
}

// Conta desativada pelo MASTER (ver SecurityFilter/GlobalExceptionHandler no
// backend) — 423 em vez de 401/403 de propósito, pra não colidir com o
// fallback usuario->motoboy em getCurrentUser (que usa 403) nem com a lógica
// de "sessão expirou" do 401 (a mensagem aqui é mais específica).
let on423Handler = null
export function setOn423Handler(fn) {
  on423Handler = fn
}

async function handleResponse(response, path, options) {
  if (!response.ok) {
    // A API responde 404 quando uma lista (ex.: motoboys) está vazia, em vez de retornar [].
    // Nesses casos tratamos como "sem itens" ao invés de erro.
    if (response.status === 404 && options.emptyOn404) {
      return options.emptyValue ?? null
    }

    if (response.status === 402) on402Handler?.()
    if (response.status === 401 && !path.startsWith('/api/auth/')) on401Handler?.()
    if (response.status === 423) on423Handler?.()

    let message = 'Não foi possível concluir a solicitação.'
    try {
      const body = await response.json()
      // A maioria dos erros vem como { message: '...' }, mas alguns endpoints
      // (ex.: validação de e-mail duplicado) retornam um mapa campo -> mensagem,
      // como { email: '...' }. Pegamos o primeiro valor de texto disponível.
      const primeiraMensagem = Object.values(body || {}).find((v) => typeof v === 'string')
      message = body.message || body.error || primeiraMensagem || message
    } catch {
      // A API pode responder sem corpo em alguns erros HTTP.
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return response.status === 204 ? null : response.json()
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      // A sessão vive num cookie httpOnly (setado pelo backend no
      // login/cadastro) em vez de um token que o JS lê e anexa manualmente —
      // isso tira o token do alcance de um eventual XSS. `credentials:
      // 'include'` é o que faz o browser mandar esse cookie em toda
      // chamada, mesmo com frontend/backend em portas diferentes no dev.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
  } catch (networkError) {
    // A mensagem pro usuário não expõe IP/porta do backend (evita vazar
    // detalhe de infraestrutura pra quem só está olhando a tela de login) —
    // o endereço configurado continua no console, só pra quem está
    // depurando com o DevTools aberto.
    console.error(`Falha ao conectar em ${API_URL || '(URL relativa)'}${path}`, networkError)
    throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
  }

  return handleResponse(response, path, options)
}

// Mesma coisa que request(), mas pra envio de arquivo (foto de perfil,
// comprovante de gasto): sem fixar Content-Type, porque o browser precisa
// gerar sozinho o "multipart/form-data; boundary=..." a partir do FormData —
// fixando manualmente, o boundary some e o backend não consegue parsear.
async function requestMultipart(path, formData, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      body: formData,
    })
  } catch (networkError) {
    console.error(`Falha ao conectar em ${API_URL || '(URL relativa)'}${path}`, networkError)
    throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
  }

  return handleResponse(response, path, options)
}

export async function login(email, password, captchaToken) {
  // Sem corpo de resposta pra ler: o backend seta o cookie de sessão no
  // header Set-Cookie e não devolve o token em lugar nenhum acessível ao JS.
  await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, captchaToken }),
  })
  return getCurrentUser()
}

// Cadastro em duas etapas (verificação por código de e-mail). requestSignupCode
// só manda o código, sem criar conta; confirmSignup confirma e loga (mesmo
// jeito que o signup() de uma etapa antigo fazia).
export async function requestSignupCode(name, email, password, confirmPassword, phone, captchaToken) {
  await request('/api/auth/signup/iniciar', {
    method: 'POST',
    body: JSON.stringify({ name, email, phone, password, confirmPassword, captchaToken }),
  })
}

export async function confirmSignup(email, codigo) {
  await request('/api/auth/signup/confirmar', {
    method: 'POST',
    body: JSON.stringify({ email, codigo }),
  })
  return getCurrentUser()
}

// Recuperação de senha — mesmo padrão de código de 6 dígitos. requestPasswordReset
// sempre "funciona" do ponto de vista do backend (204 mesmo se o e-mail não
// existir, pra não dar pra descobrir quais e-mails têm conta).
export async function requestPasswordReset(email, captchaToken) {
  await request('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, captchaToken }),
  })
}

export async function resetPassword(email, codigo, novaSenha, confirmarNovaSenha) {
  await request('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, codigo, novaSenha, confirmarNovaSenha }),
  })
}

// Resolve a sessão pros dois tipos de login possíveis: dono da conta
// (Usuario) ou motoboy (portal restrito). Tenta /api/usuarios/me primeiro
// (caso mais comum); um token de motoboy dá 403 ali (ver
// MotoboyAccessGateFilter no backend) — só nesse caso específico cai pro
// /api/motoboy/me. Qualquer outro erro (rede, sessão inválida) propaga
// normalmente, sem mascarar com uma segunda tentativa.
export async function getCurrentUser() {
  try {
    const usuario = await request('/api/usuarios/me')
    return { ...usuario, tipo: 'USER' }
  } catch (err) {
    if (err.status !== 403) throw err
    const motoboy = await request('/api/motoboy/me')
    return { ...motoboy, tipo: 'MOTOBOY' }
  }
}

// Cookie httpOnly não dá pra limpar direto do JS — precisa desse endpoint
// pro backend mandar um Set-Cookie que expira ele. Nunca lança: se a chamada
// falhar (rede fora do ar, por exemplo), o app ainda desloga localmente e o
// cookie no pior caso só expira sozinho depois (TTL de 2h).
export async function clearSession() {
  try {
    await request('/api/auth/logout', { method: 'POST' })
  } catch {
    // Falha de rede aqui não deve travar o logout do lado do cliente.
  }
}

// --- Motoboys Endpoints ---

export async function getMotoboys() {
  return request('/api/motoboys', {
    // A API retorna 404 quando o usuário não tem nenhum motoboy cadastrado.
    emptyOn404: true,
    emptyValue: [],
  })
}

// Paginado (nome A-Z) — usado pela tela de gerenciamento de Motoboys.
// getMotoboys() (sem paginação) continua existindo pros dropdowns de
// Entregas/Relatórios/Visão geral, que precisam da lista inteira.
export async function getMotoboysPaged(page = 0, size = 20) {
  const params = new URLSearchParams({ page, size })
  return request(`/api/motoboys/pagina?${params.toString()}`)
}

export async function createMotoboy({ name, email, password, confirmPassword }) {
  return request('/api/motoboys', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, confirmPassword }),
  })
}

export async function updateMotoboy(id, { newName, email, newPassword, confirmNewPassword }) {
  return request('/api/motoboys', {
    method: 'PUT',
    body: JSON.stringify({ id, newName, email, newPassword: newPassword || null, confirmNewPassword: confirmNewPassword || null }),
  })
}

export async function deleteMotoboy(id, password) {
  return request(`/api/motoboys?id=${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
}

// --- Entregas Endpoints ---

// Paginado (mais recentes primeiro) — retorna { content, page, size, totalElements, totalPages }.
export async function getEntregas(page = 0, size = 20) {
  const params = new URLSearchParams({ page, size })
  return request(`/api/entregas?${params.toString()}`)
}

export async function createEntrega(value, motoboyId, date, formaPagamento, valorPedido, nomeCliente, descricaoPedido, clienteId) {
  return request('/api/entregas', {
    method: 'POST',
    body: JSON.stringify({ value, motoboyId, date, formaPagamento, valorPedido, nomeCliente, descricaoPedido, clienteId }),
  })
}

export async function deleteEntrega(id) {
  return request(`/api/entregas/${id}`, {
    method: 'DELETE',
  })
}

// --- Valores pendentes (recebimento em dinheiro) ---

// Paginado (mais recentes primeiro) — retorna { content, page, size, totalElements, totalPages }.
export async function getEntregasPendentes(startDate, endDate, motoboyId, page = 0, size = 20) {
  const params = new URLSearchParams({ startDate, endDate, page, size })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/entregas/pendentes?${params.toString()}`)
}

export async function getResumoPendentes(startDate, endDate, motoboyId) {
  const params = new URLSearchParams({ startDate, endDate })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/entregas/pendentes/resumo?${params.toString()}`)
}

export async function darBaixaEntrega(id) {
  return request(`/api/entregas/${id}/baixa`, {
    method: 'PATCH',
  })
}

export async function darBaixaEmMassa(ids) {
  return request('/api/entregas/baixa-em-massa', {
    method: 'PATCH',
    body: JSON.stringify({ ids }),
  })
}

// --- Fluxo logístico da entrega (Na loja/Em rota/Não foi possível
// entregar/Entregue) — opt-in via config de Usuario.controleFluxoEntregaHabilitado.
// Uma aba da tela "Entregas Pendentes" (dentro de "Entregas") = um status
// específico (inclusive Entregue) — diferente de getEntregasPendentes (que
// é sobre pendência de PAGAMENTO em dinheiro) — conceitos diferentes, não
// confundir.

export async function getEntregasPorStatusLogistico(status, startDate, endDate, motoboyId, page = 0, size = 20) {
  const params = new URLSearchParams({ status, startDate, endDate, page, size })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/entregas/fluxo?${params.toString()}`)
}

// Contagem por status no período — alimenta o badge de cada aba. Retorna
// { naLoja, emRota, naoEntregue, entregue }.
export async function getContagemStatusLogistico(startDate, endDate, motoboyId) {
  const params = new URLSearchParams({ startDate, endDate })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/entregas/fluxo/contagem?${params.toString()}`)
}

export async function atualizarStatusLogisticoEntrega(id, status, observacao) {
  return request(`/api/entregas/${id}/status-logistico`, {
    method: 'PATCH',
    body: JSON.stringify({ status, observacao }),
  })
}

export async function atualizarStatusLogisticoEmMassa(ids, status, observacao) {
  return request('/api/entregas/status-logistico-em-massa', {
    method: 'PATCH',
    body: JSON.stringify({ ids, status, observacao }),
  })
}

// --- Relatórios Endpoints ---

// Período inteiro de uma vez, sem paginação — usado só pra exportação (o
// export precisa do resultado completo pra gerar o Excel de uma vez).
export async function getReport(startDate, endDate, motoboyId = null) {
  let path = '/api/entregas/relatorio'
  if (motoboyId) {
    path = `/api/entregas/motoboy/${motoboyId}/relatorio`
  }

  const params = new URLSearchParams({
    startDate,
    endDate,
  })

  return request(`${path}?${params.toString()}`)
}

// Paginado (mais recentes primeiro) — usado pela tabela na tela. Retorna
// { content, page, size, totalElements, totalPages }.
export async function getReportPaginado(startDate, endDate, motoboyId, page = 0, size = 20) {
  const params = new URLSearchParams({ startDate, endDate, page, size })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/entregas/relatorio/pagina?${params.toString()}`)
}

export async function getResumo(startDate, endDate, motoboyId) {
  const params = new URLSearchParams({ startDate, endDate })
  if (motoboyId) params.set('motoboyId', motoboyId)

  return request(`/api/entregas/resumo?${params.toString()}`)
}

// --- Portal do motoboy (login próprio, só leitura, sempre escopado a si mesmo) ---

// Paginado (mais recentes primeiro) — retorna { content, page, size, totalElements, totalPages }.
export async function getMotoboyEntregas(page = 0, size = 20) {
  const params = new URLSearchParams({ page, size })
  return request(`/api/motoboy/me/entregas?${params.toString()}`)
}

// Período inteiro de uma vez, sem paginação — usado só pra exportação.
export async function getMotoboyRelatorio(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate })
  return request(`/api/motoboy/me/relatorio?${params.toString()}`)
}

// Paginado (mais recentes primeiro) — usado pela tabela na tela.
export async function getMotoboyRelatorioPaginado(startDate, endDate, page = 0, size = 20) {
  const params = new URLSearchParams({ startDate, endDate, page, size })
  return request(`/api/motoboy/me/relatorio/pagina?${params.toString()}`)
}

export async function getMotoboyResumo(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate })
  return request(`/api/motoboy/me/resumo?${params.toString()}`)
}

export async function changeMotoboyPassword(actualPassword, newPassword) {
  return request('/api/motoboy/me/senha', {
    method: 'PUT',
    body: JSON.stringify({ actualPassword, newPassword }),
  })
}

// --- Gastos (pneu, gasolina, óleo etc.) ---
// Só o motoboy cria/edita/exclui os seus (portal do motoboy); o dono só visualiza.

export async function getGastos(startDate, endDate, motoboyId, page = 0, size = 20) {
  const params = new URLSearchParams({ startDate, endDate, page, size })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/gastos?${params.toString()}`)
}

export async function getResumoGastos(startDate, endDate, motoboyId) {
  const params = new URLSearchParams({ startDate, endDate })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/gastos/resumo?${params.toString()}`)
}

export async function getMotoboyGastos(page = 0, size = 20) {
  const params = new URLSearchParams({ page, size })
  return request(`/api/motoboy/me/gastos?${params.toString()}`)
}

export async function getMotoboyResumoGastos(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate })
  return request(`/api/motoboy/me/gastos/resumo?${params.toString()}`)
}

export async function createGasto(descricao, value, date) {
  return request('/api/motoboy/me/gastos', {
    method: 'POST',
    body: JSON.stringify({ descricao, value, date }),
  })
}

export async function updateGasto(id, descricao, value, date) {
  return request(`/api/motoboy/me/gastos/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ descricao, value, date }),
  })
}

export async function deleteGasto(id) {
  return request(`/api/motoboy/me/gastos/${id}`, {
    method: 'DELETE',
  })
}

export async function uploadComprovante(gastoId, file) {
  const formData = new FormData()
  formData.append('comprovante', file)
  return requestMultipart(`/api/motoboy/me/gastos/${gastoId}/comprovante`, formData, { method: 'POST' })
}

export async function removeComprovante(gastoId) {
  return request(`/api/motoboy/me/gastos/${gastoId}/comprovante`, { method: 'DELETE' })
}

// --- Vales (adiantamento ou produto a descontar) ---
// Só o dono cria/edita/exclui; o motoboy só visualiza os seus (portal do motoboy).

export async function getVales(startDate, endDate, motoboyId, page = 0, size = 20) {
  const params = new URLSearchParams({ startDate, endDate, page, size })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/vales?${params.toString()}`)
}

export async function getResumoVales(startDate, endDate, motoboyId) {
  const params = new URLSearchParams({ startDate, endDate })
  if (motoboyId) params.set('motoboyId', motoboyId)
  return request(`/api/vales/resumo?${params.toString()}`)
}

export async function getMotoboyVales(page = 0, size = 20) {
  const params = new URLSearchParams({ page, size })
  return request(`/api/motoboy/me/vales?${params.toString()}`)
}

export async function getMotoboyResumoVales(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate })
  return request(`/api/motoboy/me/vales/resumo?${params.toString()}`)
}

export async function createVale(motoboyId, descricao, value, date) {
  return request('/api/vales', {
    method: 'POST',
    body: JSON.stringify({ motoboyId, descricao, value, date }),
  })
}

export async function updateVale(id, motoboyId, descricao, value, date) {
  return request(`/api/vales/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ motoboyId, descricao, value, date }),
  })
}

// parcelas: [{ valor, data }, ...] — valor e data de cada parcela são
// digitados manualmente, sem divisão automática de um total.
export async function createValeParcelado(motoboyId, descricao, parcelas) {
  return request('/api/vales/parcelado', {
    method: 'POST',
    body: JSON.stringify({
      motoboyId,
      descricao,
      parcelas: parcelas.map((p) => ({ value: Number(p.valor), date: p.data })),
    }),
  })
}

export async function updateValeStatus(id, status) {
  return request(`/api/vales/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function deleteVale(id) {
  return request(`/api/vales/${id}`, {
    method: 'DELETE',
  })
}

// --- Clientes (cadastro opcional do cliente final, ver
// fluxo-entrega-configuracoes.md) — opt-in via
// Usuario.permitirCadastroClientes. Sem senha na exclusão (diferente de
// Motoboy) — Cliente não tem login associado.

export async function getClientes() {
  return request('/api/clientes')
}

// Busca por nome OU telefone (resolvido no backend) — autocomplete no
// formulário de Entrega e filtro da tela de Clientes.
export async function buscarClientes(termo) {
  const params = new URLSearchParams()
  if (termo) params.set('nome', termo)
  return request(`/api/clientes/buscar?${params.toString()}`)
}

// Ranking/listagem paginada da tela de gestão — retorna { content, page,
// size, totalElements, totalPages }, cada item { cliente, quantidadePedidos,
// totalGasto, ticketMedio, ultimaEntregaEm }.
export async function getClientesRanking(page = 0, size = 20, filtros = {}) {
  const { nome, startDate, endDate, ordenar, direcao, somenteSemPedidos } = filtros
  const params = new URLSearchParams({ page, size })
  if (nome) params.set('nome', nome)
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (ordenar) params.set('ordenar', ordenar)
  if (direcao) params.set('direcao', direcao)
  if (somenteSemPedidos) params.set('somenteSemPedidos', 'true')
  return request(`/api/clientes/pagina?${params.toString()}`)
}

// Endereço estruturado (rua/numero/bairro/cidade obrigatórios, complemento
// opcional) — passado como objeto pra não acumular parâmetros posicionais
// demais.
export async function createCliente(nome, telefone, { rua, numero, bairro, cidade, complemento }) {
  return request('/api/clientes', {
    method: 'POST',
    body: JSON.stringify({ nome, telefone, rua, numero, bairro, cidade, complemento }),
  })
}

export async function updateCliente(id, nome, telefone, { rua, numero, bairro, cidade, complemento }) {
  return request(`/api/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ nome, telefone, rua, numero, bairro, cidade, complemento }),
  })
}

export async function deleteCliente(id) {
  return request(`/api/clientes/${id}`, {
    method: 'DELETE',
  })
}

// --- Usuário / Conta ---

export async function changePassword(actualPassword, newPassword) {
  return request('/api/usuarios/me/senha', {
    method: 'PUT',
    body: JSON.stringify({ actualPassword, newPassword }),
  })
}

export async function updateNome(name) {
  return request('/api/usuarios/me/nome', {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export async function updateFotoPerfil(file) {
  const formData = new FormData()
  formData.append('foto', file)
  return requestMultipart('/api/usuarios/me/foto', formData, { method: 'POST' })
}

export async function removeFotoPerfil() {
  return request('/api/usuarios/me/foto', { method: 'DELETE' })
}

// Troca de telefone em duas etapas — o código vai pro e-mail já cadastrado
// na conta, não pro telefone novo.
export async function requestPhoneChange(novoTelefone) {
  await request('/api/usuarios/me/telefone/solicitar-codigo', {
    method: 'POST',
    body: JSON.stringify({ novoTelefone }),
  })
}

export async function confirmPhoneChange(codigo) {
  return request('/api/usuarios/me/telefone/confirmar', {
    method: 'POST',
    body: JSON.stringify({ codigo }),
  })
}

// Troca de senha em duas etapas — o código vai pro e-mail já cadastrado na
// conta (mesmo espírito da troca de telefone). Diferente de changePassword
// (troca direta, ainda usada pelo motoboy), aqui a senha só é efetivada
// depois do código confirmado.
export async function requestPasswordChangeCode(actualPassword, newPassword) {
  await request('/api/usuarios/me/senha/solicitar-codigo', {
    method: 'POST',
    body: JSON.stringify({ actualPassword, newPassword }),
  })
}

export async function confirmPasswordChange(codigo) {
  await request('/api/usuarios/me/senha/confirmar', {
    method: 'POST',
    body: JSON.stringify({ codigo }),
  })
}

// --- Configurações por conta relacionadas a Entrega (ver
// fluxo-entrega-configuracoes.md) — cada uma salva independente, mesmo
// padrão de atualizarBanner/atualizarPopup. Cada função devolve o
// UsuarioResponseDTO atualizado, pro chamador propagar via onUserUpdated.

export async function atualizarModoValorPedidoObrigatorio(modo) {
  return request('/api/usuarios/me/configuracoes/valor-pedido-obrigatorio', {
    method: 'PUT',
    body: JSON.stringify({ modo }),
  })
}

export async function atualizarPermitirDadosCliente(habilitado) {
  return request('/api/usuarios/me/configuracoes/dados-cliente', {
    method: 'PUT',
    body: JSON.stringify({ habilitado }),
  })
}

export async function atualizarControleFluxoEntrega(habilitado) {
  return request('/api/usuarios/me/configuracoes/fluxo-entrega', {
    method: 'PUT',
    body: JSON.stringify({ habilitado }),
  })
}

export async function atualizarPermitirCadastroClientes(habilitado) {
  return request('/api/usuarios/me/configuracoes/cadastro-clientes', {
    method: 'PUT',
    body: JSON.stringify({ habilitado }),
  })
}

// Ao marcar uma entrega em Dinheiro como Entregue, confirma automaticamente
// o recebimento (equivalente a "dar baixa") — só faz efeito com o controle
// de fluxo também habilitado.
export async function atualizarBaixaAutomaticaAoEntregar(habilitado) {
  return request('/api/usuarios/me/configuracoes/baixa-automatica-entrega', {
    method: 'PUT',
    body: JSON.stringify({ habilitado }),
  })
}

// Torna valor do pedido obrigatório em toda entrega e libera o card
// "Faturamento dos Pedidos" na Visão Geral (as duas coisas juntas, porque a
// soma só é confiável se o valor do pedido vier preenchido sempre).
export async function atualizarMostrarFaturamentoPedidos(habilitado) {
  return request('/api/usuarios/me/configuracoes/faturamento-pedidos', {
    method: 'PUT',
    body: JSON.stringify({ habilitado }),
  })
}

// --- Administração de usuários (somente role MASTER) ---

// Paginado (mais recentes primeiro), com filtro opcional por status de
// assinatura e/ou busca textual (nome/e-mail) — retorna { content, page,
// size, totalElements, totalPages }.
export async function getUsuarios(page = 0, size = 20, status, busca) {
  const params = new URLSearchParams({ page, size })
  if (status) params.set('status', status)
  if (busca) params.set('busca', busca)
  return request(`/api/usuarios/findAll?${params.toString()}`)
}

export async function createUsuario({ name, email, password, role }) {
  return request('/api/usuarios/save', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  })
}

export async function updateUsuario(currentEmail, { name, email, role, newPassword }) {
  return request(`/api/usuarios/update?email=${encodeURIComponent(currentEmail)}`, {
    method: 'PUT',
    body: JSON.stringify({ name, email, role, newPassword: newPassword || null }),
  })
}

// Bloqueia (ativo=false) ou reativa (ativo=true) uma conta sem apagar os
// dados dela — diferente de deleteUsuario.
export async function alterarStatusUsuario(email, ativo) {
  const params = new URLSearchParams({ email, ativo })
  return request(`/api/usuarios/status?${params.toString()}`, {
    method: 'PATCH',
  })
}

export async function deleteUsuario(email) {
  return request(`/api/usuarios/delete?email=${encodeURIComponent(email)}`, {
    method: 'DELETE',
  })
}

// --- Assinatura ---

// Único endpoint de assinatura que não exige login — usado na landing page
// e no cadastro, onde ainda não existe sessão.
export async function getPlano() {
  return request('/api/assinaturas/plano')
}

export async function getAssinatura() {
  return request('/api/assinaturas/me')
}

export async function createCheckoutSession() {
  return request('/api/assinaturas/checkout-session', {
    method: 'POST',
  })
}

export async function createPortalSession() {
  return request('/api/assinaturas/portal-session', {
    method: 'POST',
  })
}

// --- Analytics (visitas às páginas públicas) ---

// Contagem de tráfego pro Painel Master — chamado sem sessão (landing e
// tela de criar conta). Silenciosamente ignorado se falhar: nunca deve
// atrapalhar a navegação de quem só está visitando o site.
export async function registrarVisitaPagina(tipo) {
  try {
    await request(`/api/analytics/visita/${tipo}`, { method: 'POST' })
  } catch {
    // best-effort — sem retry, sem exibir nada pro visitante
  }
}

// --- Dashboard Master (métricas, assinaturas, motoboys global, auditoria — somente MASTER) ---

export async function getMetricasMaster() {
  return request('/api/master/metricas')
}

// Série diária (com dias sem evento preenchidos em 0 pelo backend) — janela
// fixa de "dias" a partir de hoje.
export async function getCadastrosPorDia(dias = 30) {
  return request(`/api/master/metricas/cadastros-por-dia?dias=${dias}`)
}

export async function getEntregasPorDiaMaster(dias = 30) {
  return request(`/api/master/metricas/entregas-por-dia?dias=${dias}`)
}

export async function getRankingEmpresas(dias = 30, limite = 10) {
  return request(`/api/master/metricas/ranking-empresas?dias=${dias}&limite=${limite}`)
}

// Paginado, com filtro opcional por status de assinatura — retorna
// { content, page, size, totalElements, totalPages }.
export async function getAssinaturasPaged(page = 0, size = 20, status) {
  const params = new URLSearchParams({ page, size })
  if (status) params.set('status', status)
  return request(`/api/assinaturas/findAll?${params.toString()}`)
}

export async function concederAssinaturaManual(usuarioId, diasCortesia) {
  return request('/api/assinaturas/manual', {
    method: 'POST',
    body: JSON.stringify({ usuarioId, diasCortesia }),
  })
}

// Inverso de concederAssinaturaManual — o backend recusa (409) se a
// assinatura tiver cobrança real no Stripe.
export async function revogarAssinaturaManual(usuarioId) {
  return request('/api/assinaturas/revogar', {
    method: 'POST',
    body: JSON.stringify({ usuarioId }),
  })
}

// Listagem global (todos os tenants), com busca opcional por nome — retorna
// { content, page, size, totalElements, totalPages }.
export async function getMotoboysMasterPaged(page = 0, size = 20, nome) {
  const params = new URLSearchParams({ page, size })
  if (nome) params.set('nome', nome)
  return request(`/api/motoboys/findAll?${params.toString()}`)
}

// filtros: { acao, ator, desde, ate } — todos opcionais (desde/ate no
// formato yyyy-MM-dd, mesmo formato de <input type="date">).
export async function getConfiguracaoSistema() {
  return request('/api/master/configuracoes')
}

export async function atualizarConfiguracaoSistema(trialDays) {
  return request('/api/master/configuracoes', {
    method: 'PUT',
    body: JSON.stringify({ trialDays }),
  })
}

export async function atualizarCadastroPublico(habilitado) {
  return request('/api/master/configuracoes/cadastro-publico', {
    method: 'PUT',
    body: JSON.stringify({ habilitado }),
  })
}

export async function atualizarRateLimit(loginMaxTentativas, geralMaxTentativas) {
  return request('/api/master/configuracoes/rate-limit', {
    method: 'PUT',
    body: JSON.stringify({ loginMaxTentativas, geralMaxTentativas }),
  })
}

export async function atualizarBanner(habilitado, mensagem) {
  return request('/api/master/configuracoes/banner', {
    method: 'PUT',
    body: JSON.stringify({ habilitado, mensagem }),
  })
}

export async function atualizarContatoSuporte(whatsapp, email) {
  return request('/api/master/configuracoes/contato-suporte', {
    method: 'PUT',
    body: JSON.stringify({ whatsapp, email }),
  })
}

export async function atualizarPopup(habilitado, titulo, descricao, botaoTexto, botaoUrl) {
  return request('/api/master/configuracoes/popup', {
    method: 'PUT',
    body: JSON.stringify({ habilitado, titulo, descricao, botaoTexto, botaoUrl }),
  })
}

// Consumido por qualquer usuário logado (não só MASTER) — banner, popup de
// novidade e contato de suporte, exibidos no dashboard de todo tenant.
export async function getConfiguracaoExibicao() {
  return request('/api/configuracoes/exibicao')
}

export async function getAuditoriaPaged(page = 0, size = 20, filtros = {}) {
  const params = new URLSearchParams({ page, size })
  if (filtros.acao) params.set('acao', filtros.acao)
  if (filtros.ator) params.set('ator', filtros.ator)
  if (filtros.desde) params.set('desde', filtros.desde)
  if (filtros.ate) params.set('ate', filtros.ate)
  return request(`/api/auditoria/findAll?${params.toString()}`)
}
