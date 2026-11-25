package com.agendamento.profissional.controller;

import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.dto.response.DashboardResponse;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.categoria.dto.CategoriaRequest;
import com.agendamento.categoria.dto.CategoriaResponse;
import com.agendamento.categoria.service.CategoriaService;
import com.agendamento.disponibilidade.dto.DisponibilidadeDTO;
import com.agendamento.disponibilidade.service.DisponibilidadeService;
import com.agendamento.seguranca.UsuarioAutenticado;
import com.agendamento.servico.dto.ServicoDTO;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints do ator Profissional, sempre no escopo do próprio profissional.
 * UC: Manter serviço, Manter disponibilidade, Atualizar status do agendamento,
 * Cancelar agendamento e Ver dashboard.
 */
@Tag(name = "Profissional", description = "Serviços, disponibilidades semanais, agenda, atualização de status e dashboard do profissional")
@PreAuthorize("#profissionalId == principal.perfilId")
@RestController
@RequestMapping("/api/profissional/{profissionalId}")
@RequiredArgsConstructor
public class ProfissionalController {

    private final ServicoService servicoService;
    private final DisponibilidadeService disponibilidadeService;
    private final AgendamentoService agendamentoService;
    private final CategoriaService categoriaService;

    // ---- Categorias / Especialidades
    @Operation(summary = "Listar categorias disponíveis e solicitações do profissional")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Categorias aprovadas e sugestões do próprio profissional")
    })
    @GetMapping("/categorias")
    public List<CategoriaResponse> categorias(
            @PathVariable Long profissionalId,
            @AuthenticationPrincipal UsuarioAutenticado atual) {
        return categoriaService.listarParaProfissional(atual.getUsuarioId());
    }

    @Operation(summary = "Sugerir nova categoria (fica pendente de aprovação)")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Categoria criada como PENDENTE para aprovação do administrador"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Já existe categoria com este nome", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PostMapping("/categorias")
    public ResponseEntity<CategoriaResponse> sugerirCategoria(
            @PathVariable Long profissionalId,
            @AuthenticationPrincipal UsuarioAutenticado atual,
            @Valid @RequestBody CategoriaRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoriaService.sugerirPeloProfissional(atual.getUsuarioId(), dto));
    }

    // ---- Manter serviço
    @Operation(summary = "Listar serviços do profissional")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de serviços do profissional"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado para outro profissional")
    })
    @GetMapping("/servicos")
    public List<ServicoDTO> servicos(@PathVariable Long profissionalId) {
        return servicoService.listarPorProfissional(profissionalId);
    }

    @Operation(summary = "Cadastrar serviço do profissional")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Serviço criado"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado para outro profissional")
    })
    @PostMapping("/servicos")
    public ResponseEntity<ServicoDTO> criarServico(@PathVariable Long profissionalId, @Valid @RequestBody ServicoDTO dto) {
        dto.setProfissionalId(profissionalId);
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoService.criar(dto));
    }

    @Operation(summary = "Atualizar serviço do profissional", description = "Atualiza dados do serviço preservando preço congelado em agendamentos existentes (RN05).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Serviço atualizado"),
            @ApiResponse(responseCode = "400", description = "Campos inválidos", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping("/servicos/{id}")
    public ServicoDTO atualizarServico(@PathVariable Long profissionalId, @PathVariable Long id, @Valid @RequestBody ServicoDTO dto) {
        servicoService.garantirDoProfissional(profissionalId, id);
        return servicoService.atualizar(id, dto);
    }

    @Operation(summary = "Ativar ou desativar serviço")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Status alterado"),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/servicos/{id}/status")
    public ResponseEntity<Void> alternarServico(@PathVariable Long profissionalId, @PathVariable Long id) {
        servicoService.garantirDoProfissional(profissionalId, id);
        servicoService.alternarStatus(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Excluir serviço sem agendamentos")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Serviço excluído"),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Serviço possui agendamentos vinculados", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @DeleteMapping("/servicos/{id}")
    public ResponseEntity<Void> excluirServico(@PathVariable Long profissionalId, @PathVariable Long id) {
        servicoService.garantirDoProfissional(profissionalId, id);
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Manter disponibilidade
    @Operation(summary = "Listar faixas de disponibilidade semanal")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Faixas ordenadas por dia e hora de início")
    })
    @GetMapping("/disponibilidades")
    public List<DisponibilidadeDTO> disponibilidades(@PathVariable Long profissionalId) {
        return disponibilidadeService.listarPorProfissional(profissionalId);
    }

    @Operation(summary = "Cadastrar faixa de disponibilidade semanal")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Faixa criada"),
            @ApiResponse(responseCode = "400", description = "Fim igual ou anterior ao início", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Sobreposição com outra faixa do mesmo dia", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PostMapping("/disponibilidades")
    public ResponseEntity<DisponibilidadeDTO> criarDisponibilidade(@PathVariable Long profissionalId,
                                                                   @Valid @RequestBody DisponibilidadeDTO dto) {
        dto.setProfissionalId(profissionalId);
        return ResponseEntity.status(HttpStatus.CREATED).body(disponibilidadeService.criar(dto));
    }

    @Operation(summary = "Atualizar faixa de disponibilidade semanal")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Faixa atualizada"),
            @ApiResponse(responseCode = "400", description = "Horário inválido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Faixa não encontrada ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Sobreposição no mesmo dia", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PutMapping("/disponibilidades/{id}")
    public DisponibilidadeDTO atualizarDisponibilidade(@PathVariable Long profissionalId, @PathVariable Long id,
                                                       @Valid @RequestBody DisponibilidadeDTO dto) {
        disponibilidadeService.garantirDoProfissional(profissionalId, id);
        return disponibilidadeService.atualizar(id, dto);
    }

    @Operation(summary = "Remover faixa de disponibilidade semanal")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Faixa removida preservando agendamentos existentes"),
            @ApiResponse(responseCode = "404", description = "Faixa não encontrada ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @DeleteMapping("/disponibilidades/{id}")
    public ResponseEntity<Void> excluirDisponibilidade(@PathVariable Long profissionalId, @PathVariable Long id) {
        disponibilidadeService.garantirDoProfissional(profissionalId, id);
        disponibilidadeService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Agenda e Atualizar status do agendamento
    @Operation(summary = "Listar agenda do profissional", description = "Retorna todos os agendamentos ou apenas os de uma data específica em ordem crescente de horário.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista ordenada de agendamentos")
    })
    @GetMapping("/agendamentos")
    public List<AgendamentoResponse> agenda(@PathVariable Long profissionalId,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return data == null
                ? agendamentoService.listarPorProfissional(profissionalId)
                : agendamentoService.listarDoDia(profissionalId, data);
    }

    @Operation(summary = "Concluir agendamento", description = "Transiciona de AGENDADO para CONCLUIDO e contabiliza no faturamento (RN04, RN06).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agendamento concluído"),
            @ApiResponse(responseCode = "404", description = "Agendamento não encontrado ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Agendamento já está em estado final", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/agendamentos/{id}/concluir")
    public AgendamentoResponse concluir(@PathVariable Long profissionalId, @PathVariable Long id) {
        return agendamentoService.marcarConcluido(profissionalId, id);
    }

    @Operation(summary = "Registrar falta do cliente", description = "Marca como FALTOU apenas após o horário de início e em estado AGENDADO (RN06).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Falta registrada"),
            @ApiResponse(responseCode = "404", description = "Agendamento não encontrado ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Antes do início do horário ou agendamento em estado final", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/agendamentos/{id}/falta")
    public AgendamentoResponse falta(@PathVariable Long profissionalId, @PathVariable Long id) {
        return agendamentoService.marcarFalta(profissionalId, id);
    }

    @Operation(summary = "Cancelar agendamento pelo profissional", description = "Permite cancelar antes do início mesmo com menos de 2 horas de antecedência.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agendamento cancelado"),
            @ApiResponse(responseCode = "404", description = "Agendamento não encontrado ou de outro profissional", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Atendimento já começou ou está em estado final", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PatchMapping("/agendamentos/{id}/cancelar")
    public AgendamentoResponse cancelar(@PathVariable Long profissionalId, @PathVariable Long id) {
        return agendamentoService.cancelarPeloProfissional(profissionalId, id);
    }

    // ---- Ver dashboard
    @Operation(summary = "Obter dashboard de faturamento e métricas do profissional", description = "Aceita filtro opcional por período (de/ate) e calcula faturamento (RN04), taxa de comparecimento, faturamento por serviço e agendados futuros.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Métricas do profissional no período"),
            @ApiResponse(responseCode = "400", description = "Intervalo de datas inválido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/dashboard")
    public DashboardResponse dashboard(
            @PathVariable Long profissionalId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        return agendamentoService.obterDashboard(profissionalId, de, ate);
    }
}
