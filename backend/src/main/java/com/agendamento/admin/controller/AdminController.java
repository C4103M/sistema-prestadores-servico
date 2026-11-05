package com.agendamento.admin.controller;

import com.agendamento.admin.dto.response.AdminDashboardResponse;
import com.agendamento.agendamento.service.AgendamentoService;
import com.agendamento.profissional.dto.response.ProfissionalResponse;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.profissional.service.ProfissionalService;
import com.agendamento.servico.dto.ServicoDTO;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.servico.service.ServicoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints do ator Admin, com visão de toda a plataforma.
 * UC: Manter serviço (de qualquer profissional) e Ver dashboard (geral).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final ServicoService servicoService;
    private final ProfissionalService profissionalService;
    private final AgendamentoService agendamentoService;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;

    @GetMapping("/profissionais")
    public List<ProfissionalResponse> profissionais() {
        return profissionalService.listarTodos();
    }

    // ---- Manter serviço
    @GetMapping("/servicos")
    public List<ServicoDTO> servicos() {
        return servicoService.listarTodos();
    }

    @PostMapping("/servicos")
    public ResponseEntity<ServicoDTO> criarServico(@Valid @RequestBody ServicoDTO dto) {
        if (dto.getProfissionalId() == null) {
            throw new IllegalArgumentException("Informe o profissional responsável pelo serviço.");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoService.criar(dto));
    }

    @PutMapping("/servicos/{id}")
    public ServicoDTO atualizarServico(@PathVariable Long id, @Valid @RequestBody ServicoDTO dto) {
        return servicoService.atualizar(id, dto);
    }

    @PatchMapping("/servicos/{id}/status")
    public ResponseEntity<Void> alternarServico(@PathVariable Long id) {
        servicoService.alternarStatus(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/servicos/{id}")
    public ResponseEntity<Void> excluirServico(@PathVariable Long id) {
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Ver dashboard (toda a plataforma)
    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard() {
        return agendamentoService.obterDashboardGeral(profissionalRepository.count(), servicoRepository.findByAtivoTrue().size());
    }
}
