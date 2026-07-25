import { useEffect, useState } from 'react'
import Cropper from 'react-easy-crop'
import { FormModal } from './FormModal'

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = url
  })
}

async function recortarImagem(imageSrc, areaPixels) {
  const img = await carregarImagem(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = areaPixels.width
  canvas.height = areaPixels.height
  canvas.getContext('2d').drawImage(
    img,
    areaPixels.x, areaPixels.y, areaPixels.width, areaPixels.height,
    0, 0, areaPixels.width, areaPixels.height
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível recortar a imagem.'))), 'image/jpeg', 0.92)
  })
}

// Recorte circular 1:1 da foto de perfil antes do upload — arrastar pra
// reposicionar, roda do mouse/pinça pra zoom (react-easy-crop cobre os
// dois). O resultado ainda passa por comprimirImagem no FotoPerfilPanel
// antes de ir pro servidor.
export function CropFotoModal({ isOpen, file, onCancel, onConfirm }) {
  const [imageSrc, setImageSrc] = useState('')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setImageSrc('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setAreaPixels(null)
    setError('')
    return () => URL.revokeObjectURL(url)
  }, [file])

  const confirmar = async (e) => {
    e.preventDefault()
    if (!areaPixels) return
    setLoading(true)
    setError('')
    try {
      const blob = await recortarImagem(imageSrc, areaPixels)
      onConfirm(blob)
    } catch {
      setError('Não foi possível recortar a imagem. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onCancel}
      title="Ajustar foto"
      onSubmit={confirmar}
      loading={loading}
      error={error}
      submitLabel="Usar esta foto"
      submitLabelLoading="Recortando..."
      width={420}
    >
      <div className="crop-area">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setAreaPixels(pixels)}
          />
        )}
      </div>
      <label className="crop-zoom-label">
        Zoom
        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
      </label>
    </FormModal>
  )
}
