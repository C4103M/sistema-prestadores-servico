package com.agendamento.compartilhado.exceptions;

/** Mensagem única de propósito: não revela se o e-mail ou a senha falhou. */
public class CredenciaisInvalidasException extends RuntimeException {

    public CredenciaisInvalidasException() {
        super("E-mail ou senha incorretos.");
    }
}
