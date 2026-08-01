package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AssinaturaResponseDTO {
    private String status;
    private Instant trialTerminaEm;
    private Instant periodoAtualTerminaEm;
    private boolean temAcessoLiberado;
}
