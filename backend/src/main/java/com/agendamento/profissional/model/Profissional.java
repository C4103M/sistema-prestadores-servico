package com.agendamento.profissional.model;

import com.agendamento.disponibilidade.model.Disponibilidade;
import com.agendamento.servico.model.Servico;
import com.agendamento.usuario.model.Usuario;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "profissionais")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Profissional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    private String especialidade;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @OneToMany(mappedBy = "profissional", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Servico> servicos = new ArrayList<>();

    @OneToMany(mappedBy = "profissional", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Disponibilidade> disponibilidades = new ArrayList<>();
}
