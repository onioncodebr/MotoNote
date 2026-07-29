import { toLocalIsoDate } from '../utils/date'
import { FORMA_PAGAMENTO_LABELS, STATUS_RECEBIMENTO_LABELS } from '../utils/entregaPagamento'
import { STATUS_LOGISTICO_LABELS } from '../utils/statusLogistico'

// exceljs só é baixado quando alguém realmente exporta algo — evita
// carregar essa lib (~1MB) no bundle inicial pra todo mundo que nunca usa a
// função de export. Também trocamos de `xlsx`/SheetJS pra `exceljs` porque
// a versão do xlsx no npm tem uma vulnerabilidade alta (prototype pollution
// + ReDoS) sem correção disponível.
async function novoWorkbook(sheetName, formattedData) {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  const colunas = Object.keys(formattedData[0])
  worksheet.columns = colunas.map((key) => ({ header: key, key, width: Math.max(key.length, 20) }))
  worksheet.addRows(formattedData)

  return workbook
}

async function baixarWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// detalhado: inclui forma de pagamento/valor do pedido/cliente/status
// (mesmas colunas da tabela "Entregas Recentes"). comFluxo: inclui também o
// status do fluxo logístico, só quando a conta tem essa config ligada.
export async function exportToExcel(data, fileName = 'relatorio_entregas', { detalhado = false, comFluxo = false } = {}) {
  if (!data || data.length === 0) {
    alert('Não há dados para exportar.')
    return
  }

  const formattedData = data.map((item) => ({
    Motoboy: item.motoboyName,
    Data: new Date(item.localDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    'Valor (R$)': item.value,
    ...(detalhado && {
      'Forma de Pagamento': FORMA_PAGAMENTO_LABELS[item.formaPagamento] || '',
      'Valor do Pedido (R$)': item.valorPedido ?? '',
      Cliente: item.clienteNome || '',
      Status: STATUS_RECEBIMENTO_LABELS[item.status] || '',
      ...(comFluxo && { Fluxo: STATUS_LOGISTICO_LABELS[item.statusLogistico] || '' }),
    }),
  }))

  const workbook = await novoWorkbook('Entregas', formattedData)
  await baixarWorkbook(workbook, `${fileName}_${toLocalIsoDate(new Date())}.xlsx`)
}

export async function exportUsuariosToExcel(usuarios, fileName = 'clientes') {
  if (!usuarios || usuarios.length === 0) {
    alert('Não há clientes para exportar.')
    return
  }

  const formattedData = usuarios.map((usuario) => ({
    Nome: usuario.name,
    'E-mail': usuario.email,
    Telefone: usuario.phone || '',
  }))

  const workbook = await novoWorkbook('Clientes', formattedData)
  await baixarWorkbook(workbook, `${fileName}_${toLocalIsoDate(new Date())}.xlsx`)
}

// Rótulos em pt-BR pro enum StatusAssinatura do backend — mesmo conjunto de
// STATUS_LABELS (utils/status.js), duplicado aqui pra manter exportService.js
// sem depender de outro módulo só por causa de um mapa de texto.
const STATUS_ASSINATURA_LABELS = {
  TRIALING: 'Período de teste',
  ATIVA: 'Ativa',
  INADIMPLENTE: 'Pagamento pendente',
  CANCELADA: 'Cancelada',
  INCOMPLETA: 'Processando',
  SEM_ASSINATURA: 'Sem assinatura',
}

export async function exportAssinaturasToExcel(assinaturas, fileName = 'assinaturas') {
  if (!assinaturas || assinaturas.length === 0) {
    alert('Não há assinaturas para exportar.')
    return
  }

  const formattedData = assinaturas.map((assinatura) => ({
    Empresa: assinatura.nomeEmpresa,
    'E-mail': assinatura.emailEmpresa,
    Status: STATUS_ASSINATURA_LABELS[assinatura.status] || assinatura.status,
    'Trial termina em': assinatura.trialTerminaEm ? new Date(assinatura.trialTerminaEm).toLocaleString('pt-BR') : '',
    'Período atual termina em': assinatura.periodoAtualTerminaEm ? new Date(assinatura.periodoAtualTerminaEm).toLocaleString('pt-BR') : '',
  }))

  const workbook = await novoWorkbook('Assinaturas', formattedData)
  await baixarWorkbook(workbook, `${fileName}_${toLocalIsoDate(new Date())}.xlsx`)
}

export async function exportMotoboysMasterToExcel(motoboys, fileName = 'motoboys') {
  if (!motoboys || motoboys.length === 0) {
    alert('Não há motoboys para exportar.')
    return
  }

  const formattedData = motoboys.map((motoboy) => ({
    Nome: motoboy.name,
    'E-mail': motoboy.email || '',
    Empresa: motoboy.nomeEmpresa || '',
  }))

  const workbook = await novoWorkbook('Motoboys', formattedData)
  await baixarWorkbook(workbook, `${fileName}_${toLocalIsoDate(new Date())}.xlsx`)
}

export async function exportAuditoriaToExcel(registros, fileName = 'auditoria') {
  if (!registros || registros.length === 0) {
    alert('Não há registros de auditoria para exportar.')
    return
  }

  const formattedData = registros.map((registro) => ({
    Quando: registro.criadoEm ? new Date(registro.criadoEm).toLocaleString('pt-BR') : '',
    Quem: registro.actorNome,
    'E-mail de quem fez': registro.actorEmail,
    Ação: registro.acao,
    Alvo: registro.alvoDescricao || '',
    Detalhes: registro.detalhes ? JSON.stringify(registro.detalhes) : '',
  }))

  const workbook = await novoWorkbook('Auditoria', formattedData)
  await baixarWorkbook(workbook, `${fileName}_${toLocalIsoDate(new Date())}.xlsx`)
}
