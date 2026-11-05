package com.agendamento.agendamento.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardResponse {
    private Long totalAtendimentos;
    private Long concluidos;
    private Long cancelados;
    private Long faltas;
    private Long agendados;
    private BigDecimal faturamentoTotal;
}
