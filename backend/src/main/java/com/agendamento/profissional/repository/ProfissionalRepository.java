package com.agendamento.profissional.repository;

import com.agendamento.profissional.model.Profissional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProfissionalRepository extends JpaRepository<Profissional, Long> {

    // Busca do cliente por profissional: nome ou especialidade
    @Query("SELECT p FROM Profissional p WHERE " +
           "LOWER(p.nome) LIKE LOWER(CONCAT('%', :termo, '%')) OR " +
           "LOWER(p.especialidade) LIKE LOWER(CONCAT('%', :termo, '%')) " +
           "ORDER BY p.nome")
    List<Profissional> buscar(@Param("termo") String termo);
}
