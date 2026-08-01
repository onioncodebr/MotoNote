package br.com.onioncode.motonote.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "motoboy")
public class Motoboy extends EntidadeComIdAssinalavel implements UserDetails {

    private String name;

    // Indexado (ver V2__motoboy.sql) porque é o filtro de praticamente toda
    // consulta de motoboy (findByUsuarioId, findByIdAndUsuarioId) — sem isso
    // vira scan completo da tabela conforme a base cresce.
    private String usuarioId;

    // Login próprio do motoboy (Fase de portal do motoboy). Motoboys criados
    // antes dessa mudança ficam com email/password nulos até o dono da conta
    // editá-los preenchendo esses campos — sem migração forçada. Único no
    // schema (V2__motoboy.sql), mas o Postgres trata múltiplos NULL como
    // não-conflitantes, equivalente ao índice "sparse" do Mongo.
    private String email;
    private String password;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_MOTOBOY"));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
