package com.agendamento.dto;

import com.agendamento.model.StatusAgendamento;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgendamentoResponseDTO {
    private Long id;
    private Long clienteId;
    private String clienteNome;
    private Long profissionalId;
    private String profissionalNome;
    private Long servicoId;
    private String servicoNome;
    private LocalDateTime dataHoraInicio;
    private LocalDateTime dataHoraFim;
    private BigDecimal precoCobrado;
    private StatusAgendamento status;
    private Boolean podeCancelar;
}
