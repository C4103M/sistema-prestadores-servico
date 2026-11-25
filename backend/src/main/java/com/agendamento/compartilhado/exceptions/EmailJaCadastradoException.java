package com.agendamento.compartilhado.exceptions;

public class EmailJaCadastradoException extends RuntimeException {

    public EmailJaCadastradoException() {
        super("Já existe uma conta com este e-mail.");
    }
}
