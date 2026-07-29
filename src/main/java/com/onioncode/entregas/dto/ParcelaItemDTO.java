package com.onioncode.entregas.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParcelaItemDTO {

    @NotNull
    @Positive
    private Double value;

    // Sem @PastOrPresent de propósito: parcela é um desconto agendado,
    // normalmente numa data futura (ver ValeRequestDTO.date pro contraste).
    @NotNull(message = "A data da parcela é obrigatória")
    private LocalDate date;
}
