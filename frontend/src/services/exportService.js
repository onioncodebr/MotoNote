import { toLocalIsoDate } from '../utils/date'

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

export async function exportToExcel(data, fileName = 'relatorio_entregas') {
  if (!data || data.length === 0) {
    alert('Não há dados para exportar.')
    return
  }

  const formattedData = data.map((item) => ({
    Motoboy: item.motoboyName,
    Data: new Date(item.localDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    'Valor (R$)': item.value,
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
