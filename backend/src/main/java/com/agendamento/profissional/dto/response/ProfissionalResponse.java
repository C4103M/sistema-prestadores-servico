package com.agendamento.profissional.dto.response;

import com.agendamento.servico.dto.ServicoDTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfissionalResponse {
    private Long id;
    private String nome;
    private String especialidade;
    private List<ServicoDTO> servicos;
}
