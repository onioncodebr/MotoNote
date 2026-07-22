package com.onioncode.entregas.domain;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "motoboy")
public class Motoboy implements UserDetails {

    @Id
    private String id;
    private String name;

    // Indexado porque é o filtro de praticamente toda consulta de motoboy
    // (findByUsuarioId, findByIdAndUsuarioId) — sem isso vira scan completo
    // da coleção conforme a base cresce.
    @Indexed
    private String usuarioId;

    // Login próprio do motoboy (Fase de portal do motoboy). Motoboys criados
    // antes dessa mudança ficam com email/password nulos até o dono da conta
    // editá-los preenchendo esses campos — sem migração forçada.
    @Indexed(unique = true, sparse = true)
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
