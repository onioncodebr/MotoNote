package com.onioncode.entregas.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConcederManualDTO {

    @NotBlank
    private String usuarioId;

    @NotNull
    @Positive
    private Integer diasCortesia;
}
