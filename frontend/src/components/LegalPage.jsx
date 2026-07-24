import { ArrowLeft } from 'lucide-react'
import { Logo } from './Logo'

// Chrome compartilhado por Termos e Privacidade: mesmo header/footer da
// landing (ComoUsar segue o mesmo padrão, só que com seções próprias em vez
// desse wrapper — aqui vale a pena porque são 2 páginas quase idênticas em
// estrutura, só o conteúdo muda).
export function LegalPage({ title, updatedAt, onBack, children }) {
  return (
    <div className="landing-page">
      <header className="landing-nav page-width">
        <Logo subtitle />
        <button className="back-home" onClick={onBack}><ArrowLeft size={15} /> Voltar</button>
      </header>
      <main className="page-width legal-content">
        <div className="eyebrow"><span className="eyebrow-dot" /> Documento legal</div>
        <h1>{title}</h1>
        <p className="legal-updated">Última atualização: {updatedAt}</p>
        {children}
      </main>
      <footer className="landing-footer page-width">
        <Logo subtitle />
        <span>© 2026 MotoNote. Gestão que movimenta.</span>
        <span>Copyright by OnionCode</span>
      </footer>
    </div>
  )
}
