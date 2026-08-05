import { LegalPage } from './LegalPage'
import { useSeoMeta } from '../utils/seoMeta'

export function Termos({ onBack }) {
  useSeoMeta({
    title: 'Termos de Uso',
    description: 'Termos de uso do MotoNote: cadastro, teste grátis e cobrança, uso aceitável, propriedade dos dados e cancelamento da assinatura.',
    path: '/termos',
  })

  return (
    <LegalPage title="Termos de Uso" updatedAt="29 de julho de 2026" onBack={onBack}>
      <section>
        <h2>1. Quem oferece o serviço</h2>
        <p>
          O MotoNote é oferecido por OnionCode, pessoa responsável pelo
          desenvolvimento e operação do sistema. Para qualquer contato sobre
          estes Termos, escreva para <a href="mailto:contatoonioncode@gmail.com">contatoonioncode@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>2. O que é o MotoNote</h2>
        <p>
          O MotoNote é um sistema de gestão para empresas e pessoas que
          coordenam entregadores (motoboys): registro de entregas, controle
          de gastos e vales, valores pendentes de repasse, relatórios e
          acompanhamento financeiro da operação. Ao criar uma conta, você
          contrata o uso do sistema nos termos descritos aqui.
        </p>
      </section>

      <section>
        <h2>3. Cadastro e contas</h2>
        <p>
          Quem cria a conta principal (dono da operação) é responsável pela
          veracidade dos dados informados e pela guarda da própria senha. Além
          da conta principal, existe o acesso de <strong>motoboy</strong>{' '}
          (restrito, criado pelo dono da operação).
        </p>
        <p>
          O acesso de cada motoboy (e-mail e senha) é criado e gerenciado
          pelo dono da conta — o motoboy não se autocadastra. É
          responsabilidade do dono da conta obter, quando aplicável, o
          consentimento do motoboy para o registro desses dados no sistema, e
          garantir que as informações inseridas sobre ele são corretas.
        </p>
        <p>
          O sistema também permite, opcionalmente, cadastrar{' '}
          <strong>clientes</strong> (nome, telefone e endereço de quem recebe
          as entregas) — um terceiro sem conta nem login no MotoNote. Ao usar
          esse cadastro, você é o responsável (controlador) por esses dados
          perante o seu cliente final: garantir que o registro é legítimo,
          que as informações são corretas e, quando a lei exigir, que há
          base legal ou consentimento para o tratamento.
        </p>
      </section>

      <section>
        <h2>4. Teste grátis e cobrança</h2>
        <p>
          Novas contas têm um período de teste gratuito (hoje, 15 dias). O
          cartão é solicitado no momento do cadastro, mas nenhuma cobrança é
          feita durante o teste. Se você cancelar antes do fim do período, não
          paga nada. Se não cancelar, a cobrança do plano mensal começa
          automaticamente ao fim do teste, e se repete a cada ciclo até que a
          assinatura seja cancelada.
        </p>
        <p>
          O pagamento é processado pelo Stripe. O MotoNote não recebe nem
          armazena dados do seu cartão — veja detalhes na nossa{' '}
          <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.
          Cancelamento, troca de forma de pagamento e histórico de cobranças
          ficam disponíveis a qualquer momento pelo Portal do Cliente do
          Stripe, acessível pela tela de Assinatura dentro do sistema.
        </p>
      </section>

      <section>
        <h2>5. Uso aceitável</h2>
        <p>Ao usar o MotoNote, você concorda em não:</p>
        <ul>
          <li>Tentar acessar dados, contas ou operações de terceiros sem autorização;</li>
          <li>Usar o sistema para armazenar ou processar dados ilícitos, ou para fins que violem a lei;</li>
          <li>Tentar contornar limites técnicos do sistema (engenharia reversa, automação abusiva, sobrecarga proposital);</li>
          <li>Repassar seu login de acesso a terceiros não autorizados pela sua operação.</li>
        </ul>
      </section>

      <section>
        <h2>6. Propriedade dos dados e do software</h2>
        <p>
          O software (código, design, marca MotoNote) pertence à OnionCode.
          Os dados que você insere — entregas, motoboys, gastos, vales,
          relatórios — são seus. Você pode exportar seus relatórios pelo
          próprio sistema a qualquer momento, e pode pedir a exclusão da sua
          conta e dos seus dados conforme descrito na Política de
          Privacidade.
        </p>
      </section>

      <section>
        <h2>7. Disponibilidade e suporte</h2>
        <p>
          Fazemos o possível para manter o MotoNote disponível de forma
          contínua, mas não garantimos operação ininterrupta — manutenções,
          falhas de infraestrutura ou de terceiros (como o próprio Stripe)
          podem causar indisponibilidade temporária. Dúvidas e suporte:
          pelo WhatsApp indicado no sistema ou por{' '}
          <a href="mailto:contatoonioncode@gmail.com">contatoonioncode@gmail.com</a>.
        </p>
      </section>

      <section>
        <h2>8. Cancelamento</h2>
        <p>
          Você pode cancelar sua assinatura a qualquer momento pelo Portal do
          Cliente do Stripe. O cancelamento interrompe cobranças futuras; não
          gera reembolso de período já pago, salvo obrigação legal em
          contrário. Você também pode pedir o encerramento completo da conta
          e a exclusão dos dados a qualquer momento, pelos contatos acima.
        </p>
      </section>

      <section>
        <h2>9. Limitação de responsabilidade</h2>
        <p>
          O MotoNote é uma ferramenta de apoio à gestão da sua operação. A
          exatidão dos dados lançados (valores de entrega, gastos, vales)
          depende de quem os registra. A OnionCode não se responsabiliza por
          decisões financeiras ou operacionais tomadas com base em dados
          incorretos inseridos por você ou pela sua equipe, nem por perdas
          decorrentes de indisponibilidade temporária do serviço.
        </p>
      </section>

      <section>
        <h2>10. Alterações nestes Termos</h2>
        <p>
          Podemos atualizar estes Termos para refletir mudanças no sistema ou
          na lei. Mudanças relevantes serão comunicadas dentro do próprio
          sistema. O uso continuado do MotoNote após uma atualização
          significa que você concorda com os novos termos.
        </p>
      </section>

      <section>
        <h2>11. Lei aplicável</h2>
        <p>
          Estes Termos são regidos pelas leis do Brasil.
        </p>
      </section>
    </LegalPage>
  )
}
