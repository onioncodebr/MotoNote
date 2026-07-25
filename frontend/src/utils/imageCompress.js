// Redimensiona/comprime uma imagem no navegador antes do upload (foto de
// perfil, comprovante de gasto) — sem lib nova, só Canvas API nativa.
// Mantém os arquivos pequenos (a maioria das fotos de celular vem em vários
// MB) sem depender só do limite de tamanho do backend.
export function comprimirImagem(file, { maxDimensao = 1600, qualidade = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxDimensao || height > maxDimensao) {
        const escala = maxDimensao / Math.max(width, height)
        width = Math.round(width * escala)
        height = Math.round(height * escala)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
        'image/jpeg',
        qualidade
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem selecionada.'))
    }
    img.src = url
  })
}
