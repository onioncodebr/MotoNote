package br.com.onioncode.motonote.config;

import br.com.onioncode.motonote.security.AssinaturaGateFilter;
import br.com.onioncode.motonote.security.AuthRateLimitFilter;
import br.com.onioncode.motonote.security.MotoboyAccessGateFilter;
import br.com.onioncode.motonote.security.SecurityFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
// Habilita @PreAuthorize nos controllers — defesa em profundidade junto
// com os exigirMaster() já existentes nos services (ver melhorias.md 1.1):
// agora a role exigida fica visível e declarativa direto na rota, sem
// depender só de alguém lembrar de chamar o método certo no service.
@EnableMethodSecurity
public class SecurityConfig {

    private final SecurityFilter securityFilter;
    private final MotoboyAccessGateFilter motoboyAccessGateFilter;
    private final AssinaturaGateFilter assinaturaGateFilter;
    private final AuthRateLimitFilter authRateLimitFilter;

    public SecurityConfig(SecurityFilter securityFilter, MotoboyAccessGateFilter motoboyAccessGateFilter,
                           AssinaturaGateFilter assinaturaGateFilter, AuthRateLimitFilter authRateLimitFilter) {
        this.securityFilter = securityFilter;
        this.motoboyAccessGateFilter = motoboyAccessGateFilter;
        this.assinaturaGateFilter = assinaturaGateFilter;
        this.authRateLimitFilter = authRateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
                .cors(withDefaults()) // Habilita o CORS gerenciado pelo Spring
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Explícito em vez de depender só do default do Spring Security:
                // API é 100% JSON (nunca serve HTML/JS de negócio, só o
                // Swagger opcional em /swagger-ui/**, desligado por padrão) —
                // CSP restritiva de propósito. X-Content-Type-Options e
                // X-Frame-Options já viriam por padrão do Spring Security
                // mesmo sem essa chamada, mas ficam explícitos aqui pra não
                // depender de comportamento implícito do framework.
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(withDefaults())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // Permite todas as requisições OPTIONS
                        .requestMatchers("/api/auth/**", "/error").permitAll()
                        .requestMatchers("/api/webhooks/**").permitAll() // Stripe não manda JWT; autenticidade é a verificação HMAC no controller
                        .requestMatchers(HttpMethod.GET, "/api/assinaturas/plano").permitAll() // preço/trial pra landing page e cadastro, antes de existir sessão
                        .requestMatchers(HttpMethod.GET, "/api/configuracoes/exibicao").permitAll() // banner/popup/contato de suporte — landing também usa, antes de existir sessão
                        .requestMatchers(HttpMethod.POST, "/api/analytics/visita/*").permitAll() // contagem de visitas à landing/criar conta, antes de existir sessão
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .anyRequest().authenticated()
                )
                // A ordem das chamadas de addFilterBefore/After importa aqui:
                // o Spring Security registra a posição de cada classe de
                // filtro incrementalmente, na ordem em que os métodos são
                // chamados — então securityFilter precisa ter sua posição
                // registrada ANTES de authRateLimitFilter poder referenciar
                // SecurityFilter.class como ponto de referência.
                .addFilterBefore(securityFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(authRateLimitFilter, SecurityFilter.class)
                // Ordem importa: primeiro restringe QUAIS rotas um Motoboy
                // pode alcançar, depois (só nas que sobraram) checa
                // assinatura — assim uma rota fora do portal do motoboy
                // sempre dá 403, nunca 402.
                .addFilterAfter(motoboyAccessGateFilter, SecurityFilter.class)
                .addFilterAfter(assinaturaGateFilter, MotoboyAccessGateFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
