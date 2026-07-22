package com.onioncode.entregas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaRequestDTO {

    @NotNull
    @Positive
    private Double value;
    @NotBlank
    private String motoboyId;

    // Opcional: data em que a entrega foi realizada. Quando não informada, o
    // backend assume a data atual (comportamento anterior). Não pode ser no
    // futuro — um erro de digitação no ano (2026 -> 2062) não deve poluir
    // silenciosamente os relatórios e os gráficos.
    @PastOrPresent(message = "A data da entrega não pode estar no futuro.")
    private LocalDate date;
}
