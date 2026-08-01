package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConfirmarAlteracaoTelefoneDTO {

    // Ver ConfirmarCadastroDTO.codigo — sempre 6 dígitos.
    @NotBlank
    @Pattern(regexp = "\\d{6}")
    private String codigo;
}
