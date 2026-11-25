package com.agendamento.compartilhado.exceptions;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.LinkedHashMap;
import java.util.Map;

// Converte as exceções das camadas de serviço e modelo em respostas HTTP no formato ProblemDetail (RFC 7807)
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecursoNaoEncontradoException.class)
    public ProblemDetail naoEncontrado(RecursoNaoEncontradoException ex) {
        return problema(HttpStatus.NOT_FOUND, "Recurso não encontrado", ex.getMessage());
    }

    // US01 CT06: e-mail já usado em outra conta
    @ExceptionHandler(EmailJaCadastradoException.class)
    public ProblemDetail emailJaCadastrado(EmailJaCadastradoException ex) {
        return problema(HttpStatus.CONFLICT, "E-mail já cadastrado", ex.getMessage());
    }

    // US01 CT08: login negado, sem dizer qual dos dois campos falhou
    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ProblemDetail credenciaisInvalidas(CredenciaisInvalidasException ex) {
        return problema(HttpStatus.UNAUTHORIZED, "Credenciais inválidas", ex.getMessage());
    }

    @ExceptionHandler(UsuarioDesativadoException.class)
    public ProblemDetail usuarioDesativado(UsuarioDesativadoException ex) {
        return problema(HttpStatus.FORBIDDEN, "Conta desativada", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail dadosInvalidos(IllegalArgumentException ex) {
        return problema(HttpStatus.BAD_REQUEST, "Dados inválidos", ex.getMessage());
    }

    // Regras de negócio: conflito de horário, cancelamento com menos de 2 h, transição de estado
    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail regraDeNegocio(IllegalStateException ex) {
        return problema(HttpStatus.CONFLICT, "Regra de negócio violada", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validacao(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(e -> campos.putIfAbsent(e.getField(), e.getDefaultMessage()));
        ProblemDetail pd = problema(HttpStatus.BAD_REQUEST, "Dados inválidos", "Corrija os campos informados.");
        pd.setProperty("campos", campos);
        return pd;
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail jsonInvalido(HttpMessageNotReadableException ex) {
        return problema(HttpStatus.BAD_REQUEST, "Requisição inválida",
                "O corpo da requisição não pôde ser lido. Verifique o JSON e os valores informados.");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ProblemDetail arquivoMuitoGrande(MaxUploadSizeExceededException ex) {
        return problema(HttpStatus.BAD_REQUEST, "Arquivo muito grande", "A imagem deve ter no máximo 5 MB.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail integridade(DataIntegrityViolationException ex) {
        return problema(HttpStatus.CONFLICT, "Operação não permitida",
                "O registro está vinculado a outros dados, como agendamentos, e não pode ser alterado ou excluído.");
    }

    private ProblemDetail problema(HttpStatus status, String titulo, String detalhe) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detalhe);
        pd.setTitle(titulo);
        return pd;
    }
}
