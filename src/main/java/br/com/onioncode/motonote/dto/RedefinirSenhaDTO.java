package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RedefinirSenhaDTO {

    @NotBlank
    @Email
    private String email;

    // Ver ConfirmarCadastroDTO.codigo — sempre 6 dígitos.
    @NotBlank
    @Pattern(regexp = "\\d{6}")
    private String codigo;

    @NotBlank
    @Size(min = 8)
    private String novaSenha;

    @NotBlank
    private String confirmarNovaSenha;
}
