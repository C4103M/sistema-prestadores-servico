package com.agendamento.agendamento.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
    private Long agendadosFuturos;
    private Double taxaComparecimento;
    private BigDecimal faturamentoTotal;
    private List<FaturamentoServico> porServico;
    private List<AtendimentoRecente> recentes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FaturamentoServico {
        private Long servicoId;
        private String servicoNome;
        private Long concluidos;
        private BigDecimal faturamento;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AtendimentoRecente {
        private Long id;
        private String clienteNome;
        private String servicoNome;
        private String profissionalNome;
        private LocalDateTime dataHoraInicio;
        private BigDecimal preco;
    }
}
