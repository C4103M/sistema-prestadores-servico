package com.agendamento.autenticacao.controller;

import com.agendamento.autenticacao.dto.AuthResponse;
import com.agendamento.autenticacao.dto.CadastroRequest;
import com.agendamento.autenticacao.dto.LoginRequest;
import com.agendamento.autenticacao.service.AuthService;
import com.agendamento.seguranca.UsuarioAutenticado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** US01: Cadastrar-se e entrar no sistema. */
@Tag(name = "Autenticação", description = "Cadastro de Cliente/Profissional, login e renovação de token JWT")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Cadastrar novo cliente", description = "Cria usuário CLIENTE, perfil de cliente e retorna token JWT.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Cliente cadastrado e autenticado"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "E-mail já cadastrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @SecurityRequirements
    @PostMapping("/cadastro/cliente")
    public ResponseEntity<AuthResponse> cadastrarCliente(@Valid @RequestBody CadastroRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.cadastrarCliente(dto));
    }

    @Operation(summary = "Cadastrar novo profissional", description = "Cria usuário PROFISSIONAL, perfil de profissional e retorna token JWT.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Profissional cadastrado e autenticado"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "E-mail já cadastrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @SecurityRequirements
    @PostMapping("/cadastro/profissional")
    public ResponseEntity<AuthResponse> cadastrarProfissional(@Valid @RequestBody CadastroRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.cadastrarProfissional(dto));
    }

    @Operation(summary = "Autenticar usuário", description = "Valida e-mail e senha (BCrypt) e retorna JWT com papel e perfilId.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Login bem-sucedido"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "E-mail ou senha incorretos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @SecurityRequirements
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest dto) {
        return authService.login(dto);
    }

    /** Exige token válido; devolve um novo token com a expiração renovada. */
    @Operation(summary = "Renovar sessão JWT", description = "Emite novo token JWT com expiração renovada para o usuário autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Token renovado"),
            @ApiResponse(responseCode = "401", description = "Token ausente, expirado ou inválido")
    })
    @PostMapping("/renovar")
    public AuthResponse renovar(@AuthenticationPrincipal UsuarioAutenticado atual) {
        return authService.renovar(atual.getUsuarioId());
    }
}
