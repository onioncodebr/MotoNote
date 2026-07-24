package com.onioncode.entregas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class LoginRequestDTO {
    @NotBlank
    @Email
    private String email;
    @NotBlank
    @Size(min = 8)
    private String password;

    // Sem @NotBlank de propósito: enquanto TURNSTILE_SECRET_KEY não estiver
    // configurada no backend, a validação é no-op (ver TurnstileGateway) —
    // exigir o campo aqui quebraria login pra quem ainda não atualizou o
    // frontend com o widget.
    private String captchaToken;
}
