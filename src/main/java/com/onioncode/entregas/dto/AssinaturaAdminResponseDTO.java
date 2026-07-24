package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.StatusAssinatura;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@Data
@AllArgsConstructor
public class AssinaturaAdminResponseDTO {

    private String usuarioId;
    private String nomeEmpresa;
    private String emailEmpresa;
    private StatusAssinatura status;
    private Instant trialTerminaEm;
    private Instant periodoAtualTerminaEm;
    private Instant criadoEm;
}
