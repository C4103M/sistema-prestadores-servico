package com.agendamento.compartilhado.controller;

import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.repository.ServicoRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final ProfissionalRepository profissionalRepository;
    private final ClienteRepository clienteRepository;
    private final ServicoRepository servicoRepository;
    private final AgendamentoRepository agendamentoRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> status() {
        try {
            Map<String, Long> resumo = Map.of(
                    "profissionais", profissionalRepository.count(),
                    "clientes", clienteRepository.count(),
                    "servicos", servicoRepository.count(),
                    "agendamentos", agendamentoRepository.count()
            );
            return ResponseEntity.ok(Map.of(
                    "status", "UP",
                    "database", "UP",
                    "timestamp", LocalDateTime.now(),
                    "resumo", resumo
            ));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "status", "DOWN",
                    "database", "DOWN",
                    "timestamp", LocalDateTime.now()
            ));
        }
    }
}
