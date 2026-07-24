package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MotoboyMasterResponseDTO {

    private String id;
    private String name;
    private String email;
    private String usuarioId;
    private String nomeEmpresa;
}
