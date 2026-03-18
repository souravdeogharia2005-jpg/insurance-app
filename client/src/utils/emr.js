// ==========================================
// AegisAI - Strict Controlled Dataset EMR
// Updated March 2026 - Master Logic v5.0
// ==========================================

export function calculateInsurance(user) {
  let emr = 0;
  let breakdown = { bmi: 0, family: 0, health: 0, comorbidity: 0, lifestyle: 0, habitCombo: 0, occupation: 0 };

  // 1. BMI Calculation (29-33 -> +10)
  let bmiPts = 0;
  if (!user.bmi || user.bmi <= 0) bmiPts = 0;
  else if (user.bmi >= 29 && user.bmi <= 33) bmiPts = 10;
  else if (user.bmi > 33) bmiPts = 15;
  else if (user.bmi < 18) bmiPts = 10;
  else bmiPts = 0;
  
  emr += bmiPts;
  breakdown.bmi = bmiPts;

  // 2. Family History (Only >65 benefits)
  let famPts = 0;
  const famMap = { 
    "both_above_65": -10, 
    "one_above_65": -5, 
    "both_below_65": 0, // No penalty, just no benefit
    "below_65": 0 
  };
  famPts = famMap[user.family] || 0;
  emr += famPts;
  breakdown.family = famPts;

  // 3. Health Conditions (Direct Mapping)
  const diseaseTable = {
    thyroid: [0, 5, 7.5, 10],      // L1, L2, L3, L4
    asthma: [5, 7.5, 10, 12.5],
    hypertension: [5, 7.5, 10, 15],
    diabetes: [10, 15, 20, 25],
    gut_disorder: [5, 10, 15, 20]
  };

  let healthPts = 0;
  let diseaseCount = 0;

  if (user.diseases) {
    for (let key in user.diseases) {
      const severity = user.diseases[key]; // 1-4
      if (severity > 0 && diseaseTable[key]) {
        healthPts += diseaseTable[key][severity - 1];
        diseaseCount++;
      }
    }
  }
  emr += healthPts;
  breakdown.health = healthPts;

  // 4. Co-morbidity Loading
  let comorbPts = 0;
  if (diseaseCount === 2) comorbPts = 20;
  else if (diseaseCount >= 3) comorbPts = 40;
  emr += comorbPts;
  breakdown.comorbidity = comorbPts;

  // 5. Personal Habits
  const habitMap = { 0: 0, 1: 5, 2: 10, 3: 15 }; // 0: Never, 1: Occasional, 2: Moderate, 3: High
  let lifestylePts = 0;
  let habitCount = 0;

  if (user.habits) {
    for (let key in user.habits) {
      const level = user.habits[key];
      if (level > 0) {
        lifestylePts += habitMap[level] || 0;
        habitCount++;
      }
    }
  }
  emr += lifestylePts;
  breakdown.lifestyle = lifestylePts;

  // 6. Risky Habit Combo
  let comboPts = 0;
  if (habitCount === 2) comboPts = 20;
  else if (habitCount >= 3) comboPts = 40;
  emr += comboPts;
  breakdown.habitCombo = comboPts;

  // 7. Occupation Risk
  const occMap = {
    normal: 0,
    desk_job: 0,
    athlete: 0,
    pilot: 30,
    driver: 15,
    merchant_navy: 15,
    oil_industry: 15
  };
  let occupationPts = occMap[user.occupation] || 0;
  emr += occupationPts;
  breakdown.occupation = occupationPts;

  // Result Mapping (EMR -> Class)
  function getLifeClass(val) {
    if (val <= 20) return { class: 'I', factor: 1, color: '#10b981' };
    if (val <= 40) return { class: 'II', factor: 2, color: '#84cc16' };
    if (val <= 85) return { class: 'III', factor: 3, color: '#f59e0b' };
    if (val <= 120) return { class: 'IV', factor: 4, color: '#f97316' };
    return { class: 'V+', factor: 6, color: '#ef4444' };
  }

  const res = getLifeClass(emr);

  // Premium Calculations
  function getRates(age) {
    if (age <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (age <= 45) return { life: 3.0, accident: 1.0, cir: 6.0 };
    return { life: 4.5, accident: 1.5, cir: 10.0 };
  }

  const rate = getRates(user.age || 30);
  const loading = (res.factor * 0.25) + 1; // Factor 1 -> 1.25x (25% loading)

  const lifeBase = (rate.life * (user.lifeCover || 10000000)) / 1000;
  const cirBase = (rate.cir * (user.cirCover || 5000000)) / 1000;
  const accBase = (rate.accident * (user.accidentCover || 5000000)) / 1000;

  const lifePremium = Math.round(lifeBase * loading);
  const cirPremium = Math.round(cirBase * loading);
  const accPremium = Math.round(accBase * loading);

  return {
    emr,
    breakdown,
    lifeClass: res.class,
    lifeFactor: res.factor,
    healthClass: res.class, // Simple mapping
    healthFactor: res.factor,
    lifePremium,
    cirPremium,
    accPremium,
    total: lifePremium + cirPremium + accPremium,
    color: res.color
  };
}
