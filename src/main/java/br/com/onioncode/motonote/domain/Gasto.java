package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

// Gasto de moto (pneu, gasolina, óleo etc.) registrado pelo próprio motoboy —
// só ele pode criar/editar/excluir os seus; o dono da conta só visualiza.
// Índice composto em V7__gasto.sql.
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "gasto")
public class Gasto extends EntidadeComIdAssinalavel {

    private String motoboyId;
    private String descricao;
    private Double value;
    private LocalDate localDate;

    // Key do objeto no bucket PRIVADO do R2 (não a URL — a URL é assinada e
    // expira, precisa ser regerada a cada leitura, ver
    // GastoService.gastoToResponse/R2Gateway.gerarUrlTemporaria). Null
    // enquanto o motoboy não anexou nenhum comprovante nesse gasto.
    private String comprovanteKey;
}
