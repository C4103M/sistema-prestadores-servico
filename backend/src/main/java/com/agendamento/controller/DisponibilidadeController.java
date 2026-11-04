package com.agendamento.controller;

import com.agendamento.dto.DisponibilidadeDTO;
import com.agendamento.service.DisponibilidadeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/disponibilidades")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DisponibilidadeController {

    private final DisponibilidadeService disponibilidadeService;

    @GetMapping("/profissional/{profissionalId}")
    public ResponseEntity<List<DisponibilidadeDTO>> listar(@PathVariable Long profissionalId) {
        return ResponseEntity.ok(disponibilidadeService.listarPorProfissional(profissionalId));
    }

    @PostMapping
    public ResponseEntity<DisponibilidadeDTO> criar(@Valid @RequestBody DisponibilidadeDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(disponibilidadeService.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DisponibilidadeDTO> atualizar(@PathVariable Long id, @Valid @RequestBody DisponibilidadeDTO dto) {
        return ResponseEntity.ok(disponibilidadeService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        disponibilidadeService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
