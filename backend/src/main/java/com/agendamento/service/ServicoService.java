package com.agendamento.service;

import com.agendamento.dto.ServicoDTO;
import com.agendamento.model.Profissional;
import com.agendamento.model.Servico;
import com.agendamento.repository.ProfissionalRepository;
import com.agendamento.repository.ServicoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final ProfissionalRepository profissionalRepository;

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarTodosAtivos() {
        return servicoRepository.findByAtivoTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarPorProfissional(Long profissionalId) {
        return servicoRepository.findByProfissionalId(profissionalId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> pesquisar(String termo) {
        if (termo == null || termo.isBlank()) {
            return listarTodosAtivos();
        }
        return servicoRepository.findByNomeContainingIgnoreCaseAndAtivoTrue(termo).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ServicoDTO criar(ServicoDTO dto) {
        Profissional profissional = profissionalRepository.findById(dto.getProfissionalId())
                .orElseThrow(() -> new IllegalArgumentException("Profissional não encontrado: " + dto.getProfissionalId()));

        Servico servico = Servico.builder()
                .nome(dto.getNome())
                .descricao(dto.getDescricao())
                .duracaoMinutos(dto.getDuracaoMinutos())
                .preco(dto.getPreco())
                .ativo(dto.getAtivo() != null ? dto.getAtivo() : true)
                .profissional(profissional)
                .build();

        return toDTO(servicoRepository.save(servico));
    }

    @Transactional
    public ServicoDTO atualizar(Long id, ServicoDTO dto) {
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado: " + id));

        servico.setNome(dto.getNome());
        servico.setDescricao(dto.getDescricao());
        servico.setDuracaoMinutos(dto.getDuracaoMinutos());
        servico.setPreco(dto.getPreco());
        if (dto.getAtivo() != null) {
            servico.setAtivo(dto.getAtivo());
        }

        return toDTO(servicoRepository.save(servico));
    }

    @Transactional
    public void alternarStatus(Long id) {
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviço não encontrado: " + id));
        servico.setAtivo(!servico.getAtivo());
        servicoRepository.save(servico);
    }

    @Transactional
    public void excluir(Long id) {
        if (!servicoRepository.existsById(id)) {
            throw new IllegalArgumentException("Serviço não encontrado: " + id);
        }
        servicoRepository.deleteById(id);
    }

    public ServicoDTO toDTO(Servico s) {
        return ServicoDTO.builder()
                .id(s.getId())
                .nome(s.getNome())
                .descricao(s.getDescricao())
                .duracaoMinutos(s.getDuracaoMinutos())
                .preco(s.getPreco())
                .ativo(s.getAtivo())
                .profissionalId(s.getProfissional() != null ? s.getProfissional().getId() : null)
                .profissionalNome(s.getProfissional() != null ? s.getProfissional().getNome() : null)
                .build();
    }
}
