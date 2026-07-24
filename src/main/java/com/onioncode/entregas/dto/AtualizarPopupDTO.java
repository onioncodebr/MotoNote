package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AtualizarPopupDTO {

    private boolean habilitado;
    private String titulo;
    private String descricao;
    private String botaoTexto;
    private String botaoUrl;
}
