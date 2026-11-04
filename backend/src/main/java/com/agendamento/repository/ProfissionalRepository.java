package com.agendamento.repository;

import com.agendamento.model.Profissional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProfissionalRepository extends JpaRepository<Profissional, Long> {
    Optional<Profissional> findByUsuarioId(Long usuarioId);
    List<Profissional> findByEspecialidadeContainingIgnoreCase(String especialidade);
    List<Profissional> findByNomeContainingIgnoreCase(String nome);
}
