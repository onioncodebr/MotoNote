import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Users, Download, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react'
import { alterarStatusUsuario, createUsuario, deleteUsuario, getUsuarios, updateUsuario } from '../services/api'
import { exportUsuariosToExcel } from '../services/exportService'
import { formatarDataHora } from '../utils/format'
import { STATUS_LABELS, STATUS_CLASSES } from '../utils/status'
import { ConfirmDialog } from './ConfirmDialog'
import { FormModal } from './FormModal'
import { SkeletonRow } from './Skeleton'
import { useToast } from './Toast'

const ROLES = ['USER', 'ADMIN', 'MASTER']
const STATUS_FILTRO_OPTIONS = ['TRIALING', 'ATIVA', 'INADIMPLENTE', 'CANCELADA', 'INCOMPLETA', 'SEM_ASSINATURA']
const PAGE_SIZE = 20
// Tamanho de página usado só pra varrer tudo na exportação (loop de
// páginas) — maior pra fazer menos requisições, mas ainda limitado no
// backend (MAX_PAGE_SIZE) por segurança.
const EXPORT_PAGE_SIZE = 100

// A API espera/retorna o role em inglês (USER/ADMIN/MASTER); aqui só
// traduzimos o que é exibido pro usuário, sem tocar no contrato com o backend.
const ROLE_LABELS = { USER: 'Usuário', ADMIN: 'Administrador', MASTER: 'Master' }

function roleBadgeClass(role) {
  if (role === 'MASTER') return 'role-badge master'
  if (role === 'ADMIN') return 'role-badge admin'
  return 'role-badge user'
}

function AddUsuarioModal({ isOpen, onRequestClose, onUsuarioAdded }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('USER')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const resetAndClose = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('USER')
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
    setLoading(true)
    setError('')

    try {
      const newUsuario = await createUsuario({ name, email, password, role })
      onUsuarioAdded(newUsuario)
      resetAndClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível criar o usuário.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={resetAndClose}
      title="Adicionar Novo Usuário"
      contentLabel="Adicionar usuário"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Adicionar Usuário"
      submitLabelLoading="Adicionando..."
      width={420}
    >
      <label>
        Nome
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Souza" autoFocus />
      </label>
      <label>
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@email.com" />
      </label>
      <label>
        Senha
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} />
      </label>
      <label>
        Perfil de acesso
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </label>
    </FormModal>
  )
}

function EditUsuarioModal({ isOpen, onRequestClose, usuario, onUsuarioUpdated }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('USER')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(usuario?.name || '')
    setEmail(usuario?.email || '')
    setRole(usuario?.role || 'USER')
    setNewPassword('')
    setError('')
  }, [usuario])

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
    setLoading(true)
    setError('')

    try {
      const updated = await updateUsuario(usuario.email, { name, email, role, newPassword })
      onUsuarioUpdated(usuario.email, updated)
      onRequestClose()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível atualizar o usuário.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      title="Editar Usuário"
      contentLabel="Editar usuário"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitLabel="Salvar alterações"
      submitLabelLoading="Salvando..."
      width={420}
    >
      <label>
        Nome
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Souza" autoFocus />
      </label>
      <label>
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@email.com" />
      </label>
      <label>
        Perfil de acesso
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
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
    </FormModal>
  )
}

