package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

// Gasto de moto (pneu, gasolina, óleo etc.) registrado pelo próprio motoboy —
// só ele pode criar/editar/excluir os seus; o dono da conta só visualiza.
@CompoundIndex(name = "motoboyId_localDate_idx", def = "{'motoboyId': 1, 'localDate': -1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "gasto")
public class Gasto {

    @Id
    private String id;
    private String motoboyId;
    private String descricao;
    private Double value;
    private LocalDate localDate;

    // Key do objeto no bucket PRIVADO do R2 (não a URL — a URL é assinada e
    // expira, precisa ser regerada a cada leitura, ver
    // GastoService.gastoToResponse/R2Gateway.gerarUrlTemporaria). Null
    // enquanto o motoboy não anexou nenhum comprovante nesse gasto.
    private String comprovanteKey;
}
