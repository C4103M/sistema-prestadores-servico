package com.agendamento.perfil.dto;

import com.agendamento.usuario.model.PapelUsuario;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PerfilResponse {
    private Long usuarioId;
    private Long perfilId;
    private PapelUsuario papel;
    private String nome;
    private String email;
    private String telefone;
    private String especialidade;
    private String bannerUrl;
}
