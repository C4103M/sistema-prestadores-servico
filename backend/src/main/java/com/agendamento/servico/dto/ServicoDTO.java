package com.agendamento.servico.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServicoDTO {
    private Long id;

    @NotBlank(message = "Informe o nome do serviço.")
    private String nome;

    private String descricao;

    private String categoria;

    @NotNull(message = "A duração em minutos é obrigatória.")
    @Min(value = 5, message = "A duração mínima é 5 minutos.")
    private Integer duracaoMinutos;

    @NotNull(message = "O preço é obrigatório.")
    @DecimalMin(value = "0.00", message = "Informe um preço igual ou maior que zero.")
    private BigDecimal preco;

    private Boolean ativo;
    private Long profissionalId;
    private String profissionalNome;
}
