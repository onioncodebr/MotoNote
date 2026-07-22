package com.onioncode.entregas.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMotoboyDTO {


    @NotBlank
    private String id;
    @NotBlank
    private String newName;

    @NotBlank
    @Email
    private String email;

    // Opcionais: só troca a senha se vierem preenchidos (mínimo 8
    // caracteres). Deixar em branco/nulo mantém a senha atual.
    @Size(min = 8)
    private String newPassword;
    private String confirmNewPassword;
}
