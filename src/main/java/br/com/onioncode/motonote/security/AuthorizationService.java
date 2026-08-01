package br.com.onioncode.motonote.security;

import br.com.onioncode.motonote.repository.MotoboyRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;


@Service
public class AuthorizationService implements UserDetailsService {

    private final UsuarioRepo userRepo;
    private final MotoboyRepo motoboyRepo;

    public AuthorizationService(UsuarioRepo userRepo, MotoboyRepo motoboyRepo) {
        this.userRepo = userRepo;
        this.motoboyRepo = motoboyRepo;
    }

    // Dois tipos de principal podem logar com o mesmo /api/auth/login: o
    // dono da conta (Usuario) e, agora, um Motoboy com email/senha próprios
    // (portal restrito). Tenta Usuario primeiro (é o caso mais comum), só
    // cai pra Motoboy se não achar.
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // UsernameNotFoundException, não BadCredentialsException: é o tipo que
        // o contrato de UserDetailsService espera daqui, e o único que o
        // DaoAuthenticationProvider deixa passar sem reembrulhar numa
        // InternalAuthenticationServiceException — usar BadCredentialsException
        // aqui fazia login com e-mail inexistente virar 500 (catch-all
        // genérico) em vez do 401 esperado (ver GlobalExceptionHandler).
        return userRepo.findByEmail(email)
                .<UserDetails>map(u -> u)
                .or(() -> motoboyRepo.findByEmail(email).map(m -> m))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario inexistente ou senha incorreta"));
    }
}
