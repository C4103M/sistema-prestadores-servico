package com.agendamento.perfil.controller;

import com.agendamento.autenticacao.dto.AuthResponse;
import com.agendamento.perfil.dto.AlterarSenhaRequest;
import com.agendamento.perfil.dto.AtualizarPerfilRequest;
import com.agendamento.perfil.dto.PerfilResponse;
import com.agendamento.perfil.service.PerfilService;
import com.agendamento.seguranca.UsuarioAutenticado;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
public class PerfilController {

    private final PerfilService perfilService;

    @GetMapping
    public PerfilResponse obter(@AuthenticationPrincipal UsuarioAutenticado atual) {
        return perfilService.obter(atual.getUsuarioId());
    }

    @PutMapping
    public AuthResponse atualizar(
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @Valid @RequestBody AtualizarPerfilRequest dto) {
        return perfilService.atualizar(atual.getUsuarioId(), dto);
    }

    @PatchMapping("/senha")
    public ResponseEntity<Void> alterarSenha(
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @Valid @RequestBody AlterarSenhaRequest dto) {
        perfilService.alterarSenha(atual.getUsuarioId(), dto);
        return ResponseEntity.noContent().build();
    }
}
