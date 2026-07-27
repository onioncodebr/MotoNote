import { useState } from 'react'
import Modal from 'react-modal'
import { X, ArrowRight } from 'lucide-react'
import { getModalStyles, MODAL_CLOSE_TIMEOUT_MS, modalParentSelector } from './modalStyles'
import { IconButton } from './IconButton'

const modalStyles = getModalStyles(420)
const CHAVE_LOCALSTORAGE = 'popupVersaoVista'

// Anúncio de novidade configurado pelo MASTER (ConfiguracaoGlobalView).
// Aparece uma vez por "versão" publicada (popupVersao, incrementada a cada
// save no backend) — fechar (X ou "Saiba mais") grava a versão vista no
// localStorage, então não volta a aparecer até o MASTER publicar de novo.
export function NovidadePopup({ config }) {
  // localStorage sozinho não dispara re-render — sem esse state, fechar o
  // popup gravava a versão vista mas o componente continuava montado com o
  // mesmo resultado de render, então o modal nunca sumia da tela.
  const [dispensado, setDispensado] = useState(false)

  if (!config?.popupHabilitado) return null

  const versaoVista = Number(localStorage.getItem(CHAVE_LOCALSTORAGE) || 0)
  // isOpen (em vez de um "return null" cobrindo esses casos também) mantém o
  // <Modal> montado quando dispensa — só assim o closeTimeoutMS consegue
  // tocar a transição de saída antes de desmontar. Um "return null" aqui
  // desmontaria o <Modal> na hora, ignorando o timeout por completo.
  const aberto = !dispensado && config.popupVersao !== versaoVista

  const dispensar = () => {
    localStorage.setItem(CHAVE_LOCALSTORAGE, String(config.popupVersao))
    setDispensado(true)
  }

  return (
    <Modal
      isOpen={aberto}
      style={modalStyles}
      contentLabel={config.popupTitulo}
      onRequestClose={dispensar}
      closeTimeoutMS={MODAL_CLOSE_TIMEOUT_MS}
      parentSelector={modalParentSelector}
    >
      <div className="modal-header">
        <h2>{config.popupTitulo}</h2>
        <IconButton icon={X} onClick={dispensar} aria-label="Fechar" />
      </div>
      <p className="confirm-dialog-message">{config.popupDescricao}</p>
      {config.popupBotaoUrl && (
        <div className="form-actions">
          <a
            className="button button-dark small-button"
            href={config.popupBotaoUrl}
            target="_blank"
            rel="noreferrer"
            onClick={dispensar}
          >
            {config.popupBotaoTexto || 'Saiba mais'} <ArrowRight size={15} />
          </a>
        </div>
      )}
    </Modal>
  )
}
