package com.agendamento.admin.dto.response;

import com.agendamento.usuario.model.PapelUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsuarioAdminResponse {
    private Long id;
    private String nome;
    private String email;
    private String telefone;
    private String especialidade;
    private PapelUsuario papel;
    private Boolean ativo;
    private LocalDateTime criadoEm;
}
