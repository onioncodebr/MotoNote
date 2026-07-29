package com.onioncode.entregas.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(UsuarioNotFoundException.class)
    public ResponseEntity<ApiError> handleUsuarioNotFound(UsuarioNotFoundException ex, HttpServletRequest request){
        ApiError apiError = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(apiError);
    }


    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<ApiError> handleUsernameNotFoundException(
            UsernameNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    // Credenciais de login inválidas (e-mail inexistente ou senha errada) —
    // 401, não 404: não é um recurso "não encontrado", é uma autenticação
    // que falhou.
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiError> handleBadCredentialsException(
            BadCredentialsException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);

    }

    // DisabledException/LockedException: o DaoAuthenticationProvider lança
    // isso no login quando Usuario.isEnabled()/isAccountNonLocked() voltam
    // false (conta desativada pelo MASTER) — antes até de checar a senha.
    // 423 (Locked) por consistência com o mesmo bloqueio reforçado em toda
    // request já autenticada (ver SecurityFilter).
    @ExceptionHandler(AccountStatusException.class)
    public ResponseEntity<ApiError> handleAccountStatusException(
            AccountStatusException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.LOCKED.value(),
                HttpStatus.LOCKED.getReasonPhrase(),
                "Esta conta foi desativada.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.LOCKED).body(error);
    }


    @ExceptionHandler(SenhaAtualIncorretaException.class)
    public ResponseEntity<ApiError> handleSenhaAtualIncorretaException(
            SenhaAtualIncorretaException ex, HttpServletRequest request
    ){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);

    }

    @ExceptionHandler(SenhaInvalidaException.class)
    public ResponseEntity<ApiError> handleSenhaInvalidaException(
            SenhaInvalidaException ex, HttpServletRequest request
    ){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // Antes devolvia um Map<String,String> solto (ver melhorias.md 1.3) —
    // agora usa o mesmo ApiError do resto da API, com os erros por campo
    // em fieldErrors. message repete a primeira mensagem de campo, pra
    // continuar dando um texto direto de exibir sem o frontend precisar
    // ler fieldErrors (que fica disponível pra quem quiser destacar o
    // campo específico no formulário).
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidationExceptions(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> erros = new HashMap<>();

        // Pega todos os erros do @Valid e monta um mapa: "campo": "mensagem"
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            erros.put(fieldName, errorMessage);
        });

        String primeiraMensagem = erros.values().stream().findFirst().orElse("Um ou mais campos são inválidos.");
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                primeiraMensagem,
                request.getRequestURI(),
                erros
        );

        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(EmailJaCadastradoException.class)
    public ResponseEntity<ApiError> handleEmailDuplicado(EmailJaCadastradoException ex, HttpServletRequest request) {
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI(),
                // Mapeado pro campo "email" pra ficar igual à validação do @Valid.
                Map.of("email", ex.getMessage())
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(SenhasNaoConferemException.class)
    public ResponseEntity<ApiError> handleSenhasNaoConferem(SenhasNaoConferemException ex, HttpServletRequest request) {
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI(),
                Map.of("confirmPassword", ex.getMessage())
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(IntervaloDataInvalidoException.class)
    public ResponseEntity<ApiError> handleIntervaloDataInvalidoException(
            IntervaloDataInvalidoException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(EntregaNaoPendenteException.class)
    public ResponseEntity<ApiError> handleEntregaNaoPendenteException(
            EntregaNaoPendenteException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ValorPedidoObrigatorioException.class)
    public ResponseEntity<ApiError> handleValorPedidoObrigatorioException(
            ValorPedidoObrigatorioException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ValorPedidoMenorQueEntregaException.class)
    public ResponseEntity<ApiError> handleValorPedidoMenorQueEntregaException(
            ValorPedidoMenorQueEntregaException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(DadosClienteObrigatoriosException.class)
    public ResponseEntity<ApiError> handleDadosClienteObrigatoriosException(
            DadosClienteObrigatoriosException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ObservacaoObrigatoriaException.class)
    public ResponseEntity<ApiError> handleObservacaoObrigatoriaException(
            ObservacaoObrigatoriaException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ClienteNotFoundException.class)
    public ResponseEntity<ApiError> handleClienteNotFoundException(
            ClienteNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(GastoNotFoundException.class)
    public ResponseEntity<ApiError> handleGastoNotFoundException(
            GastoNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ValeNotFoundException.class)
    public ResponseEntity<ApiError> handleValeNotFoundException(
            ValeNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MotoboyListNotFoundException.class)
    public ResponseEntity<ApiError> handleUsernameNotFoundException(
            MotoboyListNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MotoboyNameIgualException.class)
    public ResponseEntity<ApiError> handleUsernameNotFoundException(
            MotoboyNameIgualException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MotoboyJaExisteException.class)
    public ResponseEntity<ApiError> handleUsernameNotFoundException(
            MotoboyJaExisteException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(EntregaNotFoundException.class)
    public ResponseEntity<ApiError> handleEntregaNotFoundException(
            EntregaNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(MotoboyNotFoundException.class)
    public ResponseEntity<ApiError> handleMotoboyNotFoundException(
            MotoboyNotFoundException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<ApiError> handleAcessoNegadoException(
            AcessoNegadoException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    // Lançada pelo Spring Security quando um @PreAuthorize nega acesso (ver
    // melhorias.md 1.1) — sem este handler, cairia no 403 padrão do Spring
    // Boot, com corpo diferente do ApiError usado no resto da API.
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(
            org.springframework.security.access.AccessDeniedException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                "Acesso negado.",
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(AssinaturaNaoEncontradaException.class)
    public ResponseEntity<ApiError> handleAssinaturaNaoEncontradaException(
            AssinaturaNaoEncontradaException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(AssinaturaJaAtivaException.class)
    public ResponseEntity<ApiError> handleAssinaturaJaAtivaException(
            AssinaturaJaAtivaException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(RevogacaoNaoPermitidaException.class)
    public ResponseEntity<ApiError> handleRevogacaoNaoPermitidaException(
            RevogacaoNaoPermitidaException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.CONFLICT.value(),
                HttpStatus.CONFLICT.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(PagamentoIndisponivelException.class)
    public ResponseEntity<ApiError> handlePagamentoIndisponivelException(
            PagamentoIndisponivelException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(CaptchaInvalidoException.class)
    public ResponseEntity<ApiError> handleCaptchaInvalidoException(
            CaptchaInvalidoException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(CadastroDesabilitadoException.class)
    public ResponseEntity<ApiError> handleCadastroDesabilitadoException(
            CadastroDesabilitadoException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(CodigoInvalidoException.class)
    public ResponseEntity<ApiError> handleCodigoInvalidoException(
            CodigoInvalidoException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(EmailIndisponivelException.class)
    public ResponseEntity<ApiError> handleEmailIndisponivelException(
            EmailIndisponivelException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(UploadIndisponivelException.class)
    public ResponseEntity<ApiError> handleUploadIndisponivelException(
            UploadIndisponivelException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(ArquivoInvalidoException.class)
    public ResponseEntity<ApiError> handleArquivoInvalidoException(
            ArquivoInvalidoException ex, HttpServletRequest request){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    // MethodArgumentTypeMismatchException (ex.: ?startDate=nao-e-uma-data) e
    // HttpMessageNotReadableException (corpo JSON malformado) são erro de
    // input do cliente, não do servidor — sem esses dois handlers explícitos
    // eles cairiam no catch-all de baixo e virariam 500 em vez de 400,
    // porque o @ExceptionHandler(Exception.class) tem prioridade sobre a
    // resolução padrão do Spring MVC pra esses casos (que devolveria 400
    // sozinha se a gente não tivesse um catch-all competindo).
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Parâmetro '" + ex.getName() + "' inválido.",
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleMessageNotReadable(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Corpo da requisição inválido ou malformado.",
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(error);
    }

    // Classe-mãe de MissingServletRequestParameterException (ex.: esqueceu
    // ?endDate= num relatório) e MissingRequestHeaderException (ex.:
    // webhook do Stripe sem o header Stripe-Signature) — mesmo motivo do
    // handler de MethodArgumentTypeMismatchException acima: sem isso, os
    // dois caem no catch-all Exception.class e viram 500 (com log de erro
    // como se fosse falha do servidor) em vez do 400 que realmente são —
    // erro de quem chamou a API, não da aplicação.
    @ExceptionHandler(ServletRequestBindingException.class)
    public ResponseEntity<ApiError> handleServletRequestBindingException(
            ServletRequestBindingException ex, HttpServletRequest request) {
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Parâmetro ou cabeçalho obrigatório ausente na requisição.",
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(error);
    }

    // Rede de segurança pra qualquer exceção sem handler específico (timeout
    // do Mongo, NPE, erro inesperado do SDK do Stripe etc.) — sem isso a
    // resposta cai no tratamento padrão do Spring, com um formato de corpo
    // diferente do resto da API e sem nenhum log central. O detalhe da
    // exceção fica só no log do servidor; a resposta ao cliente é sempre
    // genérica (spring.web.error.include-stacktrace já garante isso pros
    // outros handlers, aqui reforçamos manualmente).
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpectedException(Exception ex, HttpServletRequest request) {
        log.error("Erro não tratado em {} {}", request.getMethod(), request.getRequestURI(), ex);

        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "Ocorreu um erro inesperado. Tente novamente em instantes.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
