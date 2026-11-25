package com.agendamento.admin.controller;

import com.agendamento.admin.dto.response.AdminDashboardResponse;
import com.agendamento.admin.dto.response.UsuarioAdminResponse;
import com.agendamento.admin.service.AdminUsuarioService;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.categoria.dto.CategoriaRequest;
import com.agendamento.categoria.dto.CategoriaResponse;
import com.agendamento.categoria.service.CategoriaService;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.seguranca.UsuarioAutenticado;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.usuario.model.PapelUsuario;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints do ator Admin: gestão de categorias, aprovação de especialidades,
 * usuários e dashboard consolidado da plataforma.
 */
@Tag(name = "Administrador", description = "Gestão de categorias/especialidades, usuários e dashboard consolidado da plataforma")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AgendamentoService agendamentoService;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final CategoriaService categoriaService;
    private final AdminUsuarioService adminUsuarioService;

    // ---- Usuários (ativar / desativar)
    @Operation(summary = "Listar usuários da plataforma")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de usuários com filtro opcional por papel, situação e busca")
    })
    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> usuarios(
            @RequestParam(required = false) PapelUsuario papel,
            @RequestParam(required = false) Boolean ativo,
            @RequestParam(required = false) String busca) {
        return adminUsuarioService.listarUsuarios(papel, ativo, busca);
    }

    @Operation(summary = "Ativar ou desativar usuário", description = "Alterna o campo ativo do usuário; contas desativadas perdem acesso imediatamente.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status do usuário atualizado"),
            @ApiResponse(responseCode = "404", description = "Usuário não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Tentativa de desativar a própria conta ou outro administrador", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/usuarios/{id}/status")
    public UsuarioAdminResponse alternarStatusUsuario(
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @PathVariable Long id) {
        return adminUsuarioService.alternarStatus(atual.getUsuarioId(), id);
    }

    // ---- Categorias / Especialidades
    @Operation(summary = "Listar todas as categorias (pendentes primeiro)")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de categorias"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Administrador")
    })
    @GetMapping("/categorias")
    public List<CategoriaResponse> categorias() {
        return categoriaService.listarTodasAdmin();
    }

    @Operation(summary = "Cadastrar categoria já aprovada")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Categoria criada como APROVADA"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Já existe categoria com este nome", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PostMapping("/categorias")
    public ResponseEntity<CategoriaResponse> criarCategoria(
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @Valid @RequestBody CategoriaRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoriaService.criarPeloAdmin(atual.getUsuarioId(), dto));
    }

    @Operation(summary = "Atualizar dados da categoria")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoria atualizada"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Categoria não encontrada", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Já existe categoria com este nome", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping("/categorias/{id}")
    public CategoriaResponse atualizarCategoria(@PathVariable Long id, @Valid @RequestBody CategoriaRequest dto) {
        return categoriaService.atualizarPeloAdmin(id, dto);
    }

    @Operation(summary = "Aprovar categoria pendente ou rejeitada")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoria aprovada"),
            @ApiResponse(responseCode = "404", description = "Categoria não encontrada", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/categorias/{id}/aprovar")
    public CategoriaResponse aprovarCategoria(@PathVariable Long id) {
        return categoriaService.aprovar(id);
    }

    @Operation(summary = "Rejeitar categoria")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categoria rejeitada"),
            @ApiResponse(responseCode = "404", description = "Categoria não encontrada", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/categorias/{id}/rejeitar")
    public CategoriaResponse rejeitarCategoria(@PathVariable Long id) {
        return categoriaService.rejeitar(id);
    }

    // ---- Dashboard (toda a plataforma)
    @Operation(summary = "Obter dashboard consolidado da plataforma", description = "Consolida métricas gerais e faturamento por profissional com filtro opcional por período (de/ate).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Métricas consolidadas da plataforma"),
            @ApiResponse(responseCode = "400", description = "Intervalo de datas inválido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return agendamentoService.obterDashboardGeral(
                profissionalRepository.count(), servicoRepository.countPublicosAtivos(), de, ate);
    }
}
