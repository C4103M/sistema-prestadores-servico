package com.agendamento.cliente.controller;

import com.agendamento.agendamento.dto.request.AgendamentoRequest;
import com.agendamento.agendamento.dto.response.AgendamentoResponse;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.disponibilidade.dto.DisponibilidadeDTO;
import com.agendamento.disponibilidade.service.DisponibilidadeService;
import com.agendamento.profissional.dto.response.ProfissionalResponse;
import com.agendamento.profissional.service.ProfissionalService;
import com.agendamento.servico.dto.ServicoDTO;
import com.agendamento.servico.service.ServicoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints do ator Cliente.
 * UC: Agendar atendimento (com busca por serviço ou profissional) e Cancelar agendamento.
 */
@RestController
@RequestMapping("/api/cliente")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ClienteController {

    private final ServicoService servicoService;
    private final ProfissionalService profissionalService;
    private final DisponibilidadeService disponibilidadeService;
    private final AgendamentoService agendamentoService;

    /** Busca por serviço: o termo casa com o nome, a descrição ou o profissional do serviço. */
    @GetMapping("/servicos")
    public List<ServicoDTO> buscarServicos(@RequestParam(required = false) String busca) {
        return servicoService.pesquisar(busca);
    }

    /** Busca por profissional: o termo casa com o nome ou a especialidade; traz os serviços ativos. */
    @GetMapping("/profissionais")
    public List<ProfissionalResponse> buscarProfissionais(@RequestParam(required = false) String busca) {
        return profissionalService.pesquisar(busca);
    }

    /** Faixas de atendimento do profissional, usadas para montar os horários livres. */
    @GetMapping("/profissionais/{profissionalId}/disponibilidades")
    public List<DisponibilidadeDTO> disponibilidades(@PathVariable Long profissionalId) {
        return disponibilidadeService.listarPorProfissional(profissionalId);
    }

    @GetMapping("/{clienteId}/agendamentos")
    public List<AgendamentoResponse> meusAgendamentos(@PathVariable Long clienteId) {
        return agendamentoService.listarPorCliente(clienteId);
    }

    @PostMapping("/{clienteId}/agendamentos")
    public ResponseEntity<AgendamentoResponse> agendar(@PathVariable Long clienteId,
                                                          @Valid @RequestBody AgendamentoRequest dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agendamentoService.criar(clienteId, dto));
    }

    @PatchMapping("/{clienteId}/agendamentos/{id}/cancelar")
    public AgendamentoResponse cancelar(@PathVariable Long clienteId, @PathVariable Long id) {
        return agendamentoService.cancelarPeloCliente(clienteId, id);
    }
}
