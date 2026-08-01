package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Contagem por status logístico no período — alimenta o badge de cada aba
// da tela "Entregas Pendentes" (dentro de "Entregas").
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ContagemStatusLogisticoDTO {
    private long naLoja;
    private long emRota;
    private long naoEntregue;
    private long entregue;
}
