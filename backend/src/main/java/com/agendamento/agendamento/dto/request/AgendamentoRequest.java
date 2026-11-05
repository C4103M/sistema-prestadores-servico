package com.agendamento.agendamento.dto.request;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgendamentoRequest {

    @NotNull(message = "O profissional é obrigatório.")
    private Long profissionalId;

    @NotNull(message = "O serviço é obrigatório.")
    private Long servicoId;

    @NotNull(message = "A data e hora de início é obrigatória.")
    @Future(message = "A data e hora de início deve ser no futuro.")
    private LocalDateTime dataHoraInicio;
}