export function UsuariosView() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState(null)
  const [deletingUsuario, setDeletingUsuario] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState({ totalPages: 0, totalElements: 0 })
  const [togglingEmail, setTogglingEmail] = useState(null)

  const fetchUsuarios = async (pageToLoad, status) => {
    try {
      setIsLoading(true)
      setError('')
      const data = await getUsuarios(pageToLoad, PAGE_SIZE, status || undefined)
      setUsuarios(data?.content || [])
      setPageInfo({ totalPages: data?.totalPages || 0, totalElements: data?.totalElements || 0 })
      setPage(pageToLoad)
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os usuários.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios(0, statusFiltro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro])

  const handleUsuarioAdded = (newUsuario) => {
    toast.success(`Usuário "${newUsuario.name}" adicionado.`)
    // A listagem é ordenada por mais recente primeiro — o novo usuário cai
    // na primeira página, então recarregamos ela pra ele aparecer.
    fetchUsuarios(0, statusFiltro)
  }

  const handleUsuarioUpdated = (emailAntigo, updatedUsuario) => {
    setUsuarios((prev) => prev.map((u) => (u.email === emailAntigo ? updatedUsuario : u)))
    toast.success('Usuário atualizado.')
  }

  const requestDelete = (usuario) => {
    setDeleteError('')
    setDeletingUsuario(usuario)
  }

  const confirmDelete = async () => {
    if (!deletingUsuario) return
    setIsDeleting(true)
    setDeleteError('')
    try {
      await deleteUsuario(deletingUsuario.email)
      toast.success('Usuário excluído.')
      setDeletingUsuario(null)
      // Se era o último item da página (e não a primeira), volta uma
      // página; senão só recarrega a atual pra puxar o próximo item.
      const restantesNaPagina = usuarios.length - 1
      if (restantesNaPagina <= 0 && page > 0) {
        fetchUsuarios(page - 1, statusFiltro)
      } else {
        fetchUsuarios(page, statusFiltro)
      }
    } catch (err) {
      setDeleteError(err.message || 'Não foi possível excluir o usuário.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Reversível (diferente de excluir), então não passa por ConfirmDialog —
  // só desabilita o botão da própria linha enquanto a chamada está em voo.
  const handleToggleAtivo = async (usuario) => {
    setTogglingEmail(usuario.email)
    try {
      const atualizado = await alterarStatusUsuario(usuario.email, !usuario.ativo)
      setUsuarios((prev) => prev.map((u) => (u.email === usuario.email ? atualizado : u)))
      toast.success(atualizado.ativo ? `"${usuario.name}" reativado.` : `"${usuario.name}" bloqueado.`)
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar o status do usuário.')
    } finally {
      setTogglingEmail(null)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setError('')
    try {
      const primeira = await getUsuarios(0, EXPORT_PAGE_SIZE, statusFiltro || undefined)
      let todos = primeira?.content || []
      const totalPages = primeira?.totalPages || 0
      for (let p = 1; p < totalPages; p++) {
        const pagina = await getUsuarios(p, EXPORT_PAGE_SIZE, statusFiltro || undefined)
        todos = todos.concat(pagina?.content || [])
      }
      await exportUsuariosToExcel(todos)
    } catch (err) {
      setError(err.message || 'Não foi possível exportar os usuários.')
    } finally {
      setIsExporting(false)
    }
  }

  if (error) return <div className="view-error"><AlertTriangle size={22} />{error}</div>

  return (
    <div className="usuarios-view">
      <div className="dashboard-toolbar">
        <div>
          <strong>Gerenciamento de Usuários</strong>
          <span>Área restrita: administre quem tem acesso ao sistema.</span>
        </div>
        <div className="usuarios-toolbar-actions">
          <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} aria-label="Filtrar por status da assinatura">
            <option value="">Todos os status</option>
            {STATUS_FILTRO_OPTIONS.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>
            ))}
          </select>
          <button className="button button-outline small-button" onClick={handleExport} disabled={isExporting || pageInfo.totalElements === 0}>
            <Download size={16} /> {isExporting ? 'Exportando...' : 'Exportar'}
          </button>
          <button className="button button-dark small-button" onClick={() => setIsModalOpen(true)}><Plus size={16} /> Adicionar Usuário</button>
        </div>
      </div>

      <div className="panel">
        <div className="table-scroll" role="table" aria-label="Usuários">
          <div className="table-header usuarios-table-header" role="row">
            <span role="columnheader">Nome</span>
            <span role="columnheader">E-mail</span>
            <span role="columnheader">Telefone</span>
            <span role="columnheader">Criado em</span>
            <span role="columnheader">Perfil</span>
            <span role="columnheader">Assinatura</span>
            <span role="columnheader">Ações</span>
          </div>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cells={7} />)
          ) : usuarios.length > 0 ? (
            usuarios.map((usuario) => (
              <div className="table-row usuarios-table-row" role="row" key={usuario.email}>
                <strong role="cell">{usuario.name}</strong>
                <span role="cell">{usuario.email}</span>
                <span role="cell">{usuario.phone || '—'}</span>
                <span role="cell">{formatarDataHora(usuario.createdAt)}</span>
                <span role="cell">
                  <span className={roleBadgeClass(usuario.role)}>{ROLE_LABELS[usuario.role] || usuario.role}</span>
                  {!usuario.ativo && <span className="plan-badge danger" style={{ marginLeft: 6 }}>Bloqueado</span>}
                </span>
                <span role="cell">
                  {usuario.subscriptionStatus
                    ? <span className={STATUS_CLASSES[usuario.subscriptionStatus] || 'plan-badge neutral'}>{STATUS_LABELS[usuario.subscriptionStatus] || usuario.subscriptionStatus}</span>
                    : '—'}
                </span>
                <div className="table-actions" role="cell">
                  <button onClick={() => setEditingUsuario(usuario)}><Pencil size={14} /> Editar</button>
                  {usuario.role !== 'MASTER' && (
                    <button
                      onClick={() => handleToggleAtivo(usuario)}
                      disabled={togglingEmail === usuario.email}
                    >
                      {usuario.ativo ? <Lock size={14} /> : <Unlock size={14} />}
                      {usuario.ativo ? 'Bloquear' : 'Reativar'}
                    </button>
                  )}
                  <button className="delete-button" onClick={() => requestDelete(usuario)}><Trash2 size={14} /> Excluir</button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state"><Users size={22} />{statusFiltro ? 'Nenhum cliente com esse status.' : 'Nenhum usuário cadastrado.'}</div>
          )}
        </div>
        {!isLoading && pageInfo.totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="button button-outline small-button"
              onClick={() => fetchUsuarios(Math.max(page - 1, 0), statusFiltro)}
              disabled={page === 0}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span>Página {page + 1} de {pageInfo.totalPages}</span>
            <button
              type="button"
              className="button button-outline small-button"
              onClick={() => fetchUsuarios(Math.min(page + 1, pageInfo.totalPages - 1), statusFiltro)}
              disabled={page + 1 >= pageInfo.totalPages}
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <AddUsuarioModal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        onUsuarioAdded={handleUsuarioAdded}
      />
      <EditUsuarioModal
        isOpen={!!editingUsuario}
        onRequestClose={() => setEditingUsuario(null)}
        usuario={editingUsuario}
        onUsuarioUpdated={handleUsuarioUpdated}
      />
      <ConfirmDialog
        isOpen={!!deletingUsuario}
        title="Excluir usuário"
        message={`Tem certeza que deseja excluir ${deletingUsuario?.name ? `"${deletingUsuario.name}"` : 'este usuário'}? Você não pode voltar atrás depois que clicar em confirmar.`}
        isLoading={isDeleting}
        error={deleteError}
        onCancel={() => setDeletingUsuario(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
