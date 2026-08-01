package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AtualizarBannerDTO {

    private boolean habilitado;
    private String mensagem;
}
