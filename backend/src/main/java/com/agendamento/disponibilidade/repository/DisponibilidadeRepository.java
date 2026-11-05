package com.agendamento.disponibilidade.repository;

import com.agendamento.disponibilidade.model.DiaSemana;
import com.agendamento.disponibilidade.model.Disponibilidade;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DisponibilidadeRepository extends JpaRepository<Disponibilidade, Long> {
    List<Disponibilidade> findByProfissionalId(Long profissionalId);
    List<Disponibilidade> findByProfissionalIdAndDiaSemana(Long profissionalId, DiaSemana diaSemana);
}
