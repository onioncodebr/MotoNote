import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { createMotoboy, deleteMotoboy, getMotoboysPaged, updateMotoboy } from '../services/api'

const PAGE_SIZE = 20
import { ConfirmDialog } from './ConfirmDialog'
import { FormModal } from './FormModal'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

function AddMotoboyModal({ isOpen, onRequestClose, onMotoboyAdded }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetAndClose = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    onRequestClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const newMotoboy = await createMotoboy({ name, email, password, confirmPassword })
      onMotoboyAdded(newMotoboy)
      resetAndClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível adicionar o motoboy.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={resetAndClose}
      title="Adicionar Novo Motoboy"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Adicionar Motoboy"
      submitLabelLoading="Adicionando..."
      width={420}
    >
      <label>
        Nome do Motoboy
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: João da Silva"
          autoFocus
        />
      </label>
      <label>
        E-mail (acesso ao portal do motoboy)
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="joao@email.com"
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          minLength={8}
        />
      </label>
      <label>
        Confirmar senha
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a senha"
          minLength={8}
        />
      </label>
    </FormModal>
  )
}

function EditMotoboyModal({ isOpen, onRequestClose, motoboy, onMotoboyUpdated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(motoboy?.name || '')
    setEmail(motoboy?.email || '')
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
  }, [motoboy])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError('Nome e e-mail não podem ficar em branco.')
      return
    }
    if (newPassword && newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (newPassword && newPassword !== confirmNewPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const updated = await updateMotoboy(motoboy.id, { newName: name, email, newPassword, confirmNewPassword })
      onMotoboyUpdated(updated)
      onRequestClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível atualizar o motoboy.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Editar Motoboy"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Salvar alterações"
      submitLabelLoading="Salvando..."
      width={420}
    >
      <label>
        Nome do Motoboy
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: João da Silva"
          autoFocus
        />
      </label>
      <label>
        E-mail (acesso ao portal do motoboy)
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="joao@email.com"
        />
      </label>
      <label>
        Nova senha (opcional)
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Deixe em branco para manter a atual"
          minLength={8}
        />
      </label>
      <label>
        Confirmar nova senha
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Repita a nova senha"
          minLength={8}
        />
      </label>
    </FormModal>
  )
}

export function MotoboysView({ user }) {
  const toast = useToast()
  const [motoboys, setMotoboys] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMotoboy, setEditingMotoboy] = useState(null)
  const [deletingMotoboy, setDeletingMotoboy] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })

  const fetchMotoboys = async (pageToLoad = 0) => {
    try {
      setIsLoading(true)
      setError('')
      const data = await getMotoboysPaged(pageToLoad, PAGE_SIZE)
      setMotoboys(data?.content || [])
      setPageInfo({ totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 })
      setPage(pageToLoad)
    } catch (err) {
      setError('Não foi possível carregar os motoboys.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMotoboys(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A lista é ordenada por nome (não por criação), então um motoboy novo
  // pode cair em qualquer página — mais simples recarregar a página atual
  // do zero do que tentar adivinhar onde ele entra no array local.
  const handleMotoboyAdded = (newMotoboy) => {
    toast.success(`Motoboy "${newMotoboy.name}" adicionado.`)
    fetchMotoboys(page)
  }

  const handleMotoboyUpdated = (updatedMotoboy) => {
    setMotoboys((prev) => prev.map((m) => (m.id === updatedMotoboy.id ? updatedMotoboy : m)))
    toast.success('Motoboy atualizado.')
  }

  const requestDelete = (motoboy) => {
    setDeleteError('')
    setDeletingMotoboy(motoboy)
  }

  const confirmDelete = async (password) => {
    if (!deletingMotoboy) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteMotoboy(deletingMotoboy.id, password)
      toast.success('Motoboy excluído.')
      setDeletingMotoboy(null)
      const restantesNaPagina = motoboys.length - 1
      fetchMotoboys(restantesNaPagina <= 0 && page > 0 ? page - 1 : page)
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir o motoboy.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="motoboys-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Gerenciamento de Motoboys</strong>
          <span>Adicione, edite ou remova seus motoboys.</span>
        </div>
        <button className="button button-dark small-button" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Adicionar Motoboy</button>
      </div>

      <div className="panel riders-table">
        <div className="table-scroll" role="table" aria-label="Motoboys">
          <div className="table-header" role="row">
            <span role="columnheader">Nome</span>
            <span role="columnheader">E-mail</span>
            <span role="columnheader">Ações</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={3} />)
          ) : motoboys.length > 0 ? (
            motoboys.map((motoboy) => (
              <div className="table-row" role="row" key={motoboy.id}>
                <strong className="cell-title" role="cell">{motoboy.name}</strong>
                <span role="cell" data-label="E-mail">{motoboy.email || '—'}</span>
                <div className="table-actions" role="cell">
                  <button onClick={() => setEditingMotoboy(motoboy)}><Pencil size={14} /> Editar</button>
                  <button className="delete-button" onClick={() => requestDelete(motoboy)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state"><PackageOpen size={22} />Nenhum motoboy cadastrado.</div>
          )}
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="button button-outline small-button"
              onClick={() => fetchMotoboys(Math.max(page - 1, 0))}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <button
              type="button"
              className="button button-outline small-button"
              onClick={() => fetchMotoboys(Math.min(page + 1, pageInfo.totalPages - 1))}
              disabled={page + 1 >= pageInfo.totalPages}
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      <AddMotoboyModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        onMotoboyAdded={handleMotoboyAdded}
      />
      <EditMotoboyModal
        isOpen={!!editingMotoboy}
        onRequestClose={() => setEditingMotoboy(null)}
        motoboy={editingMotoboy}
        onMotoboyUpdated={handleMotoboyUpdated}
      />
      <ConfirmDialog
        isOpen={!!deletingMotoboy}
        title="Excluir motoboy"
        message={`Tem certeza que deseja excluir ${deletingMotoboy?.name ? `"${deletingMotoboy.name}"` : 'este motoboy'}? Você não pode voltar atrás depois que clicar em confirmar.`}
        isLoading={isDeleting}
        error={deleteError}
        requirePassword
        onCancel={() => setDeletingMotoboy(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
