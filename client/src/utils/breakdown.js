// ============================================================
// AegisAI — Premium Breakdown Step Builder
// Converts the EMR calculation into human-readable steps
// ============================================================

const habitLevelLabel = { 0: 'Never', 1: 'Occasionally', 2: 'Moderate', 3: 'High' };
const habitPoints = { 0: 0, 1: 5, 2: 10, 3: 15 };
const occPerMille = {
  normal: 0, desk_job: 0, student: 0, homemaker: 0,
  athlete: 2, driver: 2, merchant_navy: 3,
  oil_industry: 3, oil_gas: 3, hazardous: 3, pilot: 6,
};

/**
 * Build a list of explanation steps from a user proposal object.
 * Each step: { id, label, icon, emrDelta, premiumDelta, running, reason, impact }
 * impact: 'increase' | 'decrease' | 'neutral'
 */
export function buildBreakdownSteps(user, calc) {
  const steps = [];
  const lifeSA = parseFloat(user.lifeCover) || 10000000;
  const cirSA  = parseFloat(user.cirCover)  || 5000000;
  const accSA  = parseFloat(user.accCover)  || 5000000;

  // Base rates (matches emr.js)
  function getRate(age) {
    const a = parseInt(age) || 30;
    if (a <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (a <= 40) return { life: 3.0, accident: 1.0, cir: 6.0 };
    if (a <= 45) return { life: 4.5, accident: 1.0, cir: 12.0 };
    if (a <= 50) return { life: 6.0, accident: 1.0, cir: 15.0 };
    if (a <= 55) return { life: 7.5, accident: 1.5, cir: 20.0 };
    return               { life: 9.0, accident: 1.5, cir: 25.0 };
  }

  const rate = getRate(user.age);
  const lifeBase = Math.round((rate.life * lifeSA) / 1000);
  const accBase  = Math.round((rate.accident * accSA) / 1000);
  const cirBase  = Math.round((rate.cir * cirSA) / 1000);
  const baseTotal = lifeBase + accBase + cirBase;

  let runningEMR = 0;
  let runningPremium = baseTotal;

  // Helper to estimate premium delta from EMR delta
  // Using simplified: ~₹(emrDelta * baseTotal / 50) as rough premium impact
  const approxPremiumDelta = (emrDelta) => Math.round(emrDelta * baseTotal / 50);

  // Step 0: Base Premium
  steps.push({
    id: 'base',
    label: 'Base Premium',
    icon: '🏛️',
    emrDelta: 0,
    premiumDelta: baseTotal,
    running: runningPremium,
    reason: `Calculated from your age (${user.age}yr), life cover ₹${(lifeSA/100000).toFixed(0)}L + accident ₹${(accSA/100000).toFixed(0)}L + CIR ₹${(cirSA/100000).toFixed(0)}L at standard base rate.`,
    impact: 'neutral',
    emrRunning: 0,
  });

  // Step 1: BMI
  if (calc.breakdown.bmi !== 0) {
    const bmi = parseFloat(user.bmi) || 0;
    let bmiLabel = '';
    if (bmi < 18) bmiLabel = 'Underweight';
    else if (bmi <= 23) bmiLabel = 'Normal';
    else if (bmi <= 28) bmiLabel = 'Slightly Overweight';
    else if (bmi <= 33) bmiLabel = 'Overweight';
    else bmiLabel = 'Obese';

    runningEMR += calc.breakdown.bmi;
    const delta = approxPremiumDelta(calc.breakdown.bmi);
    runningPremium += delta;
    steps.push({
      id: 'bmi',
      label: 'BMI Risk',
      icon: '⚖️',
      emrDelta: calc.breakdown.bmi,
      premiumDelta: delta,
      running: runningPremium,
      reason: `Your BMI is ${bmi.toFixed(1)} (${bmiLabel}). ${bmi > 23 ? 'Higher BMI increases health risk, raising your premium.' : 'Good BMI range — no extra charge.'}`,
      impact: calc.breakdown.bmi > 0 ? 'increase' : 'neutral',
      emrRunning: runningEMR,
    });
  }

  // Step 2: Family History
  if (calc.breakdown.family !== 0) {
    runningEMR += calc.breakdown.family;
    const delta = approxPremiumDelta(calc.breakdown.family);
    runningPremium += delta;
    const familyMap = {
      both_above_65: 'Both parents alive above 65 — excellent longevity signal. Discount applied!',
      one_above_65:  'One parent above 65 — good longevity sign. Small discount applied.',
      both_below_65: 'Both parents passed before 65 — indicates possible hereditary risk.',
    };
    steps.push({
      id: 'family',
      label: 'Family History',
      icon: '👨‍👩‍👧',
      emrDelta: calc.breakdown.family,
      premiumDelta: delta,
      running: runningPremium,
      reason: familyMap[user.parentStatus] || 'Family history affects your genetic risk profile.',
      impact: calc.breakdown.family < 0 ? 'decrease' : calc.breakdown.family > 0 ? 'increase' : 'neutral',
      emrRunning: runningEMR,
    });
  }

  // Step 3: Health Conditions
  if (calc.breakdown.health > 0) {
    runningEMR += calc.breakdown.health;
    const delta = approxPremiumDelta(calc.breakdown.health);
    runningPremium += delta;
    const diseases = user.diseases || {};
    const activeConditions = Object.entries(diseases)
      .filter(([, v]) => parseInt(v) > 0)
      .map(([k]) => k.replace('_', ' '))
      .join(', ');
    steps.push({
      id: 'health',
      label: 'Health Conditions',
      icon: '🏥',
      emrDelta: calc.breakdown.health,
      premiumDelta: delta,
      running: runningPremium,
      reason: `Detected conditions: ${activeConditions || 'none'}. Each condition increases health risk scoring based on severity level (1-4).`,
      impact: 'increase',
      emrRunning: runningEMR,
    });
  }

  // Step 4: Co-morbidity
  if (calc.breakdown.comorbidity > 0) {
    runningEMR += calc.breakdown.comorbidity;
    const delta = approxPremiumDelta(calc.breakdown.comorbidity);
    runningPremium += delta;
    const count = Object.values(user.diseases || {}).filter(v => parseInt(v) > 0).length;
    steps.push({
      id: 'comorbidity',
      label: 'Multiple Conditions',
      icon: '⚕️',
      emrDelta: calc.breakdown.comorbidity,
      premiumDelta: delta,
      running: runningPremium,
      reason: `You have ${count} health conditions. When multiple conditions exist together, the combined risk is higher than their individual sum — called co-morbidity loading.`,
      impact: 'increase',
      emrRunning: runningEMR,
    });
  }

  // Step 5: Lifestyle Habits
  if (calc.breakdown.lifestyle > 0) {
    runningEMR += calc.breakdown.lifestyle;
    const delta = approxPremiumDelta(calc.breakdown.lifestyle);
    runningPremium += delta;
    const habits = [];
    const sLevel = parseInt(user.smoking) || 0;
    const aLevel = parseInt(user.alcohol) || 0;
    const tLevel = parseInt(user.tobacco) || 0;
    if (sLevel > 0) habits.push(`Smoking (${habitLevelLabel[sLevel]})`);
    if (aLevel > 0) habits.push(`Alcohol (${habitLevelLabel[aLevel]})`);
    if (tLevel > 0) habits.push(`Tobacco (${habitLevelLabel[tLevel]})`);
    steps.push({
      id: 'lifestyle',
      label: 'Lifestyle Habits',
      icon: '🚬',
      emrDelta: calc.breakdown.lifestyle,
      premiumDelta: delta,
      running: runningPremium,
      reason: `Active habits: ${habits.join(', ')}. Each habit increases your insurance risk based on usage frequency.`,
      impact: 'increase',
      emrRunning: runningEMR,
    });
  }

  // Step 6: Habit Combo Loading
  if (calc.breakdown.habitCombo > 0) {
    runningEMR += calc.breakdown.habitCombo;
    const delta = approxPremiumDelta(calc.breakdown.habitCombo);
    runningPremium += delta;
    steps.push({
      id: 'habitCombo',
      label: 'Habit Combination Risk',
      icon: '⚠️',
      emrDelta: calc.breakdown.habitCombo,
      premiumDelta: delta,
      running: runningPremium,
      reason: `Multiple risky habits together compound the health risk — similar to co-morbidity loading for conditions. This is an extra combined-habit penalty.`,
      impact: 'increase',
      emrRunning: runningEMR,
    });
  }

  // Step 7: Risk Class Loading (the actual loading difference)
  const loadingDelta = calc.total - runningPremium;
  if (Math.abs(loadingDelta) > 50) {
    steps.push({
      id: 'loading',
      label: `Risk Class ${calc.lifeClass} Loading`,
      icon: '📊',
      emrDelta: 0,
      premiumDelta: loadingDelta,
      running: calc.total,
      reason: `Your total EMR score is ${calc.emr}, placing you in Life Class ${calc.lifeClass} (Factor ×${calc.lifeFactor}). This multiplier is applied to the final base premium.`,
      impact: loadingDelta > 0 ? 'increase' : loadingDelta < 0 ? 'decrease' : 'neutral',
      emrRunning: runningEMR,
    });
  }

  return steps;
}

/** Returns the 3 biggest impact factors from a steps array */
export function getTopFactors(steps) {
  return steps
    .filter(s => s.id !== 'base')
    .sort((a, b) => Math.abs(b.premiumDelta) - Math.abs(a.premiumDelta))
    .slice(0, 3);
}

/** Returns the potential savings if user quits all habits */
export function calculateHabitSavings(user, calc) {
  const noHabitUser = { ...user, smoking: 0, alcohol: 0, tobacco: 0 };
  const ls = calc.breakdown.lifestyle + calc.breakdown.habitCombo;
  const lifeSA = parseFloat(user.lifeCover) || 10000000;
  const cirSA  = parseFloat(user.cirCover)  || 5000000;
  const accSA  = parseFloat(user.accCover)  || 5000000;
  function getRate(age) {
    const a = parseInt(age) || 30;
    if (a <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (a <= 40) return { life: 3.0, accident: 1.0, cir: 6.0 };
    return { life: 4.5, accident: 1.0, cir: 12.0 };
  }
  const rate = getRate(user.age);
  const baseTotal = Math.round((rate.life * lifeSA + rate.accident * accSA + rate.cir * cirSA) / 1000);
  return Math.round(ls * baseTotal / 50);
}
