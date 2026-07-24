package com.onioncode.entregas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GastoRequestDTO {

    @NotBlank(message = "A descrição é obrigatória")
    private String descricao;

    @NotNull
    @Positive
    private Double value;

    // Opcional: quando não informada, o backend assume a data atual.
    @PastOrPresent(message = "A data do gasto não pode estar no futuro.")
    private LocalDate date;
}
