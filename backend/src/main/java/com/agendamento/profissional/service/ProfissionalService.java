package com.agendamento.profissional.service;

import com.agendamento.profissional.dto.response.ProfissionalResponse;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.dto.ServicoDTO;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.servico.service.ServicoService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProfissionalService {

    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;
    private final ServicoService servicoService;

    // Busca do cliente por profissional (nome ou categoria); só lista quem tem usuário ativo e serviço público
    @Transactional(readOnly = true)
    public List<ProfissionalResponse> pesquisar(String termo) {
        List<Profissional> encontrados = (termo == null || termo.isBlank())
                ? profissionalRepository.findByUsuarioAtivoTrue()
                : profissionalRepository.buscar(termo.trim());
        return encontrados.stream()
                .map(this::toDTO)
                .filter(p -> !p.getServicos().isEmpty())
                .toList();
    }

    private ProfissionalResponse toDTO(Profissional p) {
        List<ServicoDTO> servicosPublicos = servicoRepository.findPublicosAtivosByProfissionalId(p.getId()).stream()
                .map(servicoService::toDTO)
                .toList();
        String especialidadeExibida = servicosPublicos.stream()
                .map(ServicoDTO::getCategoria)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .collect(Collectors.joining(", "));
        return ProfissionalResponse.builder()
                .id(p.getId())
                .nome(p.getUsuario().getNome())
                .especialidade(especialidadeExibida)
                .bannerUrl(p.getBannerUrl())
                .servicos(servicosPublicos)
                .build();
    }
}
