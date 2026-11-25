package com.agendamento.admin.controller;

import com.agendamento.admin.dto.response.AdminDashboardResponse;
import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.profissional.dto.response.ProfissionalResponse;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.profissional.service.ProfissionalService;
import com.agendamento.servico.dto.ServicoDTO;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.servico.service.ServicoService;

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
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints do ator Admin, com visão de toda a plataforma.
 * UC: Manter serviço (de qualquer profissional) e Ver dashboard (geral).
 */
@Tag(name = "Administrador", description = "Gestão global de serviços, profissionais e dashboard consolidado da plataforma")
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ServicoService servicoService;
    private final ProfissionalService profissionalService;
    private final AgendamentoService agendamentoService;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;

    @Operation(summary = "Listar todos os profissionais")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de profissionais"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Administrador")
    })
    @GetMapping("/profissionais")
    public List<ProfissionalResponse> profissionais() {
        return profissionalService.listarTodos();
    }

    // ---- Manter serviço
    @Operation(summary = "Listar todos os serviços da plataforma")
    @GetMapping("/servicos")
    public List<ServicoDTO> servicos() {
        return servicoService.listarTodos();
    }

    @Operation(summary = "Cadastrar serviço para qualquer profissional")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Serviço criado"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Profissional não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PostMapping("/servicos")
    public ResponseEntity<ServicoDTO> criarServico(@Valid @RequestBody ServicoDTO dto) {
        if (dto.getProfissionalId() == null) {
            throw new IllegalArgumentException("Informe o profissional responsável pelo serviço.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoService.criar(dto));
    }

    @Operation(summary = "Atualizar serviço como administrador")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Serviço atualizado"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Serviço ou profissional não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Tentativa de trocar profissional com agendamentos vinculados", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping("/servicos/{id}")
    public ServicoDTO atualizarServico(@PathVariable Long id, @Valid @RequestBody ServicoDTO dto) {
        return servicoService.atualizarComoAdmin(id, dto);
    }

    @Operation(summary = "Ativar ou desativar serviço")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Status alterado"),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/servicos/{id}/status")
    public ResponseEntity<Void> alternarServico(@PathVariable Long id) {
        servicoService.alternarStatus(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Excluir serviço sem agendamentos")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Serviço excluído"),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Serviço possui agendamentos vinculados", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @DeleteMapping("/servicos/{id}")
    public ResponseEntity<Void> excluirServico(@PathVariable Long id) {
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Agendamentos e Dashboard (toda a plataforma)
    @Operation(summary = "Listar todos os agendamentos da plataforma")
    @GetMapping("/agendamentos")
    public List<AgendamentoResponse> agendamentos() {
        return agendamentoService.listarTodos();
    }

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
                profissionalRepository.count(), servicoRepository.findByAtivoTrue().size(), de, ate);
    }
}
