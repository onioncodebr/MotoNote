package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.StatusVale;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValeResponseDTO {

    private String id;
    private String motoboyId;
    private String descricao;
    private Double value;
    private StatusVale status;
    private LocalDate localDate;
}
