package com.agendamento.autenticacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CadastroProfissionalRequest extends CadastroClienteRequest {

    @NotBlank(message = "Informe a especialidade.")
    @Size(max = 120, message = "A especialidade deve ter no máximo 120 caracteres.")
    private String especialidade;
}
