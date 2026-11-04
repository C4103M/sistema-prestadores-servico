package com.agendamento.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardDTO {
    private Long totalAtendimentos;
    private Long concluidos;
    private Long cancelados;
    private Long faltas;
    private Long agendados;
    private BigDecimal faturamentoTotal;
}
