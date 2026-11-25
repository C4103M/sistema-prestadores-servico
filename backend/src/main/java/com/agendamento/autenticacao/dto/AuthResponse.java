package com.agendamento.autenticacao.dto;

import com.agendamento.usuario.model.PapelUsuario;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Resposta de cadastro, login e renovação. O front redireciona pelo campo "papel". */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String tipo;
    private long expiraEmMinutos;
    private Long usuarioId;
    /** id do Cliente ou do Profissional (usado nas rotas /api/cliente/{id} e /api/profissional/{id}); nulo para ADMIN. */
    private Long perfilId;
    private String nome;
    private String email;
    private PapelUsuario papel;
}
