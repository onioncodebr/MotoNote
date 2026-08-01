package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// Um evento de visita numa página pública (landing ou tela de criar conta),
// pra métrica de tráfego no Painel Master — ver VisitaPaginaService.
// Registrado sem qualquer dado de identificação do visitante (nem
// IP, nem sessão): só existe pra contagem agregada.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "visita_pagina")
public class VisitaPagina extends EntidadeComIdAssinalavel {

    @Enumerated(EnumType.STRING)
    private TipoVisitaPagina tipo;

    private Instant criadoEm;
}
