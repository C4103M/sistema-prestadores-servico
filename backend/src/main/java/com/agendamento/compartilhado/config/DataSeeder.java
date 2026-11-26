package com.agendamento.compartilhado.config;

import com.agendamento.agendamento.model.Agendamento;
import com.agendamento.agendamento.model.StatusAgendamento;
import com.agendamento.agendamento.repository.AgendamentoRepository;
import com.agendamento.categoria.model.Categoria;
import com.agendamento.categoria.model.StatusCategoria;
import com.agendamento.categoria.repository.CategoriaRepository;
import com.agendamento.cliente.model.Cliente;
import com.agendamento.cliente.repository.ClienteRepository;
import com.agendamento.disponibilidade.model.DiaSemana;
import com.agendamento.disponibilidade.model.Disponibilidade;
import com.agendamento.disponibilidade.repository.DisponibilidadeRepository;
import com.agendamento.profissional.model.Profissional;
import com.agendamento.profissional.repository.ProfissionalRepository;
import com.agendamento.servico.model.Servico;
import com.agendamento.servico.repository.ServicoRepository;
import com.agendamento.usuario.model.PapelUsuario;
import com.agendamento.usuario.model.Usuario;
import com.agendamento.usuario.repository.UsuarioRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ClienteRepository clienteRepository;
    private final CategoriaRepository categoriaRepository;
    private final ServicoRepository servicoRepository;
    private final DisponibilidadeRepository disponibilidadeRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (usuarioRepository.count() > 0) {
            Map<String, Categoria> categorias = garantirCategoriasIniciais(null);
            vincularServicosSemCategoria(categorias);
            return;
        }

        String senhaPadrao = passwordEncoder.encode("123456");

        Usuario admin = usuarioRepository.save(Usuario.builder()
                .email("admin@agendefacil.com")
                .nome("Administrador")
                .senha(senhaPadrao)
                .papel(PapelUsuario.ADMIN)
                .ativo(true)
                .build());

        Map<String, Categoria> categorias = garantirCategoriasIniciais(admin);
        Categoria catBarbearia = categorias.get("Barbearia");
        Categoria catEstetica = categorias.get("Estética");
        Categoria catEletrica = categorias.get("Elétrica");

        Profissional carlos = criarProfissional("Carlos Silva", "Barbearia", "carlos@barbearia.com", senhaPadrao,
                "/imagens/categorias/barbearia.webp");
        Profissional beatriz = criarProfissional("Beatriz Mendes", "Estética", "beatriz@estetica.com", senhaPadrao,
                "/imagens/categorias/estetica.jpg");
        Profissional marcos = criarProfissional("Marcos Andrade", "Elétrica residencial", "marcos@eletrica.com", senhaPadrao,
                "/imagens/categorias/eletrica.jpg");

        Cliente lucas = criarCliente("Lucas Pereira", "(11) 91234-5678", "lucas@email.com", senhaPadrao);
        Cliente mariana = criarCliente("Mariana Souza", "(11) 92345-6789", "mariana@email.com", senhaPadrao);
        Cliente rafael = criarCliente("Rafael Lima", "(11) 93456-7890", "rafael@email.com", senhaPadrao);
        Cliente ana = criarCliente("Ana Costa", "(11) 94567-8901", "ana@email.com", senhaPadrao);
        Cliente joao = criarCliente("João Martins", "(11) 95678-9012", "joao@email.com", senhaPadrao);
        Cliente pedro = criarCliente("Pedro Alves", "(11) 96789-0123", "pedro@email.com", senhaPadrao);

        Servico corte = criarServico(carlos, "Corte degradê", "Corte na máquina e tesoura, lavagem e finalização.", catBarbearia, 45, "50.00");
        Servico barba = criarServico(carlos, "Barba com toalha quente", "Modelagem na navalha, toalha quente e óleo hidratante.", catBarbearia, 30, "40.00");
        Servico corteBarba = criarServico(carlos, "Corte + barba", "Corte completo, barba e acabamento da sobrancelha.", catBarbearia, 75, "85.00");
        Servico limpeza = criarServico(beatriz, "Limpeza de pele", "Extração, esfoliação e máscara calmante.", catEstetica, 60, "140.00");
        Servico massagem = criarServico(beatriz, "Massagem relaxante", "Massagem corporal com pedras quentes.", catEstetica, 50, "120.00");
        Servico quadro = criarServico(marcos, "Revisão do quadro elétrico", "Diagnóstico de sobrecarga, aperto de bornes e troca de disjuntores.", catEletrica, 90, "180.00");
        Servico chuveiro = criarServico(marcos, "Instalação de chuveiro", "Instalação com troca de resistência e teste de aterramento.", catEletrica, 60, "120.00");

        List<DiaSemana> uteis = List.of(DiaSemana.SEGUNDA, DiaSemana.TERCA, DiaSemana.QUARTA, DiaSemana.QUINTA, DiaSemana.SEXTA);
        List<Disponibilidade> disponibilidades = new ArrayList<>();
        uteis.forEach(d -> {
            disponibilidades.add(faixa(carlos, d, 9, 0, 12, 0));
            disponibilidades.add(faixa(carlos, d, 13, 0, 19, 0));
            disponibilidades.add(faixa(marcos, d, 8, 0, 17, 0));
        });
        disponibilidades.add(faixa(carlos, DiaSemana.SABADO, 8, 0, 14, 0));
        List.of(DiaSemana.TERCA, DiaSemana.QUARTA, DiaSemana.QUINTA, DiaSemana.SEXTA, DiaSemana.SABADO)
                .forEach(d -> disponibilidades.add(faixa(beatriz, d, 10, 0, 18, 0)));
        disponibilidadeRepository.saveAll(disponibilidades);

        LocalDate hoje = LocalDate.now();
        LocalDate prox1 = proximoDia(hoje, false);
        LocalDate prox2 = proximoDia(prox1, false);
        LocalDate proxBeatriz = proximoDia(hoje, true);
        LocalDate ant1 = diaAnterior(hoje, false);
        LocalDate ant2 = diaAnterior(ant1, false);
        LocalDate ant3 = diaAnterior(ant2, false);
        LocalDate antBeatriz = diaAnterior(hoje, true);

        List<Agendamento> agendamentos = List.of(
                agendamento(mariana, carlos, corte, ant3, 9, 30, StatusAgendamento.CONCLUIDO),
                agendamento(rafael, carlos, corteBarba, ant3, 14, 0, StatusAgendamento.FALTOU),
                agendamento(ana, carlos, barba, ant2, 10, 0, StatusAgendamento.CONCLUIDO),
                agendamento(lucas, carlos, corte, ant2, 16, 0, StatusAgendamento.CANCELADO),
                agendamento(joao, carlos, corteBarba, ant1, 11, 0, StatusAgendamento.CONCLUIDO),
                agendamento(pedro, beatriz, limpeza, antBeatriz, 11, 0, StatusAgendamento.CONCLUIDO),
                agendamento(lucas, beatriz, massagem, antBeatriz, 15, 0, StatusAgendamento.CONCLUIDO),
                agendamento(rafael, marcos, quadro, ant1, 9, 0, StatusAgendamento.CONCLUIDO),
                agendamento(lucas, carlos, corte, prox1, 10, 0, StatusAgendamento.AGENDADO),
                agendamento(ana, carlos, corteBarba, prox1, 14, 0, StatusAgendamento.AGENDADO),
                agendamento(pedro, carlos, barba, prox2, 15, 30, StatusAgendamento.AGENDADO),
                agendamento(lucas, beatriz, limpeza, proxBeatriz, 14, 0, StatusAgendamento.AGENDADO),
                agendamento(mariana, marcos, chuveiro, prox2, 10, 0, StatusAgendamento.AGENDADO)
        );
        agendamentoRepository.saveAll(agendamentos);

        log.info("Seed inicial concluído: {} categorias, 3 profissionais, 6 clientes, 7 serviços e {} agendamentos.",
                categorias.size(), agendamentos.size());
    }

    private Map<String, Categoria> garantirCategoriasIniciais(Usuario admin) {
        Usuario criador = admin != null
                ? admin
                : usuarioRepository.findByEmail("admin@agendefacil.com").orElse(null);

        Categoria barbearia = criarSeFaltar("Barbearia",
                "Cortes masculinos, barba na navalha e acabamento profissional.",
                "/imagens/categorias/barbearia.webp", criador);
        Categoria estetica = criarSeFaltar("Estética",
                "Limpeza de pele, massagens e cuidados faciais e corporais.",
                "/imagens/categorias/estetica.jpg", criador);
        Categoria eletrica = criarSeFaltar("Elétrica",
                "Instalações, revisões de quadro e reparos elétricos residenciais.",
                "/imagens/categorias/eletrica.jpg", criador);
        Categoria outros = criarSeFaltar("Outros",
                "Serviços gerais, manutenção e atendimentos especializados.",
                "/imagens/categorias/outros.jpg", criador);

        return Map.of(
                "Barbearia", barbearia,
                "Estética", estetica,
                "Elétrica", eletrica,
                "Outros", outros
        );
    }

    private Categoria criarSeFaltar(String nome, String shortDescription, String imagemUrl, Usuario criador) {
        return categoriaRepository.findByNomeIgnoreCase(nome)
                .orElseGet(() -> categoriaRepository.save(Categoria.builder()
                        .nome(nome)
                        .shortDescription(shortDescription)
                        .imagemUrl(imagemUrl)
                        .status(StatusCategoria.APROVADA)
                        .criadoPor(criador)
                        .build()));
    }

    private void vincularServicosSemCategoria(Map<String, Categoria> iniciais) {
        List<Servico> semCategoria = servicoRepository.findByCategoriaEntidadeIsNull();
        if (semCategoria.isEmpty()) {
            return;
        }
        Categoria fallback = iniciais.get("Outros");
        for (Servico s : semCategoria) {
            Categoria alvo = s.getCategoria() != null
                    ? categoriaRepository.findByNomeIgnoreCase(s.getCategoria().trim()).orElse(fallback)
                    : fallback;
            s.setCategoriaEntidade(alvo);
            s.setCategoria(alvo.getNome());
        }
        servicoRepository.saveAll(semCategoria);
    }

    private Profissional criarProfissional(String nome, String especialidade, String email, String senhaHash,
                                           String bannerUrl) {
        Usuario u = usuarioRepository.save(Usuario.builder()
                .email(email)
                .senha(senhaHash)
                .papel(PapelUsuario.PROFISSIONAL)
                .ativo(true)
                .build());
        return profissionalRepository.save(Profissional.builder()
                .nome(nome)
                .especialidade(especialidade)
                .bannerUrl(bannerUrl)
                .usuario(u)
                .build());
    }

    private Cliente criarCliente(String nome, String telefone, String email, String senhaHash) {
        Usuario u = usuarioRepository.save(Usuario.builder()
                .email(email)
                .senha(senhaHash)
                .papel(PapelUsuario.CLIENTE)
                .ativo(true)
                .build());
        return clienteRepository.save(Cliente.builder()
                .nome(nome)
                .telefone(telefone)
                .usuario(u)
                .build());
    }

    private Servico criarServico(Profissional prof, String nome, String descricao, Categoria categoria, int duracao, String preco) {
        return servicoRepository.save(Servico.builder()
                .profissional(prof)
                .nome(nome)
                .descricao(descricao)
                .categoria(categoria.getNome())
                .categoriaEntidade(categoria)
                .duracaoMinutos(duracao)
                .preco(new BigDecimal(preco))
                .ativo(true)
                .build());
    }

    private Disponibilidade faixa(Profissional prof, DiaSemana dia, int hIni, int mIni, int hFim, int mFim) {
        return Disponibilidade.builder()
                .profissional(prof)
                .diaSemana(dia)
                .horaInicio(LocalTime.of(hIni, mIni))
                .horaFim(LocalTime.of(hFim, mFim))
                .build();
    }

    private Agendamento agendamento(Cliente cliente, Profissional prof, Servico servico,
                                    LocalDate dia, int hora, int minuto, StatusAgendamento status) {
        LocalDateTime inicio = LocalDateTime.of(dia, LocalTime.of(hora, minuto));
        return Agendamento.builder()
                .cliente(cliente)
                .profissional(prof)
                .servico(servico)
                .dataHoraInicio(inicio)
                .dataHoraFim(inicio.plusMinutes(servico.getDuracaoMinutos()))
                .preco(servico.getPreco())
                .status(status)
                .criadoEm(inicio.minusDays(2))
                .build();
    }

    private LocalDate proximoDia(LocalDate base, boolean exigeBeatriz) {
        LocalDate d = base.plusDays(1);
        while (!diaAtendimentoValido(d.getDayOfWeek(), exigeBeatriz)) {
            d = d.plusDays(1);
        }
        return d;
    }

    private LocalDate diaAnterior(LocalDate base, boolean exigeBeatriz) {
        LocalDate d = base.minusDays(1);
        while (!diaAtendimentoValido(d.getDayOfWeek(), exigeBeatriz)) {
            d = d.minusDays(1);
        }
        return d;
    }

    private boolean diaAtendimentoValido(DayOfWeek dow, boolean exigeBeatriz) {
        if (dow == DayOfWeek.SUNDAY || dow == DayOfWeek.SATURDAY) {
            return false;
        }
        return !exigeBeatriz || dow != DayOfWeek.MONDAY;
    }
}
