package com.agendamento.categoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoriaRequest {

    @NotBlank(message = "Informe o nome da categoria.")
    @Size(max = 80, message = "O nome da categoria deve ter no máximo 80 caracteres.")
    private String nome;

    @NotBlank(message = "Informe uma descrição curta.")
    @Size(max = 220, message = "A descrição curta deve ter no máximo 220 caracteres.")
    private String shortDescription;

    @NotBlank(message = "Informe ou envie uma imagem para a categoria.")
    @Size(max = 500, message = "A URL da imagem deve ter no máximo 500 caracteres.")
    private String imagemUrl;
}
