package com.agendamento.controller;

import com.agendamento.dto.ServicoDTO;
import com.agendamento.service.ServicoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servicos")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ServicoController {

    private final ServicoService servicoService;

    @GetMapping
    public ResponseEntity<List<ServicoDTO>> listar(
            @RequestParam(required = false) Long profissionalId,
            @RequestParam(required = false) String busca
    ) {
        if (profissionalId != null) {
            return ResponseEntity.ok(servicoService.listarPorProfissional(profissionalId));
        }
        if (busca != null && !busca.isBlank()) {
            return ResponseEntity.ok(servicoService.pesquisar(busca));
        }
        return ResponseEntity.ok(servicoService.listarTodosAtivos());
    }

    @PostMapping
    public ResponseEntity<ServicoDTO> criar(@Valid @RequestBody ServicoDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicoService.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServicoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody ServicoDTO dto) {
        return ResponseEntity.ok(servicoService.atualizar(id, dto));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<Void> alternarStatus(@PathVariable Long id) {
        servicoService.alternarStatus(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
