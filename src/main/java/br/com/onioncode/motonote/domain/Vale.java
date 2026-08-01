package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

// Vale: adiantamento de pagamento ou produto a descontar do motoboy. Quem
// cria/edita/exclui é sempre o dono da conta; o motoboy só visualiza os
// seus (ver MotoboyPortalController). Índice composto em V6__vale.sql.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "vale")
public class Vale extends EntidadeComIdAssinalavel {

    private String motoboyId;
    private String descricao;
    private Double value;
    @Enumerated(EnumType.STRING)
    private StatusVale status;
    private LocalDate localDate;

    // Preenchidos só quando este vale nasceu de um parcelamento (ver
    // ValeService.createParcelado) — null pra vale comum. Cada parcela é um
    // Vale independente (pode ser editada/excluída/concluída sem afetar as
    // outras); esses campos existem só pra amarrar visualmente o grupo.
    private String grupoParcelamento;
    private Integer numeroParcela;
    private Integer totalParcelas;
}
