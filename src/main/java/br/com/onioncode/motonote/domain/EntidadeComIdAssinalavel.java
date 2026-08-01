package br.com.onioncode.motonote.domain;

import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Transient;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.Persistable;

import java.util.UUID;

// Base pra todas as entidades com id String "assinalável": um UUID novo é
// gerado por padrão (uso normal da aplicação — signup, criar motoboy/
// cliente/entrega etc.), mas a rotina de importação do backup Mongo (ver
// migration/) sobrescreve esse valor com o ObjectId original logo após o
// "new", preservando os relacionamentos entre as tabelas sem remapeamento.
//
// Implementa Persistable<String> por um motivo concreto: o Spring Data JPA
// decide entre INSERT (persist) e UPDATE (merge) olhando isNew() — cujo
// padrão, pra um id String sem @GeneratedValue, é simplesmente "id == null?".
// Como aqui o id NUNCA é null (o campo já nasce com um UUID), esse padrão
// sempre concluiria "não é novo" e tentaria um UPDATE mesmo em entidades
// recém-criadas, falhando (0 linhas afetadas) porque a linha ainda não
// existe. O flag `novo` (true até a entidade ser carregada do banco ou
// persistida com sucesso, via @PostLoad/@PostPersist) resolve isso de forma
// explícita, sem depender de heurística nenhuma do Hibernate.
@MappedSuperclass
@Getter
@Setter
@EqualsAndHashCode(of = "id")
public abstract class EntidadeComIdAssinalavel implements Persistable<String> {

    @Id
    private String id = UUID.randomUUID().toString();

    @Transient
    private boolean novo = true;

    @Override
    public boolean isNew() {
        return novo;
    }

    @PostLoad
    @PostPersist
    void marcarComoExistente() {
        this.novo = false;
    }
}
