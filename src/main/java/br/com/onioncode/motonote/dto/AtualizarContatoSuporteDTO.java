package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AtualizarContatoSuporteDTO {

    private String whatsapp;

    @Email
    private String email;
}
