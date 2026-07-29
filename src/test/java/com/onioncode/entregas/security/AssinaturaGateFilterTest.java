package com.onioncode.entregas.security;

import com.onioncode.entregas.domain.Motoboy;
import com.onioncode.entregas.domain.Role;
import com.onioncode.entregas.domain.Usuario;
import com.onioncode.entregas.service.AssinaturaService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// Cobre o gate de assinatura (melhorias.md 1.5) — bloqueia (402) quem não
// tem assinatura ativa/trialing de acessar rotas de negócio, com as
// isenções corretas (MASTER, motoboy avaliado pela assinatura da empresa,
// rotas que precisam funcionar mesmo bloqueado).
@ExtendWith(MockitoExtension.class)
class AssinaturaGateFilterTest {

    @Mock
    private AssinaturaService assinaturaService;

    @AfterEach
    void limparContextoDeSeguranca() {
        SecurityContextHolder.clearContext();
    }

    private void autenticarComo(Object principal) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
    }

    private static Usuario usuario(String id, Role role) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setRole(role);
        return usuario;
    }

    private static Motoboy motoboy(String id, String usuarioIdDaEmpresa) {
        Motoboy motoboy = new Motoboy();
        motoboy.setId(id);
        motoboy.setUsuarioId(usuarioIdDaEmpresa);
        return motoboy;
    }

    private record Resultado(MockHttpServletResponse response, MockFilterChain chain) {
        boolean passouPelaChain() {
            return chain.getRequest() != null;
        }
    }

    private Resultado executar(String path, String method) throws Exception {
        AssinaturaGateFilter filter = new AssinaturaGateFilter(assinaturaService);
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return new Resultado(response, chain);
    }

    @Test
    void masterSempreTemAcessoMesmoSemAssinatura() throws Exception {
        autenticarComo(usuario("master-1", Role.MASTER));

        Resultado resultado = executar("/api/entregas", "GET");

        assertThat(resultado.passouPelaChain()).isTrue();
        verifyNoInteractions(assinaturaService);
    }

    @Test
    void usuarioComAcessoLiberadoPassa() throws Exception {
        autenticarComo(usuario("usuario-1", Role.USER));
        when(assinaturaService.temAcessoLiberado("usuario-1")).thenReturn(true);

        Resultado resultado = executar("/api/entregas", "GET");

        assertThat(resultado.passouPelaChain()).isTrue();
    }

    @Test
    void usuarioSemAcessoLiberadoRecebe402ComMensagemPadrao() throws Exception {
        autenticarComo(usuario("usuario-1", Role.USER));
        when(assinaturaService.temAcessoLiberado("usuario-1")).thenReturn(false);

        Resultado resultado = executar("/api/entregas", "GET");

        assertThat(resultado.passouPelaChain()).isFalse();
        assertThat(resultado.response().getStatus()).isEqualTo(402);
        assertThat(resultado.response().getContentAsString())
                .contains("\"status\":402")
                .contains("Sua assinatura está inativa");
    }

    // Motoboy não tem assinatura própria — é gateado pela assinatura da
    // EMPRESA que o cadastrou (usuarioId), não pelo seu próprio id.
    @Test
    void motoboyEChecadoPelaAssinaturaDaEmpresaQueOCadastrou() throws Exception {
        autenticarComo(motoboy("motoboy-1", "usuario-dono-1"));
        when(assinaturaService.temAcessoLiberado("usuario-dono-1")).thenReturn(true);

        Resultado resultado = executar("/api/entregas", "GET");

        assertThat(resultado.passouPelaChain()).isTrue();
    }

    @Test
    void motoboyDeEmpresaSemAcessoLiberadoRecebe402() throws Exception {
        autenticarComo(motoboy("motoboy-1", "usuario-dono-1"));
        when(assinaturaService.temAcessoLiberado("usuario-dono-1")).thenReturn(false);

        Resultado resultado = executar("/api/entregas", "GET");

        assertThat(resultado.passouPelaChain()).isFalse();
        assertThat(resultado.response().getStatus()).isEqualTo(402);
    }

    @Test
    void naoAutenticadoPassaParaOSpringSecurityReagirCom401() throws Exception {
        // Sem autenticação nenhuma no SecurityContext.
        Resultado resultado = executar("/api/entregas", "GET");

        // Passa pela chain; quem de fato barra é o SecurityFilter/anyRequest().authenticated() a seguir.
        assertThat(resultado.passouPelaChain()).isTrue();
        verifyNoInteractions(assinaturaService);
    }

    // --- Rotas isentas (precisam funcionar mesmo bloqueado) ---

    @Test
    void rotaDeWebhookEIsentaMesmoSemAssinatura() throws Exception {
        autenticarComo(usuario("usuario-1", Role.USER));

        Resultado resultado = executar("/api/webhooks/stripe", "POST");

        assertThat(resultado.passouPelaChain()).isTrue();
        verifyNoInteractions(assinaturaService);
    }

    @Test
    void rotaDeAssinaturasEIsenta() throws Exception {
        autenticarComo(usuario("usuario-1", Role.USER));

        Resultado resultado = executar("/api/assinaturas/checkout-session", "POST");

        assertThat(resultado.passouPelaChain()).isTrue();
        verifyNoInteractions(assinaturaService);
    }

    @Test
    void getUsuariosMeEIsentoParaRestaurarSessaoMesmoBloqueado() throws Exception {
        autenticarComo(usuario("usuario-1", Role.USER));

        Resultado resultado = executar("/api/usuarios/me", "GET");

        assertThat(resultado.passouPelaChain()).isTrue();
        verifyNoInteractions(assinaturaService);
    }

    // PUT em /api/usuarios/me (hipotético) não é a mesma isenção do GET —
    // confirma que a isenção é específica de método, não do path inteiro.
    @Test
    void putUsuariosMeNaoEIsentoMesmoPathDoGetIsento() throws Exception {
        autenticarComo(usuario("usuario-1", Role.USER));
        when(assinaturaService.temAcessoLiberado("usuario-1")).thenReturn(false);

        Resultado resultado = executar("/api/usuarios/me", "PUT");

        assertThat(resultado.passouPelaChain()).isFalse();
        assertThat(resultado.response().getStatus()).isEqualTo(402);
    }
}
