import { ShieldCheck } from 'lucide-react'
import { LegalPage } from './LegalPage'
import { useSeoMeta } from '../utils/seoMeta'

export function Privacidade({ onBack }) {
  useSeoMeta({
    title: 'Política de Privacidade',
    description: 'Política de privacidade do MotoNote: quais dados coletamos, para quê, e quais direitos você tem sobre eles, conforme a LGPD.',
    path: '/privacidade',
  })

  return (
    <LegalPage title="Política de Privacidade" updatedAt="29 de julho de 2026" onBack={onBack}>
      <section>
        <h2>1. Quem trata seus dados</h2>
        <p>
          O MotoNote é operado por OnionCode. Esta política explica quais
          dados coletamos, para quê, e quais direitos você tem sobre eles,
          conforme a Lei Geral de Proteção de Dados (LGPD). Contato para
          qualquer assunto de privacidade:{' '}
          <a href="mailto:contatoonioncode@gmail.com">contatoonioncode@gmail.com</a>.
        </p>
      </section>

      <section className="privacy-highlight">
        <span className="privacy-highlight-icon"><ShieldCheck size={20} /></span>
        <div>
          <strong>Sobre o seu cartão: nós nunca vemos nem guardamos esse dado.</strong>
          <p>
            O número do seu cartão, validade e código de segurança são
            digitados direto numa página segura do Stripe (nosso processador
            de pagamentos) e nunca passam pelos nossos servidores. O MotoNote
            recebe do Stripe apenas um identificador de cliente/assinatura e
            o status do pagamento — o suficiente para saber se sua assinatura
            está ativa, nada além disso.
          </p>
        </div>
      </section>

      <section>
        <h2>2. Quais dados coletamos</h2>
        <p><strong>Da conta que você cria (dono da operação):</strong> nome, e-mail, telefone (opcional) e senha — a senha nunca fica salva em texto puro, é armazenada com hash (BCrypt), então nem nós conseguimos ler a senha original.</p>
        <p><strong>Dos motoboys que você cadastra:</strong> nome e, se quiser dar acesso ao portal do motoboy, e-mail e senha (também com hash) — esses dados são inseridos e geridos por você, dono da conta, não pelo motoboy diretamente.</p>
        <p><strong>Dos clientes que você cadastra (opcional):</strong> se você usar o cadastro de clientes, nome, telefone e endereço (rua, número, bairro, cidade, complemento) de quem recebe as entregas — dados de terceiros que não têm conta nem login no MotoNote, inseridos e geridos por você, dono da conta. É sua responsabilidade, como controlador desses dados junto ao seu cliente final, garantir que o registro dessas informações é legítimo.</p>
        <p><strong>Dados operacionais da sua empresa:</strong> os registros que você lança no sistema — entregas (valor, data, motoboy, forma de pagamento, status), gastos, vales e valores pendentes de repasse.</p>
        <p><strong>Foto de perfil e comprovante de gasto (opcional):</strong> se você ou seus motoboys enviarem uma foto de perfil ou o comprovante de um gasto, essas imagens ficam armazenadas na Cloudflare R2 (ver seção 4).</p>
        <p><strong>Dados de assinatura:</strong> status do plano (em teste, ativo, cancelado etc.) e os identificadores que o Stripe usa pra referenciar seu cliente e sua assinatura — nunca dados de cartão (ver destaque acima).</p>
      </section>

      <section>
        <h2>3. Como usamos esses dados</h2>
        <ul>
          <li>Para operar o sistema: autenticar seu login, mostrar seus dados de entregas/gastos/vales, gerar relatórios;</li>
          <li>Para gerenciar sua assinatura junto ao Stripe (cobrança, status do trial, portal de gerenciamento);</li>
          <li>Para dar suporte quando você entra em contato;</li>
          <li>Para cumprir obrigações legais, quando aplicável.</li>
        </ul>
        <p>Não usamos seus dados para publicidade, não vendemos dados a terceiros, e não existe nenhum script de análise/rastreamento de terceiros (como Google Analytics ou pixels de redes sociais) rodando no MotoNote.</p>
      </section>

      <section>
        <h2>4. Com quem compartilhamos</h2>
        <p>Usamos os seguintes processadores terceiros, cada um só para o necessário ao seu propósito específico:</p>
        <ul>
          <li><strong>Stripe</strong> — processamento de pagamento e gestão da assinatura (nome, e-mail e os dados de pagamento que você fornece diretamente a eles; nunca dados de cartão, ver destaque acima).</li>
          <li><strong>Resend</strong> — envio dos e-mails transacionais do sistema (código de cadastro, recuperação de senha, troca de telefone, aviso de fim de teste grátis): recebe nome e e-mail do destinatário.</li>
          <li><strong>Cloudflare Turnstile</strong> — verificação anti-automação no cadastro, login e recuperação de senha, pra dificultar abuso e ataques automatizados.</li>
          <li><strong>Cloudflare R2</strong> — armazenamento de foto de perfil e de comprovante de gasto, quando enviados.</li>
        </ul>
        <p>
          Não compartilhamos seus dados operacionais (entregas, gastos,
          vales, dados de motoboys, dados de clientes) com nenhum terceiro
          além dos listados acima, e só na medida do que cada um precisa pra
          cumprir sua função.
        </p>
      </section>

      <section>
        <h2>5. Cookies e sessão</h2>
        <p>
          Usamos um único cookie, necessário para você continuar logado
          entre uma página e outra: um token de sessão (JWT), marcado como{' '}
          <code>httpOnly</code> (nenhum script no navegador consegue lê-lo,
          o que reduz o risco de roubo de sessão) e, em produção, também{' '}
          <code>Secure</code> (só trafega em conexão HTTPS). Não usamos
          cookies de rastreamento nem de publicidade.
        </p>
      </section>

      <section>
        <h2>6. Segurança</h2>
        <ul>
          <li>Senhas armazenadas com hash BCrypt, nunca em texto puro;</li>
          <li>Conexão HTTPS entre você e o MotoNote em produção;</li>
          <li>Cookie de sessão httpOnly e Secure em produção;</li>
          <li>Dados de cartão nunca chegam aos nossos servidores — ficam só com o Stripe.</li>
        </ul>
      </section>

      <section>
        <h2>7. Por quanto tempo guardamos seus dados</h2>
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Se você pedir
          o encerramento da conta, apagamos os dados pessoais associados a
          ela, respeitando prazos que a lei eventualmente exija manter (por
          exemplo, obrigações fiscais ligadas a cobranças já feitas).
        </p>
      </section>

      <section>
        <h2>8. Seus direitos (LGPD)</h2>
        <p>Você pode, a qualquer momento, pedir:</p>
        <ul>
          <li>Confirmação de quais dados seus tratamos;</li>
          <li>Acesso a esses dados;</li>
          <li>Correção de dados incompletos, desatualizados ou incorretos;</li>
          <li>Exclusão dos seus dados (encerramento de conta);</li>
          <li>Portabilidade dos seus dados a outro fornecedor.</li>
        </ul>
        <p>
          Para exercer qualquer um desses direitos, escreva para{' '}
          <a href="mailto:contatoonioncode@gmail.com">contatoonioncode@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>9. Menores de idade</h2>
        <p>
          O MotoNote é uma ferramenta de gestão empresarial (B2B), não
          direcionada a crianças ou adolescentes.
        </p>
      </section>

      <section>
        <h2>10. Alterações nesta política</h2>
        <p>
          Podemos atualizar esta política para refletir mudanças no sistema
          ou na legislação. Mudanças relevantes serão comunicadas dentro do
          próprio sistema.
        </p>
      </section>
    </LegalPage>
  )
}
