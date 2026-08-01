package br.com.onioncode.motonote.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValeParceladoRequestDTO {

    @NotBlank
    private String motoboyId;

    @NotBlank(message = "A descrição é obrigatória")
    private String descricao;

    @NotEmpty
    @Size(min = 2, message = "Informe pelo menos 2 parcelas.")
    private List<@Valid ParcelaItemDTO> parcelas;
}
