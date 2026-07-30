'use server'

export interface PrescriptionAutoFill {
  series: number
  reps_min: number
  reps_max: number
  rir_target: number
  rpe_target: number
  rest_seconds: number
}

export interface ClientProfile {
  objective: string
  level: string
  experienceMonths: number
}

export interface MesocycleContext {
  phase: string
  volumeWeek: 'crescente' | 'decrescente' | 'constante' | 'ondulatoria'
}

export function calculatePrescription(
  clientProfile: ClientProfile,
  mesocycleContext: MesocycleContext,
): PrescriptionAutoFill {
  // Lógica baseada em objetivo + fase + estratégia de carga
  let series = 3
  let reps_min = 8
  let reps_max = 12
  let rir_target = 2
  let rpe_target = 7
  let rest_seconds = 90

  // Ajustar por objetivo
  if (clientProfile.objective === 'hipertrofia') {
    reps_min = 8
    reps_max = 12
    series = 4
    rir_target = 2
    rpe_target = 7
  } else if (clientProfile.objective === 'forca') {
    reps_min = 3
    reps_max = 5
    series = 5
    rir_target = 1
    rpe_target = 8
    rest_seconds = 180
  } else if (clientProfile.objective === 'resistencia') {
    reps_min = 12
    reps_max = 20
    series = 3
    rir_target = 3
    rpe_target = 6
    rest_seconds = 45
  } else if (clientProfile.objective === 'emagrecimento') {
    reps_min = 12
    reps_max = 15
    series = 3
    rir_target = 2
    rpe_target = 6
    rest_seconds = 60
  }

  // Ajustar por fase do mesociclo
  if (mesocycleContext.phase === 'intensificacao') {
    rir_target = Math.max(1, rir_target - 1)
    rpe_target = Math.min(9, rpe_target + 1)
    rest_seconds = Math.ceil(rest_seconds * 1.2)
  } else if (mesocycleContext.phase === 'deload') {
    series = Math.max(2, series - 1)
    rir_target = Math.min(rpe_target - 3, rir_target + 2)
    rpe_target = Math.max(4, rpe_target - 2)
  } else if (mesocycleContext.phase === 'adaptacao_anatomica') {
    reps_min = Math.max(reps_min, 10)
    reps_max = Math.max(reps_max, 15)
    rpe_target = Math.max(5, rpe_target - 1)
  }

  // Ajustar por estratégia de carga da semana
  if (mesocycleContext.volumeWeek === 'crescente') {
    if (clientProfile.experienceMonths < 6) {
      series = Math.ceil(series * 0.9)
    }
  } else if (mesocycleContext.volumeWeek === 'decrescente') {
    rpe_target = Math.min(9, rpe_target + 1)
  }

  return {
    series,
    reps_min,
    reps_max,
    rir_target,
    rpe_target,
    rest_seconds,
  }
}
