package com.agendamento.autenticacao.service;

import com.agendamento.autenticacao.dto.AuthResponse;
import com.agendamento.autenticacao.dto.CadastroRequest;
import com.agendamento.autenticacao.dto.LoginRequest;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.compartilhado.exceptions.CredenciaisInvalidasException;
import com.agendamento.compartilhado.exceptions.EmailJaCadastradoException;
import com.agendamento.compartilhado.exceptions.RecursoNaoEncontradoException;
import com.agendamento.compartilhado.exceptions.UsuarioDesativadoException;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.seguranca.JwtService;
import com.agendamento.seguranca.UsuarioAutenticado;
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // Hash descartável: quando o e-mail não existe, comparamos mesmo assim para o tempo de resposta
    // não denunciar se o e-mail está cadastrado (CT08).
    private final String hashFalso;

    public AuthService(UsuarioRepository usuarioRepository, ClienteRepository clienteRepository,
                       ProfissionalRepository profissionalRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.clienteRepository = clienteRepository;
        this.profissionalRepository = profissionalRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.hashFalso = passwordEncoder.encode("senha-inexistente");
    }

    @Transactional
    public AuthResponse cadastrarCliente(CadastroRequest dto) {
        String email = normalizar(dto.getEmail());
        garantirEmailLivre(email);

        Usuario usuario = novoUsuario(dto.getNome().trim(), email, dto.getTelefone().trim(), dto.getSenha(), PapelUsuario.CLIENTE);
        Cliente cliente = clienteRepository.save(Cliente.builder()
                .usuario(usuario)
                .build());

        return resposta(usuario, cliente.getId(), usuario.getNome());
    }

    @Transactional
    public AuthResponse cadastrarProfissional(CadastroRequest dto) {
        String email = normalizar(dto.getEmail());
        garantirEmailLivre(email);

        Usuario usuario = novoUsuario(dto.getNome().trim(), email, dto.getTelefone().trim(), dto.getSenha(), PapelUsuario.PROFISSIONAL);
        Profissional profissional = profissionalRepository.save(Profissional.builder()
                .usuario(usuario)
                .build());

        return resposta(usuario, profissional.getId(), usuario.getNome());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest dto) {
        Usuario usuario = usuarioRepository.findByEmail(normalizar(dto.getEmail())).orElse(null);
        boolean senhaConfere = passwordEncoder.matches(dto.getSenha(), usuario != null ? usuario.getSenha() : hashFalso);
        if (usuario == null || !senhaConfere) {
            throw new CredenciaisInvalidasException();
        }
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new UsuarioDesativadoException();
        }
        return respostaDoUsuario(usuario);
    }

    /** Renovação de sessão: o token ainda válido troca por um novo, com nova expiração. */
    @Transactional(readOnly = true)
    public AuthResponse renovar(Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(CredenciaisInvalidasException::new);
        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new UsuarioDesativadoException();
        }
        return respostaDoUsuario(usuario);
    }

    @Transactional(readOnly = true)
    public AuthResponse respostaDoUsuario(Usuario usuario) {
        return switch (usuario.getPapel()) {
            case CLIENTE -> {
                Cliente c = clienteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de cliente não encontrado."));
                yield resposta(usuario, c.getId(), usuario.getNome());
            }
            case PROFISSIONAL -> {
                Profissional p = profissionalRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new RecursoNaoEncontradoException("Perfil de profissional não encontrado."));
                yield resposta(usuario, p.getId(), usuario.getNome());
            }
            case ADMIN -> {
                String nomeAdmin = (usuario.getNome() != null && !usuario.getNome().isBlank())
                        ? usuario.getNome()
                        : "Administrador";
                yield resposta(usuario, null, nomeAdmin);
            }
        };
    }

    private AuthResponse resposta(Usuario usuario, Long perfilId, String nome) {
        UsuarioAutenticado autenticado = new UsuarioAutenticado(
                usuario.getId(), usuario.getEmail(), usuario.getPapel(), perfilId, nome);
        return AuthResponse.builder()
                .token(jwtService.gerar(autenticado))
                .tipo("Bearer")
                .expiraEmMinutos(jwtService.getExpiracaoMinutos())
                .usuarioId(usuario.getId())
                .perfilId(perfilId)
                .nome(nome)
                .email(usuario.getEmail())
                .papel(usuario.getPapel())
                .build();
    }

    private Usuario novoUsuario(String nome, String email, String telefone, String senha, PapelUsuario papel) {
        return usuarioRepository.save(Usuario.builder()
                .nome(nome)
                .email(email)
                .telefone(telefone)
                .senha(passwordEncoder.encode(senha))
                .papel(papel)
                .build());
    }

    private void garantirEmailLivre(String email) {
        if (usuarioRepository.existsByEmail(email)) {
            throw new EmailJaCadastradoException();
        }
    }

    private String normalizar(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
