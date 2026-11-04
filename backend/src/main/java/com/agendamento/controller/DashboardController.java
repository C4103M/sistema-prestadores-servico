package com.agendamento.controller;

import com.agendamento.dto.DashboardDTO;
import com.agendamento.service.AgendamentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final AgendamentoService agendamentoService;

    @GetMapping("/profissional/{profissionalId}")
    public ResponseEntity<DashboardDTO> obterDashboard(@PathVariable Long profissionalId) {
        return ResponseEntity.ok(agendamentoService.obterDashboard(profissionalId));
    }
}
