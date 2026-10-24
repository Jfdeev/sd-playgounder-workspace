import { describe, expect, it } from 'vitest';
import { computeStreak, toLocalDay } from '../../src/lib/gamification/streak';

describe('toLocalDay (America/Sao_Paulo)', () => {
  it('perto da meia-noite em SP o dia é o de SP, não o de UTC', () => {
    // 02:30 UTC de 15/10 ainda é 23:30 de 14/10 em São Paulo (UTC−3)
    expect(toLocalDay(new Date('2026-10-15T02:30:00Z'))).toBe('2026-10-14');
    expect(toLocalDay(new Date('2026-10-15T03:30:00Z'))).toBe('2026-10-15');
  });

  it('usa o fuso real (com horário de verão), não um offset fixo', () => {
    // Em 2018 SP teve horário de verão (UTC−2) a partir de 04/11: 02:30 UTC já é 00:30 do dia seguinte
    expect(toLocalDay(new Date('2018-11-20T02:30:00Z'))).toBe('2018-11-20');
    // Fora do horário de verão (UTC−3), o mesmo horário UTC ainda é o dia anterior
    expect(toLocalDay(new Date('2018-06-20T02:30:00Z'))).toBe('2018-06-19');
  });
});

describe('computeStreak (FR-007, SC-006)', () => {
  it('sem atividade: zero', () => {
    expect(computeStreak([], '2026-10-23')).toEqual({ current: 0, best: 0 });
  });

  it('várias atividades no mesmo dia contam uma vez', () => {
    expect(computeStreak(['2026-10-23', '2026-10-23', '2026-10-23'], '2026-10-23')).toEqual({ current: 1, best: 1 });
  });

  it('dias seguidos somam, em qualquer ordem', () => {
    expect(computeStreak(['2026-10-23', '2026-10-21', '2026-10-22'], '2026-10-23')).toEqual({ current: 3, best: 3 });
  });

  it('última atividade ontem: a ofensiva ainda vale (o dia de hoje não acabou)', () => {
    expect(computeStreak(['2026-10-21', '2026-10-22'], '2026-10-23')).toEqual({ current: 2, best: 2 });
  });

  it('um dia inteiro sem atividade zera a atual e preserva o recorde', () => {
    expect(computeStreak(['2026-10-18', '2026-10-19', '2026-10-20'], '2026-10-23')).toEqual({ current: 0, best: 3 });
  });

  it('depois de um buraco, a atual recomeça e o recorde fica com a maior sequência', () => {
    expect(computeStreak(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-22', '2026-10-23'], '2026-10-23')).toEqual({ current: 2, best: 3 });
  });

  it('virada de mês e de ano', () => {
    expect(computeStreak(['2026-12-31', '2027-01-01'], '2027-01-01')).toEqual({ current: 2, best: 2 });
    expect(computeStreak(['2026-02-28', '2026-03-01'], '2026-03-01')).toEqual({ current: 2, best: 2 });
  });
});
