package com.agendamento.service;

import com.agendamento.dto.DisponibilidadeDTO;
import com.agendamento.model.Disponibilidade;
import com.agendamento.model.Profissional;
import com.agendamento.repository.DisponibilidadeRepository;
import com.agendamento.repository.ProfissionalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DisponibilidadeService {

    private final DisponibilidadeRepository disponibilidadeRepository;
    private final ProfissionalRepository profissionalRepository;

    @Transactional(readOnly = true)
    public List<DisponibilidadeDTO> listarPorProfissional(Long profissionalId) {
        return disponibilidadeRepository.findByProfissionalId(profissionalId).stream()
                .sorted(Comparator.comparing(Disponibilidade::getDiaSemana)
                        .thenComparing(Disponibilidade::getHoraInicio))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public DisponibilidadeDTO criar(DisponibilidadeDTO dto) {
        Profissional profissional = profissionalRepository.findById(dto.getProfissionalId())
                .orElseThrow(() -> new IllegalArgumentException("Profissional não encontrado: " + dto.getProfissionalId()));

        validar(dto, null);

        Disponibilidade disponibilidade = Disponibilidade.builder()
                .profissional(profissional)
                .diaSemana(dto.getDiaSemana())
                .horaInicio(dto.getHoraInicio())
                .horaFim(dto.getHoraFim())
                .build();

        return toDTO(disponibilidadeRepository.save(disponibilidade));
    }

    @Transactional
    public DisponibilidadeDTO atualizar(Long id, DisponibilidadeDTO dto) {
        Disponibilidade disponibilidade = disponibilidadeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Disponibilidade não encontrada: " + id));

        dto.setProfissionalId(disponibilidade.getProfissional().getId());
        validar(dto, id);

        disponibilidade.setDiaSemana(dto.getDiaSemana());
        disponibilidade.setHoraInicio(dto.getHoraInicio());
        disponibilidade.setHoraFim(dto.getHoraFim());

        return toDTO(disponibilidadeRepository.save(disponibilidade));
    }

    @Transactional
    public void excluir(Long id) {
        if (!disponibilidadeRepository.existsById(id)) {
            throw new IllegalArgumentException("Disponibilidade não encontrada: " + id);
        }
        disponibilidadeRepository.deleteById(id);
    }

    // Regra: fim depois do início e sem sobreposição com outra faixa do mesmo dia
    private void validar(DisponibilidadeDTO dto, Long idIgnorado) {
        if (!dto.getHoraFim().isAfter(dto.getHoraInicio())) {
            throw new IllegalArgumentException("A hora de fim deve ser posterior à hora de início.");
        }

        boolean sobreposta = disponibilidadeRepository
                .findByProfissionalIdAndDiaSemana(dto.getProfissionalId(), dto.getDiaSemana()).stream()
                .filter(d -> !d.getId().equals(idIgnorado))
                .anyMatch(d -> dto.getHoraInicio().isBefore(d.getHoraFim())
                        && dto.getHoraFim().isAfter(d.getHoraInicio()));

        if (sobreposta) {
            throw new IllegalStateException("A faixa se sobrepõe a outra faixa do mesmo dia.");
        }
    }

    public DisponibilidadeDTO toDTO(Disponibilidade d) {
        return DisponibilidadeDTO.builder()
                .id(d.getId())
                .profissionalId(d.getProfissional() != null ? d.getProfissional().getId() : null)
                .diaSemana(d.getDiaSemana())
                .horaInicio(d.getHoraInicio())
                .horaFim(d.getHoraFim())
                .build();
    }
}
