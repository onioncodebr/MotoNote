package com.onioncode.entregas.util;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

// Clamping compartilhado entre os services que expõem listas paginadas
// (Entrega, Usuario) — evita um client pedir uma página gigante e voltar
// ao problema que a paginação existe pra resolver.
public final class PaginacaoUtils {
    public static final int MAX_PAGE_SIZE = 100;

    private PaginacaoUtils() {
    }

    public static Pageable paginaSegura(int page, int size, Sort sort) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);
        return PageRequest.of(safePage, safeSize, sort);
    }
}
