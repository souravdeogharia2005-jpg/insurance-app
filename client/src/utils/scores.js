// ============================================================
// AegisAI — Insurance Score Calculators
// Health Score, Insurance Score, Financial Protection Score
// Each returns 0-100 (higher = better)
// ============================================================

/**
 * Health Score — based on BMI, conditions, habits
 * 100 = perfect health  |  0 = very poor
 */
export function calcHealthScore(user, calc) {
  let score = 100;

  // BMI deductions
  const bmi = parseFloat(user.bmi) || 0;
  if (bmi > 0) {
    if      (bmi < 16) score -= 30;
    else if (bmi < 18) score -= 15;
    else if (bmi > 38) score -= 25;
    else if (bmi > 33) score -= 18;
    else if (bmi > 28) score -= 10;
    else if (bmi > 23) score -= 5;
  }

  // Conditions
  const diseases = user.diseases || {};
  for (const [key, sev] of Object.entries(diseases)) {
    const s = parseInt(sev) || 0;
    if (s === 1) score -= 5;
    else if (s === 2) score -= 10;
    else if (s === 3) score -= 15;
    else if (s === 4) score -= 20;
  }

  // Habits
  const habitLoss = { 0: 0, 1: 5, 2: 10, 3: 15 };
  score -= habitLoss[parseInt(user.smoking) || 0];
  score -= habitLoss[parseInt(user.alcohol) || 0];
  score -= habitLoss[parseInt(user.tobacco) || 0];

  // Family bonus
  if (user.parentStatus === 'both_above_65') score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Insurance Score — based on risk class + EMR
 * Higher EMR = lower score
 */
export function calcInsuranceScore(calc) {
  const emr = calc.emr || 0;
  // EMR 0 = 100, EMR 200+ = 0
  const raw = Math.max(0, 100 - (emr / 200) * 100);
  return Math.round(raw);
}

/**
 * Financial Protection Score — coverage vs income adequacy
 * Rule of thumb: life cover should be 10-15× annual income
 */
export function calcFinancialScore(user) {
  const income = parseFloat(user.income) || 500000;
  const lifeSA = parseFloat(user.lifeCover) || 10000000;
  const ratio = lifeSA / income;
  // Ideal is 10-15x income
  let score = 0;
  if (ratio >= 15) score = 100;
  else if (ratio >= 10) score = 85;
  else if (ratio >= 7)  score = 70;
  else if (ratio >= 5)  score = 55;
  else if (ratio >= 3)  score = 35;
  else score = 20;
  return Math.round(score);
}

/** Get color based on score (0-100) */
export function scoreColor(score) {
  if (score >= 75) return { color: '#22C55E', label: 'Excellent', bg: 'rgba(34,197,94,0.1)' };
  if (score >= 55) return { color: '#84CC16', label: 'Good',      bg: 'rgba(132,204,22,0.1)' };
  if (score >= 35) return { color: '#F59E0B', label: 'Fair',      bg: 'rgba(245,158,11,0.1)' };
  return                  { color: '#EF4444', label: 'Poor',      bg: 'rgba(239,68,68,0.1)' };
}

/** Claim probability estimate (%) over N years */
export function claimProbability(years, emr, age) {
  // Base annual probability increases with age and EMR
  const ageFactor = Math.max(0.01, (parseInt(age) - 20) / 100);
  const emrFactor = (emr || 0) / 200;
  const annualProb = 0.02 + ageFactor * 0.3 + emrFactor * 0.15;
  // P(claim in N years) = 1 - (1 - p)^N
  const prob = 1 - Math.pow(1 - Math.min(annualProb, 0.4), years);
  return Math.round(prob * 100);
}
