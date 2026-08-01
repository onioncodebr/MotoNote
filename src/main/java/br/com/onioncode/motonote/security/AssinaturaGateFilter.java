package br.com.onioncode.motonote.security;

import br.com.onioncode.motonote.domain.Motoboy;
import br.com.onioncode.motonote.domain.Role;
import br.com.onioncode.motonote.domain.Usuario;
import br.com.onioncode.motonote.service.AssinaturaService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// Bloqueia (402) usuários USER/ADMIN sem assinatura ativa/trialing de acessar
// rotas de negócio. Roda DEPOIS do SecurityFilter (contexto de autenticação
// já populado) — ver addFilterAfter em SecurityConfig. MASTER sempre passa,
// é o dono do SaaS, não é assinante. Um Motoboy autenticado é gateado pela
// assinatura da EMPRESA que o cadastrou (motoboy.getUsuarioId()), não por
// uma assinatura própria — ele nunca tem uma.
@Component
public class AssinaturaGateFilter extends OncePerRequestFilter {

    private final AssinaturaService assinaturaService;

    public AssinaturaGateFilter(AssinaturaService assinaturaService) {
        this.assinaturaService = assinaturaService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (isento(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication != null ? authentication.getPrincipal() : null;

        String usuarioIdParaChecar;
        boolean isMaster;
        if (principal instanceof Usuario usuario) {
            usuarioIdParaChecar = usuario.getId();
            isMaster = usuario.getRole() == Role.MASTER;
        } else if (principal instanceof Motoboy motoboy) {
            usuarioIdParaChecar = motoboy.getUsuarioId();
            isMaster = false;
        } else {
            // Não autenticado: deixa o anyRequest().authenticated() do Spring Security reagir (401).
            filterChain.doFilter(request, response);
            return;
        }

        if (isMaster || assinaturaService.temAcessoLiberado(usuarioIdParaChecar)) {
            filterChain.doFilter(request, response);
            return;
        }

        response.setStatus(402);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":402,\"error\":\"Payment Required\",\"message\":\"Sua assinatura está inativa. Assine para continuar usando o sistema.\",\"path\":\""
                        + request.getRequestURI() + "\"}"
        );
    }

    // Rotas que precisam funcionar mesmo pra quem está bloqueado: autenticação/
    // cadastro (sem token ainda), webhook (não é o usuário chamando), e as
    // próprias rotas de assinatura (senão ninguém bloqueado conseguiria se
    // desbloquear) — incluindo GET /api/usuarios/me (ou /api/motoboy/me pro
    // motoboy), que o frontend usa pra restaurar a sessão no mount; se fosse
    // gateado, um trial vencido deslogaria o usuário em vez de mostrar uma
    // tela explicando o bloqueio.
    private boolean isento(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equals(method)) return true;
        if (path.startsWith("/api/auth/")) return true;
        if (path.startsWith("/api/webhooks/")) return true;
        if (path.startsWith("/api/assinaturas/")) return true;
        if (path.equals("/api/usuarios/me") && "GET".equals(method)) return true;
        if (path.equals("/api/motoboy/me") && "GET".equals(method)) return true;
        if (path.equals("/api/configuracoes/exibicao") && "GET".equals(method)) return true;
        if (path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) return true;
        return false;
    }
}
