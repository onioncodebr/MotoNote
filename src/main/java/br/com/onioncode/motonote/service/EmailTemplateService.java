package br.com.onioncode.motonote.service;

import com.samskivert.mustache.Mustache;
import org.springframework.stereotype.Service;

import java.util.Map;

// Renderiza o corpo HTML dos e-mails de código (cadastro/recuperação de
// senha/troca de telefone) a partir de templates/email/*.mustache — só
// "loadTemplate().execute()" de string, sem passar pelo view resolver do
// MVC (os controllers continuam @RestController devolvendo JSON
// normalmente). {{variavel}} do Mustache escapa HTML por padrão, igual o
// th:text do Thymeleaf que ele substituiu (melhorias.md 2.3) — nenhuma das
// variáveis (nome, mensagem, código) vira HTML bruto no e-mail.
@Service
public class EmailTemplateService {

    private final Mustache.Compiler mustacheCompiler;

    public EmailTemplateService(Mustache.Compiler mustacheCompiler) {
        this.mustacheCompiler = mustacheCompiler;
    }

    // Único template reaproveitado pelos três fluxos de código (cadastro,
    // recuperação de senha, troca de telefone) — o que muda entre eles é só
    // a frase de contexto (mensagem) e o código em si.
    public String renderizarCodigo(String nome, String mensagem, String codigo) {
        return render("email/codigo", Map.of("nome", nome, "mensagem", mensagem, "codigo", codigo));
    }

    // Reaproveita o mesmo layout de codigo.mustache, sem o bloco de código —
    // usado pelo aviso de "trial termina amanhã" (ver TrialLembreteService).
    public String renderizarAvisoTrial(String nome, String mensagem) {
        return render("email/trial-terminando", Map.of("nome", nome, "mensagem", mensagem));
    }

    // Notificação interna ao MASTER de que um novo usuário se cadastrou (ver
    // NotificacaoNovoCadastroService) — layout próprio, sem o "Dúvidas? é só
    // responder este e-mail" dos templates voltados ao usuário final.
    public String renderizarNotificacaoCadastro(String nome, String email) {
        return render("email/notificacao-cadastro", Map.of("nome", nome, "email", email));
    }

    private String render(String templateName, Map<String, Object> dados) {
        return mustacheCompiler.loadTemplate(templateName).execute(dados);
    }
}
