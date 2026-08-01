package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GastoResponseDTO {

    private String id;
    private String motoboyId;
    private String descricao;
    private Double value;
    private LocalDate localDate;
    // Link temporário assinado (ver R2Gateway.gerarUrlTemporaria) — não é
    // persistido, calculado a cada leitura; null se não houver comprovante.
    private String comprovanteUrl;
}
