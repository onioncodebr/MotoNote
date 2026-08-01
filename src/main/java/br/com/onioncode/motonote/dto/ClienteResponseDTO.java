package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResponseDTO {

    private String id;
    private String nome;
    private String telefone;
    private String rua;
    private String numero;
    private String bairro;
    private String cidade;
    private String complemento;
    private Instant criadoEm;
}
