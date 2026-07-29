import { useState } from 'react'
import { createCliente } from '../services/api'
import { FormModal } from './FormModal'

// Extraído num arquivo próprio (diferente do padrão de AddMotoboyModal, que
// fica inline em MotoboysView.jsx) porque é reaproveitado tanto em
// ClientesView.jsx quanto em EntregasView.jsx (atalho de cadastro rápido
// sem sair do formulário de Entrega) — ver fluxo-entrega-configuracoes.md.
//
// Modal largo (700px) com os campos em 2 colunas — pedido explícito pra
// caber sem precisar rolar a tela, mesmo com o endereço estruturado em
// rua/numero/bairro/cidade/complemento.
export function AddClienteModal({ isOpen, onRequestClose, onClienteAdded }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [complemento, setComplemento] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetAndClose = () => {
    setNome('')
    setTelefone('')
    setRua('')
    setNumero('')
    setBairro('')
    setCidade('')
    setComplemento('')
    setError('')
    onRequestClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim() || !telefone.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim()) {
      setError('Preencha todos os campos (complemento é opcional).')
      return
    }
    setLoading(true)
    setError('')
    try {
      const novoCliente = await createCliente(nome.trim(), telefone.trim(), {
        rua: rua.trim(), numero: numero.trim(), bairro: bairro.trim(), cidade: cidade.trim(),
        complemento: complemento.trim() || undefined,
      })
      onClienteAdded(novoCliente)
      resetAndClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível adicionar o cliente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={resetAndClose}
      title="Adicionar Cliente"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Adicionar Cliente"
      submitLabelLoading="Adicionando..."
      width={700}
    >
      <div className="grid grid-cols-2 gap-4">
        <label>
          Nome
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Souza" autoFocus />
        </label>
        <label>
          Telefone
          <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(47) 99999-9999" />
        </label>
      </div>
      <div className="grid grid-cols-[1fr_140px] gap-4">
        <label>
          Rua
          <input type="text" value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Ex: Rua das Flores" />
        </label>
        <label>
          Número
          <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label>
          Bairro
          <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex: Centro" />
        </label>
        <label>
          Cidade
          <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Joinville" />
        </label>
      </div>
      <label>
        Complemento (opcional)
        <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Ex: Apto 302, bloco B" />
      </label>
    </FormModal>
  )
}
