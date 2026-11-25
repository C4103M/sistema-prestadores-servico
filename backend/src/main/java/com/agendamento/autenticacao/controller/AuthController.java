package com.agendamento.autenticacao.controller;

import com.agendamento.autenticacao.dto.AuthResponse;
import com.agendamento.autenticacao.dto.CadastroClienteRequest;
import com.agendamento.autenticacao.dto.CadastroProfissionalRequest;
import com.agendamento.autenticacao.dto.LoginRequest;
import com.agendamento.autenticacao.service.AuthService;
import com.agendamento.seguranca.UsuarioAutenticado;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** US01: Cadastrar-se e entrar no sistema. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/cadastro/cliente")
    public ResponseEntity<AuthResponse> cadastrarCliente(@Valid @RequestBody CadastroClienteRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.cadastrarCliente(dto));
    }

    @PostMapping("/cadastro/profissional")
    public ResponseEntity<AuthResponse> cadastrarProfissional(@Valid @RequestBody CadastroProfissionalRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.cadastrarProfissional(dto));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest dto) {
        return authService.login(dto);
    }

    /** Exige token válido; devolve um novo token com a expiração renovada. */
    @PostMapping("/renovar")
    public AuthResponse renovar(@AuthenticationPrincipal UsuarioAutenticado atual) {
        return authService.renovar(atual.getUsuarioId());
    }
}
