package com.onioncode.entregas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

// Envelope explícito pra respostas paginadas, em vez de serializar
// org.springframework.data.domain.Page direto (formato verboso e que
// precisa de um módulo Jackson extra pra ficar limpo).
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageResponseDTO<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public static <T> PageResponseDTO<T> from(Page<T> page) {
        return new PageResponseDTO<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
