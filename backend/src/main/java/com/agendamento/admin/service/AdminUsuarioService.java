package com.agendamento.admin.service;

import com.agendamento.admin.dto.response.UsuarioAdminResponse;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.model.Servico;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ServicoRepository servicoRepository;

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listarUsuarios(PapelUsuario papel, Boolean ativo, String busca) {
        Map<Long, Profissional> profsPorUsuario = profissionalRepository.findAll().stream()
                .collect(Collectors.toMap(p -> p.getUsuario().getId(), Function.identity(), (a, b) -> a));
        Map<Long, List<Servico>> servicosPorProfissional = servicoRepository.findAll().stream()
                .filter(s -> s.getProfissional() != null)
                .collect(Collectors.groupingBy(s -> s.getProfissional().getId()));

        String termo = busca != null ? busca.trim().toLowerCase(Locale.ROOT) : "";

        return usuarioRepository.findAll().stream()
                .filter(u -> papel == null || u.getPapel() == papel)
                .filter(u -> ativo == null || Boolean.TRUE.equals(u.getAtivo()) == ativo)
                .map(u -> {
                    Profissional pro = profsPorUsuario.get(u.getId());
                    List<Servico> servicos = pro != null ? servicosPorProfissional.getOrDefault(pro.getId(), List.of()) : List.of();
                    return toDTO(u, servicos);
                })
                .filter(dto -> termo.isEmpty()
                        || dto.getNome().toLowerCase(Locale.ROOT).contains(termo)
                        || dto.getEmail().toLowerCase(Locale.ROOT).contains(termo))
                .sorted(Comparator.comparing((UsuarioAdminResponse u) -> u.getPapel().name())
                        .thenComparing(UsuarioAdminResponse::getNome, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public UsuarioAdminResponse alternarStatus(Long adminUsuarioId, Long usuarioId) {
        if (adminUsuarioId.equals(usuarioId)) {
            throw new IllegalStateException("Você não pode desativar a própria conta de administrador.");
        }
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado: " + usuarioId));
        if (usuario.getPapel() == PapelUsuario.ADMIN) {
            throw new IllegalStateException("Não é possível alterar o status de outro administrador.");
        }
        usuario.setAtivo(!Boolean.TRUE.equals(usuario.getAtivo()));
        Usuario salvo = usuarioRepository.save(usuario);
        List<Servico> servicos = salvo.getPapel() == PapelUsuario.PROFISSIONAL
                ? profissionalRepository.findByUsuarioId(salvo.getId())
                        .map(p -> servicoRepository.findByProfissionalId(p.getId()))
                        .orElse(List.of())
                : List.of();
        return toDTO(salvo, servicos);
    }

    private UsuarioAdminResponse toDTO(Usuario u, List<Servico> servicos) {
        String nome = (u.getNome() != null && !u.getNome().isBlank())
                ? u.getNome()
                : (u.getPapel() == PapelUsuario.ADMIN ? "Administrador" : "");

        String especialidade = null;
        if (u.getPapel() == PapelUsuario.PROFISSIONAL) {
            String categorias = servicos.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getAtivo()) && s.getCategoria() != null)
                    .map(s -> s.getCategoria().getNome())
                    .distinct()
                    .collect(Collectors.joining(", "));
            if (!categorias.isBlank()) {
                especialidade = categorias;
            }
        }

        return UsuarioAdminResponse.builder()
                .id(u.getId())
                .nome(nome)
                .email(u.getEmail())
                .telefone(u.getTelefone())
                .especialidade(especialidade)
                .papel(u.getPapel())
                .ativo(Boolean.TRUE.equals(u.getAtivo()))
                .criadoEm(u.getCriadoEm())
                .build();
    }
}
