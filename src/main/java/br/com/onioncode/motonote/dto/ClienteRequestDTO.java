package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Reaproveitado tanto pra criar quanto pra editar — diferente do caso
// Motoboy (que separa DTO de update por causa de senha), Cliente não tem
// campo sensível nenhum.
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClienteRequestDTO {

    private String id;

    @NotBlank
    private String nome;
    @NotBlank
    private String telefone;

    // Endereço estruturado — rua/numero/bairro/cidade obrigatórios,
    // complemento opcional (sem @NotBlank).
    @NotBlank
    private String rua;
    @NotBlank
    private String numero;
    @NotBlank
    private String bairro;
    @NotBlank
    private String cidade;
    private String complemento;
}
