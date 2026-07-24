package com.onioncode.entregas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SolicitarRecuperacaoDTO {

    @NotBlank
    @Email
    private String email;

    // Sem @NotBlank de propósito — ver LoginRequestDTO.captchaToken.
    private String captchaToken;
}
