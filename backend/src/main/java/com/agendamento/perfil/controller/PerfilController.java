package com.agendamento.perfil.controller;

import com.agendamento.autenticacao.dto.AuthResponse;
import com.agendamento.perfil.dto.AlterarSenhaRequest;
import com.agendamento.perfil.dto.AtualizarPerfilRequest;
import com.agendamento.perfil.dto.PerfilResponse;
import com.agendamento.perfil.service.PerfilService;
import com.agendamento.seguranca.UsuarioAutenticado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Perfil", description = "Consulta/edição dos próprios dados (Meus dados) e troca de senha")
@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
public class PerfilController {

    private final PerfilService perfilService;

    @Operation(summary = "Obter dados do usuário autenticado")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dados atuais do perfil"),
            @ApiResponse(responseCode = "401", description = "Não autenticado")
    })
    @GetMapping
    public PerfilResponse obter(@AuthenticationPrincipal UsuarioAutenticado atual) {
        return perfilService.obter(atual.getUsuarioId());
    }

    @Operation(summary = "Atualizar meus dados", description = "Atualiza nome, e-mail, telefone (Cliente/Profissional) e especialidade (Profissional), emitindo novo JWT.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Perfil atualizado e novo token JWT emitido"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "409", description = "E-mail já utilizado por outra conta", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping
    public AuthResponse atualizar(
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @Valid @RequestBody AtualizarPerfilRequest dto) {
        return perfilService.atualizar(atual.getUsuarioId(), dto);
    }

    @Operation(summary = "Alterar minha senha", description = "Exige validação da senha atual com BCrypt antes de gravar a nova senha.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Senha alterada com sucesso"),
            @ApiResponse(responseCode = "400", description = "Senha atual incorreta ou nova senha inválida", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado")
    })
    @PatchMapping("/senha")
    public ResponseEntity<Void> alterarSenha(
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @Valid @RequestBody AlterarSenhaRequest dto) {
        perfilService.alterarSenha(atual.getUsuarioId(), dto);
        return ResponseEntity.noContent().build();
    }
}
