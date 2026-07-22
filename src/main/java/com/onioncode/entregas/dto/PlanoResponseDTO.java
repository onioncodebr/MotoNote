package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Info pública do plano (preço + duração do trial), usada na landing page e
// no cadastro pra mostrar o valor real configurado no Stripe em vez de um
// texto fixo que ficaria desatualizado se o preço mudar por lá.
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PlanoResponseDTO {
    private double valorMensal;
    private String moeda;
    private int trialDays;
}
