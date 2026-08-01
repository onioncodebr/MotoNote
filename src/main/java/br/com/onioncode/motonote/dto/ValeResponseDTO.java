package br.com.onioncode.motonote.dto;

import br.com.onioncode.motonote.domain.StatusVale;
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

    // Nulos pra vale comum — preenchidos só quando faz parte de um
    // parcelamento (ver ValeService.createParcelado).
    private String grupoParcelamento;
    private Integer numeroParcela;
    private Integer totalParcelas;
}
