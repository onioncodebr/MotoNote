package br.com.onioncode.motonote.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RevogarManualDTO {

    @NotBlank
    private String usuarioId;
}
