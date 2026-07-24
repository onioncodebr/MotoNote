package com.onioncode.entregas.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AtualizarConfiguracaoDTO {

    @NotNull
    @Positive
    private Integer trialDays;
}
