package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConfirmarCadastroDTO {

    @NotBlank
    @Email
    private String email;

    // O código gerado (CodigoUtils.gerarCodigo) é sempre 6 dígitos — rejeita
    // aqui, antes de chegar no service, qualquer coisa fora desse formato.
    @NotBlank
    @Pattern(regexp = "\\d{6}")
    private String codigo;
}
