package com.agendamento.agendamento.dto.response;

import java.time.LocalDateTime;

/**
 * Intervalo ocupado na agenda de um profissional. Só traz o horário, sem dados de quem agendou:
 * é o que o cliente precisa para montar os horários livres sem enxergar agendamentos alheios.
 */
public record HorarioOcupadoResponse(LocalDateTime dataHoraInicio, LocalDateTime dataHoraFim) {
}
