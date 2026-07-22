package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CheckoutSessionResponseDTO {
    private String checkoutUrl;
}
