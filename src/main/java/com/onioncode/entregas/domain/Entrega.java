package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

// Índice composto cobre tanto a listagem simples por motoboyId (prefixo do
// índice) quanto as consultas por intervalo de data, já na ordem usada pela
// paginação (mais recente primeiro).
@CompoundIndex(name = "motoboyId_localDate_idx", def = "{'motoboyId': 1, 'localDate': -1}")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Data
@Document(collection = "entrega")
public class Entrega {

    @Id
    private String id;
    private Double value;
    private LocalDate localDate;
    private String motoboyId;
}
