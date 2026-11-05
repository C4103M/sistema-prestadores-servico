package com.agendamento.profissional.controller;

import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.dto.response.DashboardResponse;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.disponibilidade.dto.DisponibilidadeDTO;
import com.agendamento.disponibilidade.service.DisponibilidadeService;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.servico.dto.ServicoDTO;
import com.agendamento.servico.service.ServicoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Endpoints do ator Profissional, sempre no escopo do próprio profissional.
 * UC: Manter serviço, Manter disponibilidade, Atualizar status do agendamento,
 * Cancelar agendamento e Ver dashboard.
 */
@RestController
@RequestMapping("/api/profissional/{profissionalId}")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ProfissionalController {

    private final ServicoService servicoService;
    private final DisponibilidadeService disponibilidadeService;
    private final AgendamentoService agendamentoService;

    // ---- Manter serviço
    @GetMapping("/servicos")
    public List<ServicoDTO> servicos(@PathVariable Long profissionalId) {
        return servicoService.listarPorProfissional(profissionalId);
    }

    @PostMapping("/servicos")
    public ResponseEntity<ServicoDTO> criarServico(@PathVariable Long profissionalId, @Valid @RequestBody ServicoDTO dto) {
        dto.setProfissionalId(profissionalId);
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoService.criar(dto));
    }

    @PutMapping("/servicos/{id}")
    public ServicoDTO atualizarServico(@PathVariable Long profissionalId, @PathVariable Long id, @Valid @RequestBody ServicoDTO dto) {
        servicoService.garantirDoProfissional(profissionalId, id);
        return servicoService.atualizar(id, dto);
    }

    @PatchMapping("/servicos/{id}/status")
    public ResponseEntity<Void> alternarServico(@PathVariable Long profissionalId, @PathVariable Long id) {
        servicoService.garantirDoProfissional(profissionalId, id);
        servicoService.alternarStatus(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/servicos/{id}")
    public ResponseEntity<Void> excluirServico(@PathVariable Long profissionalId, @PathVariable Long id) {
        servicoService.garantirDoProfissional(profissionalId, id);
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Manter disponibilidade
    @GetMapping("/disponibilidades")
    public List<DisponibilidadeDTO> disponibilidades(@PathVariable Long profissionalId) {
        return disponibilidadeService.listarPorProfissional(profissionalId);
    }

    @PostMapping("/disponibilidades")
    public ResponseEntity<DisponibilidadeDTO> criarDisponibilidade(@PathVariable Long profissionalId,
                                                                   @Valid @RequestBody DisponibilidadeDTO dto) {
        dto.setProfissionalId(profissionalId);
        return ResponseEntity.status(HttpStatus.CREATED).body(disponibilidadeService.criar(dto));
    }

    @PutMapping("/disponibilidades/{id}")
    public DisponibilidadeDTO atualizarDisponibilidade(@PathVariable Long profissionalId, @PathVariable Long id,
                                                       @Valid @RequestBody DisponibilidadeDTO dto) {
        disponibilidadeService.garantirDoProfissional(profissionalId, id);
        return disponibilidadeService.atualizar(id, dto);
    }

    @DeleteMapping("/disponibilidades/{id}")
    public ResponseEntity<Void> excluirDisponibilidade(@PathVariable Long profissionalId, @PathVariable Long id) {
        disponibilidadeService.garantirDoProfissional(profissionalId, id);
        disponibilidadeService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Agenda e Atualizar status do agendamento
    @GetMapping("/agendamentos")
    public List<AgendamentoResponse> agenda(@PathVariable Long profissionalId,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate data) {
        return data == null
                ? agendamentoService.listarPorProfissional(profissionalId)
                : agendamentoService.listarDoDia(profissionalId, data);
    }

    @PatchMapping("/agendamentos/{id}/concluir")
    public AgendamentoResponse concluir(@PathVariable Long profissionalId, @PathVariable Long id) {
        return agendamentoService.marcarConcluido(profissionalId, id);
    }

    @PatchMapping("/agendamentos/{id}/falta")
    public AgendamentoResponse falta(@PathVariable Long profissionalId, @PathVariable Long id) {
        return agendamentoService.marcarFalta(profissionalId, id);
    }

    @PatchMapping("/agendamentos/{id}/cancelar")
    public AgendamentoResponse cancelar(@PathVariable Long profissionalId, @PathVariable Long id) {
        return agendamentoService.cancelarPeloProfissional(profissionalId, id);
    }

    // ---- Ver dashboard
    @GetMapping("/dashboard")
    public DashboardResponse dashboard(@PathVariable Long profissionalId) {
        return agendamentoService.obterDashboard(profissionalId);
    }
}
