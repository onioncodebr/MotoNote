package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

// Vale: adiantamento de pagamento ou produto a descontar do motoboy. Quem
// cria/edita/exclui é sempre o dono da conta; o motoboy só visualiza os
// seus (ver MotoboyPortalController).
@CompoundIndex(name = "motoboyId_localDate_idx", def = "{'motoboyId': 1, 'localDate': -1}")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "vale")
public class Vale {

    @Id
    private String id;
    private String motoboyId;
    private String descricao;
    private Double value;
    private StatusVale status;
    private LocalDate localDate;

    // Preenchidos só quando este vale nasceu de um parcelamento (ver
    // ValeService.createParcelado) — null pra vale comum. Cada parcela é um
    // Vale independente (pode ser editada/excluída/concluída sem afetar as
    // outras); esses campos existem só pra amarrar visualmente o grupo.
    private String grupoParcelamento;
    private Integer numeroParcela;
    private Integer totalParcelas;
}
