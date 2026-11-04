package com.agendamento.service;

import com.agendamento.dto.AgendamentoRequestDTO;
import com.agendamento.dto.AgendamentoResponseDTO;
import com.agendamento.dto.DashboardDTO;
import com.agendamento.model.*;
import com.agendamento.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AgendamentoService {

    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;

    @Transactional
    public AgendamentoResponseDTO criar(AgendamentoRequestDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado: " + dto.getClienteId()));

        Profissional profissional = profissionalRepository.findById(dto.getProfissionalId())
                .orElseThrow(() -> new IllegalArgumentException("Profissional não encontrado: " + dto.getProfissionalId()));

        Servico servico = servicoRepository.findById(dto.getServicoId())
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado: " + dto.getServicoId()));

        LocalDateTime inicio = dto.getDataHoraInicio();
        LocalDateTime fim = inicio.plusMinutes(servico.getDuracaoMinutos());

        // Regra: Não pode haver sobreposição com outro agendamento ativo
        boolean conflito = agendamentoRepository.existeConflitoHorario(
                profissional.getId(),
                StatusAgendamento.AGENDADO,
                inicio,
                fim
        );

        if (conflito) {
            throw new IllegalStateException("O profissional já possui um agendamento conflitante neste horário.");
        }

        // Regra: Congelamento do preço no momento do agendamento
        Agendamento agendamento = Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .dataHoraInicio(inicio)
                .dataHoraFim(fim)
                .precoCobrado(servico.getPreco())
                .status(StatusAgendamento.AGENDADO)
                .build();

        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponseDTO> listarPorCliente(Long clienteId) {
        return agendamentoRepository.findByClienteIdOrderByDataHoraInicioDesc(clienteId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AgendamentoResponseDTO> listarPorProfissional(Long profissionalId) {
        return agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(profissionalId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AgendamentoResponseDTO cancelar(Long id) {
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado: " + id));

        agendamento.cancelar(LocalDateTime.now());
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional
    public AgendamentoResponseDTO marcarConcluido(Long id) {
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado: " + id));

        agendamento.marcarConcluido();
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional
    public AgendamentoResponseDTO marcarFalta(Long id) {
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Agendamento não encontrado: " + id));

        agendamento.marcarFalta();
        return toDTO(agendamentoRepository.save(agendamento));
    }

    @Transactional(readOnly = true)
    public DashboardDTO obterDashboard(Long profissionalId) {
        List<Agendamento> agendamentos = agendamentoRepository.findByProfissionalIdOrderByDataHoraInicioAsc(profissionalId);

        long concluidos = agendamentos.stream().filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO).count();
        long cancelados = agendamentos.stream().filter(a -> a.getStatus() == StatusAgendamento.CANCELADO).count();
        long faltas = agendamentos.stream().filter(a -> a.getStatus() == StatusAgendamento.FALTOU).count();
        long agendados = agendamentos.stream().filter(a -> a.getStatus() == StatusAgendamento.AGENDADO).count();

        // Regra: Ao marcar como CONCLUÍDO, o valor entra no faturamento
        BigDecimal faturamentoTotal = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .map(Agendamento::getPrecoCobrado)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return DashboardDTO.builder()
                .totalAtendimentos((long) agendamentos.size())
                .concluidos(concluidos)
                .cancelados(cancelados)
                .faltas(faltas)
                .agendados(agendados)
                .faturamentoTotal(faturamentoTotal)
                .build();
    }

    private AgendamentoResponseDTO toDTO(Agendamento a) {
        LocalDateTime agora = LocalDateTime.now();
        return AgendamentoResponseDTO.builder()
                .id(a.getId())
                .clienteId(a.getCliente().getId())
                .clienteNome(a.getCliente().getNome())
                .profissionalId(a.getProfissional().getId())
                .profissionalNome(a.getProfissional().getNome())
                .servicoId(a.getServico().getId())
                .servicoNome(a.getServico().getNome())
                .dataHoraInicio(a.getDataHoraInicio())
                .dataHoraFim(a.getDataHoraFim())
                .precoCobrado(a.getPrecoCobrado())
                .status(a.getStatus())
                .podeCancelar(a.podeCancelar(agora))
                .build();
    }
}
