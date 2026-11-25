package com.agendamento.compartilhado.exceptions;

public class UsuarioDesativadoException extends RuntimeException {
    public UsuarioDesativadoException() {
        super("Sua conta está desativada. Entre em contato com o administrador.");
    }
}
