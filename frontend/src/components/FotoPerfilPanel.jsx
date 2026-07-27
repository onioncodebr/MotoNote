import { useRef, useState } from 'react'
import { updateFotoPerfil, removeFotoPerfil } from '../services/api'
import { comprimirImagem } from '../utils/imageCompress'
import { Button } from './Button'
import { CropFotoModal } from './CropFotoModal'

// Coluna de foto de perfil — plugada dentro do card "Perfil" da
// ConfiguracoesView (ao lado dos campos de nome/e-mail), não é mais um
// card próprio. Seleção de arquivo abre um recorte circular 1:1 antes de
// comprimir e enviar.
export function FotoPerfilPanel({ nome, fotoUrl, onUpdated }) {
  const inputRef = useRef(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const iniciais = (nome || 'Empresa')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

  const selecionarArquivo = () => inputRef.current?.click()

  const arquivoEscolhido = (e) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (arquivo) setArquivoSelecionado(arquivo)
  }

  const confirmarRecorte = async (blobRecortado) => {
    setArquivoSelecionado(null)
    setError('')
    setLoading(true)
    try {
      const comprimido = await comprimirImagem(blobRecortado)
      const atualizado = await updateFotoPerfil(comprimido)
      onUpdated?.(atualizado.fotoUrl)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível atualizar a foto.')
    } finally {
      setLoading(false)
    }
  }

  const remover = async () => {
    setError('')
    setLoading(true)
    try {
      const atualizado = await removeFotoPerfil()
      onUpdated?.(atualizado.fotoUrl)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível remover a foto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="foto-perfil-coluna">
      {fotoUrl
        ? <img className="profile-avatar profile-avatar-lg" src={fotoUrl} alt="" />
        : <span className="profile-avatar profile-avatar-lg">{iniciais}</span>}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={arquivoEscolhido} />

      {error && <p className="text-[var(--color-danger)] text-[length:var(--fs-sm)] -mt-1 mb-0">{error}</p>}

      <div className="flex flex-wrap justify-center gap-[var(--space-3)] mt-[var(--space-4)]">
        <Button type="button" variant="outline" size="small" onClick={selecionarArquivo} disabled={loading}>
          {loading ? 'Enviando...' : 'Trocar foto'}
        </Button>
        {fotoUrl && (
          <Button type="button" variant="outline" size="small" onClick={remover} disabled={loading}>
            Remover foto
          </Button>
        )}
      </div>

      <CropFotoModal
        isOpen={!!arquivoSelecionado}
        file={arquivoSelecionado}
        onCancel={() => setArquivoSelecionado(null)}
        onConfirm={confirmarRecorte}
      />
    </div>
  )
}
