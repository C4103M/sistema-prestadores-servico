package com.agendamento.categoria.dto;

import com.agendamento.categoria.model.StatusCategoria;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoriaResponse {
    private Long id;
    private String nome;
    private String shortDescription;
    private String imagemUrl;
    private StatusCategoria status;
    private Long criadoPorUsuarioId;
    private String criadoPorEmail;
    private long totalServicosAtivos;
    private LocalDateTime criadoEm;
}
