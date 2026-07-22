package com.onioncode.entregas.dto;


import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AlterarSenhaDTO {
    @NotBlank
    @Size(min = 8)
    private String newPassword;
    @NotBlank
    @Size(min = 8)
    private String actualPassword;
}
