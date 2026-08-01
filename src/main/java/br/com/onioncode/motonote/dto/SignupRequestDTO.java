package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Cadastro público: propositalmente sem campo "role" — todo cadastro
// autoatendido vira role USER, fixado em UsuarioService.signup().
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignupRequestDTO {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    // Opcional — não usado pra login, só um contato a mais (ex.: suporte via WhatsApp).
    private String phone;

    @NotBlank
    @Size(min = 8)
    private String password;

    @NotBlank
    private String confirmPassword;

    // Sem @NotBlank de propósito — ver LoginRequestDTO.captchaToken.
    private String captchaToken;
}
