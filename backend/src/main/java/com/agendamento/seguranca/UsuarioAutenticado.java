package com.agendamento.seguranca;

import com.agendamento.usuario.model.PapelUsuario;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Principal do Spring Security, montado a partir das claims do JWT (sem ir ao banco a cada requisição). */
@Getter
@RequiredArgsConstructor
public class UsuarioAutenticado {
    private final Long usuarioId;
    private final String email;
    private final PapelUsuario papel;
    /** id do Cliente ou do Profissional; nulo para ADMIN. Usado nas checagens de dono (@PreAuthorize). */
    private final Long perfilId;
    private final String nome;
}
