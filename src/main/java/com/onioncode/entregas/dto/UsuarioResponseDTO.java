package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.StatusAssinatura;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.Instant;

@AllArgsConstructor
@Data
public class UsuarioResponseDTO {

    private String name;
    private String email;
    private String phone;
    private Role role;
    private Instant createdAt;
    // Null pra MASTER (dono do sistema, não é assinante — ver AssinaturaService.statusAtual).
    private StatusAssinatura subscriptionStatus;
    private boolean ativo;
    private String fotoUrl;

}
