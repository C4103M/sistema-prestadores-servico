package com.agendamento.admin.dto.response;

import com.agendamento.agendamento.dto.response.DashboardResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardResponse {
    private DashboardResponse totais;
    private Long profissionais;
    private Long servicosAtivos;
    private List<FaturamentoProfissional> porProfissional;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FaturamentoProfissional {
        private Long profissionalId;
        private String profissionalNome;
        private Long concluidos;
        private Long faltas;
        private BigDecimal faturamento;
    }
}
