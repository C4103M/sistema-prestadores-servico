package com.agendamento.agendamento.service;

import com.agendamento.agendamento.dto.response.HorarioLivreResponse;
import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.categoria.model.StatusCategoria;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.disponibilidade.model.DiaSemana;
import com.agendamento.disponibilidade.model.Disponibilidade;
import com.agendamento.disponibilidade.repository.DisponibilidadeRepository;
import com.agendamento.servico.model.Servico;
import com.agendamento.servico.repository.ServicoRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HorarioService {

    private static final int PASSO_MINUTOS = 30;
    private static final long MAX_DIAS_CONSULTA = 31;

    private final ServicoRepository servicoRepository;
    private final DisponibilidadeRepository disponibilidadeRepository;
    private final AgendamentoRepository agendamentoRepository;

    @Transactional(readOnly = true)
    public List<HorarioLivreResponse> listarHorariosLivres(Long servicoId, LocalDate data) {
        return listarHorariosLivres(servicoId, data, data);
    }

    @Transactional(readOnly = true)
    public List<HorarioLivreResponse> listarHorariosLivres(Long servicoId, LocalDate de, LocalDate ate) {
        if (ate.isBefore(de)) {
            throw new IllegalArgumentException("A data final deve ser igual ou posterior à data inicial.");
        }
        if (ChronoUnit.DAYS.between(de, ate) > MAX_DIAS_CONSULTA) {
            throw new IllegalArgumentException("O período máximo para consulta de horários livres é de 31 dias.");
        }

        Servico servico = servicoRepository.findById(servicoId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Serviço não encontrado: " + servicoId));
        if (!Boolean.TRUE.equals(servico.getAtivo())
                || !Boolean.TRUE.equals(servico.getProfissional().getUsuario().getAtivo())
                || servico.getCategoriaEntidade() == null
                || servico.getCategoriaEntidade().getStatus() != StatusCategoria.APROVADA) {
            throw new IllegalArgumentException("O serviço escolhido não está ativo.");
        }

        Long profissionalId = servico.getProfissional().getId();
        int duracao = servico.getDuracaoMinutos();

        Map<DiaSemana, List<Disponibilidade>> faixasPorDia = disponibilidadeRepository.findByProfissionalId(profissionalId).stream()
                .collect(Collectors.groupingBy(
                        Disponibilidade::getDiaSemana,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                lista -> lista.stream()
                                        .sorted(Comparator.comparing(Disponibilidade::getHoraInicio))
                                        .toList()
                        )
                ));

        List<Agendamento> ocupados = agendamentoRepository.findByProfissionalAndPeriodo(
                        profissionalId, de.atStartOfDay(), ate.atTime(LocalTime.MAX)).stream()
                .filter(a -> a.getStatus() == StatusAgendamento.AGENDADO)
                .toList();

        LocalDateTime agora = LocalDateTime.now();
        List<HorarioLivreResponse> livres = new ArrayList<>();

        for (LocalDate dia = de; !dia.isAfter(ate); dia = dia.plusDays(1)) {
            DiaSemana diaSemana = DiaSemana.values()[dia.getDayOfWeek().getValue() % 7];
            List<Disponibilidade> faixas = faixasPorDia.getOrDefault(diaSemana, List.of());

            for (Disponibilidade faixa : faixas) {
                LocalDateTime limite = dia.atTime(faixa.getHoraFim());
                for (LocalDateTime inicio = dia.atTime(faixa.getHoraInicio());
                     !inicio.plusMinutes(duracao).isAfter(limite);
                     inicio = inicio.plusMinutes(PASSO_MINUTOS)) {
                    if (!inicio.isAfter(agora)) {
                        continue;
                    }
                    final LocalDateTime slotInicio = inicio;
                    final LocalDateTime slotFim = inicio.plusMinutes(duracao);
                    boolean conflita = ocupados.stream()
                            .anyMatch(a -> slotInicio.isBefore(a.getDataHoraFim()) && slotFim.isAfter(a.getDataHoraInicio()));
                    if (!conflita) {
                        livres.add(new HorarioLivreResponse(slotInicio, slotFim));
                    }
                }
            }
        }

        livres.sort(Comparator.comparing(HorarioLivreResponse::dataHoraInicio));
        return livres;
    }
}
