package br.com.onioncode.motonote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@AllArgsConstructor
@Data
public class MotoboyResponseDTO {
    private String id;
    private String name;
    private String email;
}
