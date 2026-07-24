package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

// Um ponto de uma série temporal diária — reaproveitado por qualquer gráfico
// "quantidade por dia" do Painel Master (novos cadastros, entregas
// processadas). Dias sem nenhum evento entram com quantidade 0 (o backend
// preenche os buracos), pra o gráfico não pular datas.
@Data
@AllArgsConstructor
public class PontoSerieDTO {

    private LocalDate data;
    private long quantidade;
}
