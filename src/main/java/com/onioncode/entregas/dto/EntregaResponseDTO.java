package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.FormaPagamento;
import com.onioncode.entregas.domain.StatusRecebimento;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntregaResponseDTO {

    private String id;
    private Double value;
    private LocalDate localDate;
    private String motoboyId;
    private FormaPagamento formaPagamento;
    private StatusRecebimento status;
    private Double valorPedido;
}
