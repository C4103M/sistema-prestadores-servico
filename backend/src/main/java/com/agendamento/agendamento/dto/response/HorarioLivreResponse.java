package com.agendamento.agendamento.dto.response;

import java.time.LocalDateTime;

public record HorarioLivreResponse(LocalDateTime dataHoraInicio, LocalDateTime dataHoraFim) {
}
