package com.agendamento.agendamento.model;

import com.agendamento.cliente.model.Cliente;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.servico.model.Servico;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "agendamentos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profissional_id", nullable = false)
    private Profissional profissional;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id", nullable = false)
    private Servico servico;

    @Column(name = "data_hora_inicio", nullable = false)
    private LocalDateTime dataHoraInicio;

    @Column(name = "data_hora_fim", nullable = false)
    private LocalDateTime dataHoraFim;

    @Column(name = "preco_cobrado", nullable = false, precision = 10, scale = 2) // coluna mantida para não quebrar o banco existente
    private BigDecimal preco;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StatusAgendamento status = StatusAgendamento.AGENDADO;

    @Column(name = "criado_em", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();

    public boolean podeCancelar(LocalDateTime agora) {
        if (this.status != StatusAgendamento.AGENDADO) {
            return false;
        }
        return !this.dataHoraInicio.isBefore(agora.plusHours(2));
    }

    public void cancelar(LocalDateTime agora) {
        if (this.status != StatusAgendamento.AGENDADO) {
            throw new IllegalStateException("Apenas agendamentos no status AGENDADO podem ser cancelados.");
        }
        if (!podeCancelar(agora)) {
            throw new IllegalStateException("Cancelamento só permitido com no mínimo 2 horas de antecedência.");
        }
        this.status = StatusAgendamento.CANCELADO;
    }

    // O profissional pode cancelar a qualquer momento antes do atendimento; a regra das 2h vale só para o cliente
    public void cancelarPeloProfissional(LocalDateTime agora) {
        if (this.status != StatusAgendamento.AGENDADO) {
            throw new IllegalStateException("Apenas agendamentos no status AGENDADO podem ser cancelados.");
        }
        if (!this.dataHoraInicio.isAfter(agora)) {
            throw new IllegalStateException("Agendamentos que já começaram não podem ser cancelados.");
        }
        this.status = StatusAgendamento.CANCELADO;
    }

    public void marcarConcluido() {
        if (this.status != StatusAgendamento.AGENDADO) {
            throw new IllegalStateException("Apenas agendamentos no status AGENDADO podem ser concluídos.");
        }
        this.status = StatusAgendamento.CONCLUIDO;
    }

    public void marcarFalta(LocalDateTime agora) {
        if (this.status != StatusAgendamento.AGENDADO) {
            throw new IllegalStateException("Apenas agendamentos no status AGENDADO podem receber falta.");
        }
        if (agora.isBefore(this.dataHoraInicio)) {
            throw new IllegalStateException("Só é possível registrar falta a partir do horário de início do agendamento.");
        }
        this.status = StatusAgendamento.FALTOU;
    }
}
