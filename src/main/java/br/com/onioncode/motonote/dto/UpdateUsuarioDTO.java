package br.com.onioncode.motonote.dto;

import br.com.onioncode.motonote.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUsuarioDTO {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;

    @NotNull
    private Role role;

    // Opcional: só troca a senha se vier preenchida (mínimo 8 caracteres).
    // Deixar em branco/nulo mantém a senha atual.
    @Size(min = 8)
    private String newPassword;
}
