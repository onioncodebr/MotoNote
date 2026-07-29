package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Um evento de visita numa página pública (landing ou tela de criar conta),
// pra métrica de tráfego no Painel Master — ver VisitaPaginaService.
// Registrado sem qualquer dado de identificação do visitante (nem
// IP, nem sessão): só existe pra contagem agregada.
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "visita_pagina")
public class VisitaPagina {

    @Id
    private String id;

    @Indexed
    private TipoVisitaPagina tipo;

    @Indexed
    private Instant criadoEm;
}
