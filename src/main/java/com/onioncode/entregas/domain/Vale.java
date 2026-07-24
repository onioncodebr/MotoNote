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
}
