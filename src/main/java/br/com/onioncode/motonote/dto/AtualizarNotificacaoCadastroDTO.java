package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AtualizarNotificacaoCadastroDTO {

    private boolean habilitado;

    @Email
    private String email;
}
