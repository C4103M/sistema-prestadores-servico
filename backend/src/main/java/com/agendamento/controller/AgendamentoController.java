package com.agendamento.controller;

import com.agendamento.dto.AgendamentoRequestDTO;
import com.agendamento.dto.AgendamentoResponseDTO;
import com.agendamento.service.AgendamentoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agendamentos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    @PostMapping
    public ResponseEntity<AgendamentoResponseDTO> criar(@Valid @RequestBody AgendamentoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(agendamentoService.criar(dto));
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<List<AgendamentoResponseDTO>> listarPorCliente(@PathVariable Long clienteId) {
        return ResponseEntity.ok(agendamentoService.listarPorCliente(clienteId));
    }

    @GetMapping("/profissional/{profissionalId}")
    public ResponseEntity<List<AgendamentoResponseDTO>> listarPorProfissional(@PathVariable Long profissionalId) {
        return ResponseEntity.ok(agendamentoService.listarPorProfissional(profissionalId));
    }

    @PatchMapping("/{id}/cancelar")
    public ResponseEntity<AgendamentoResponseDTO> cancelar(@PathVariable Long id) {
        return ResponseEntity.ok(agendamentoService.cancelar(id));
    }

    @PatchMapping("/{id}/concluir")
    public ResponseEntity<AgendamentoResponseDTO> concluir(@PathVariable Long id) {
        return ResponseEntity.ok(agendamentoService.marcarConcluido(id));
    }

    @PatchMapping("/{id}/falta")
    public ResponseEntity<AgendamentoResponseDTO> falta(@PathVariable Long id) {
        return ResponseEntity.ok(agendamentoService.marcarFalta(id));
    }
}
