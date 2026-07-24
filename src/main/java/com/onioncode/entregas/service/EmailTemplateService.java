package com.onioncode.entregas.service;

import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

// Renderiza o corpo HTML dos e-mails de código (cadastro/recuperação de
// senha/troca de telefone) a partir de templates/email/*.html — só
// "process()" de string, sem passar pelo view resolver do MVC (os
// controllers continuam @RestController devolvendo JSON normalmente).
@Service
public class EmailTemplateService {

    private final TemplateEngine templateEngine;

    public EmailTemplateService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    // Único template reaproveitado pelos três fluxos de código (cadastro,
    // recuperação de senha, troca de telefone) — o que muda entre eles é só
    // a frase de contexto (mensagem) e o código em si.
    public String renderizarCodigo(String nome, String mensagem, String codigo) {
        Context context = new Context();
        context.setVariable("nome", nome);
        context.setVariable("mensagem", mensagem);
        context.setVariable("codigo", codigo);
        return templateEngine.process("email/codigo", context);
    }
}
