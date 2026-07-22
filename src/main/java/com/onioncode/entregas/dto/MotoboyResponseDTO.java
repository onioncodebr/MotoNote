package com.onioncode.entregas.dto;

import com.onioncode.entregas.domain.Role;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.annotation.Id;

@AllArgsConstructor
@Data
public class MotoboyResponseDTO {
    private String id;
    private String name;
    private String email;
}
