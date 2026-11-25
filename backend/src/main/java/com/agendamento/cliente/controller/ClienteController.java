package com.agendamento.cliente.controller;

import com.agendamento.agendamento.dto.request.AgendamentoRequest;
import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.dto.response.HorarioLivreResponse;
import com.agendamento.agendamento.dto.response.HorarioOcupadoResponse;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.agendamento.service.HorarioService;
import com.agendamento.disponibilidade.dto.DisponibilidadeDTO;
import com.agendamento.disponibilidade.service.DisponibilidadeService;
import com.agendamento.profissional.dto.response.ProfissionalResponse;
import com.agendamento.profissional.service.ProfissionalService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints do ator Cliente.
 * UC: Agendar atendimento (com busca por serviço ou profissional) e Cancelar agendamento.
 */
@Tag(name = "Cliente", description = "Busca de serviços/profissionais, horários livres, agendamento e cancelamento")
@RestController
@RequestMapping("/api/cliente")
@RequiredArgsConstructor
public class ClienteController {

    private final ServicoService servicoService;
    private final ProfissionalService profissionalService;
    private final DisponibilidadeService disponibilidadeService;
    private final AgendamentoService agendamentoService;
    private final HorarioService horarioService;

    /** Busca por serviço: o termo casa com o nome, a descrição ou o profissional do serviço. */
    @Operation(summary = "Buscar serviços ativos", description = "Lista serviços ativos filtrados opcionalmente por nome, descrição, categoria ou profissional.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de serviços ativos"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Cliente")
    })
    @GetMapping("/servicos")
    public List<ServicoDTO> buscarServicos(@RequestParam(required = false) String busca) {
        return servicoService.pesquisar(busca);
    }

    /** Busca por profissional: o termo casa com o nome ou a especialidade; traz os serviços ativos. */
    @Operation(summary = "Buscar profissionais com serviços ativos", description = "Filtra profissionais por nome ou especialidade trazendo seus serviços ativos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de profissionais encontrados"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Cliente")
    })
    @GetMapping("/profissionais")
    public List<ProfissionalResponse> buscarProfissionais(@RequestParam(required = false) String busca) {
        return profissionalService.pesquisar(busca);
    }

    /** Faixas de atendimento do profissional, usadas para montar os horários livres. */
    @Operation(summary = "Listar faixas de disponibilidade do profissional")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Faixas de atendimento semanais"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Cliente")
    })
    @GetMapping("/profissionais/{profissionalId}/disponibilidades")
    public List<DisponibilidadeDTO> disponibilidades(@PathVariable Long profissionalId) {
        return disponibilidadeService.listarPorProfissional(profissionalId);
    }

    /** Horários livres calculados no servidor para o serviço na data ou período (RN01/RN02). */
    @Operation(summary = "Consultar horários livres de um serviço", description = "Calcula slots livres dentro das faixas semanais descontando conflitos e passado (RN01/RN02).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Slots disponíveis no período"),
            @ApiResponse(responseCode = "400", description = "Período inválido ou serviço inativo", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Cliente"),
            @ApiResponse(responseCode = "404", description = "Serviço não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/servicos/{servicoId}/horarios-livres")
    public List<HorarioLivreResponse> horariosLivres(
            @PathVariable Long servicoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        if (data != null) {
            return horarioService.listarHorariosLivres(servicoId, data);
        }
        LocalDate inicio = de != null ? de : LocalDate.now();
        LocalDate fim = ate != null ? ate : inicio;
        return horarioService.listarHorariosLivres(servicoId, inicio, fim);
    }

    /**
     * Horários já ocupados do profissional no período (padrão: hoje até 14 dias à frente).
     * Devolve só início e fim, sem identificar o cliente de cada agendamento.
     */
    @Operation(summary = "Consultar intervalos ocupados do profissional", description = "Retorna apenas início e fim dos horários ocupados no período sem expor dados de clientes.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Intervalos ocupados"),
            @ApiResponse(responseCode = "400", description = "Período inválido", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Cliente")
    })
    @GetMapping("/profissionais/{profissionalId}/horarios-ocupados")
    public List<HorarioOcupadoResponse> horariosOcupados(
            @PathVariable Long profissionalId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ate) {
        LocalDate inicio = de != null ? de : LocalDate.now();
        LocalDate fim = ate != null ? ate : inicio.plusDays(14);
        return agendamentoService.listarHorariosOcupados(profissionalId, inicio, fim);
    }

    @Operation(summary = "Listar agendamentos do cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agendamentos do cliente ordenados do mais recente ao mais antigo"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado para clienteId de outro usuário")
    })
    @PreAuthorize("#clienteId == principal.perfilId")
    @GetMapping("/{clienteId}/agendamentos")
    public List<AgendamentoResponse> meusAgendamentos(@PathVariable Long clienteId) {
        return agendamentoService.listarPorCliente(clienteId);
    }

    @Operation(summary = "Agendar atendimento", description = "Cria agendamento AGENDADO com validação transacional de disponibilidade/conflito e preço congelado (RN01, RN02, RN05).")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Agendamento criado"),
            @ApiResponse(responseCode = "400", description = "Dados inválidos ou serviço não ativo/vinculado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado para clienteId de outro usuário"),
            @ApiResponse(responseCode = "404", description = "Cliente, profissional ou serviço não encontrado", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Fora da disponibilidade ou horário conflitante", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PreAuthorize("#clienteId == principal.perfilId")
    @PostMapping("/{clienteId}/agendamentos")
    public ResponseEntity<AgendamentoResponse> agendar(@PathVariable Long clienteId,
                                                          @Valid @RequestBody AgendamentoRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agendamentoService.criar(clienteId, dto));
    }

    @Operation(summary = "Cancelar agendamento pelo cliente", description = "Permite cancelar apenas com antecedência mínima de 2 horas (RN03) e em estado AGENDADO (RN06).")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agendamento cancelado"),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso negado para clienteId de outro usuário"),
            @ApiResponse(responseCode = "404", description = "Agendamento não encontrado ou de outro cliente", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Antecedência menor que 2h ou estado final", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class)))
    })
    @PreAuthorize("#clienteId == principal.perfilId")
    @PatchMapping("/{clienteId}/agendamentos/{id}/cancelar")
    public AgendamentoResponse cancelar(@PathVariable Long clienteId, @PathVariable Long id) {
        return agendamentoService.cancelarPeloCliente(clienteId, id);
    }
}
