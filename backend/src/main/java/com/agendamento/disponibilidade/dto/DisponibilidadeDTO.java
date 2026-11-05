package com.agendamento.disponibilidade.dto;

import com.agendamento.disponibilidade.model.DiaSemana;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisponibilidadeDTO {
    private Long id;

    @NotNull(message = "O profissional é obrigatório.")
    private Long profissionalId;

    @NotNull(message = "O dia da semana é obrigatório.")
    private DiaSemana diaSemana;

    @NotNull(message = "A hora de início é obrigatória.")
    private LocalTime horaInicio;

    @NotNull(message = "A hora de fim é obrigatória.")
    private LocalTime horaFim;
}
