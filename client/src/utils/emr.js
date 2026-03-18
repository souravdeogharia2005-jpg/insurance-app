// ==========================================
// AegisAI - Industry-Standard EMR Calculator
// Based on exact Master AI Prompt Logic
// ==========================================

export function calculateInsurance(user) {
  let emr = 0;
  let breakdown = { bmi: 0, family: 0, health: 0, comorbidity: 0, lifestyle: 0, habitCombo: 0, occupation: 0 };

  // ✅ BMI
  let bmiPts = 0;
  if (!user.bmi || user.bmi <= 0) bmiPts = 0;
  else if (user.bmi < 18) bmiPts = 10;
  else if (user.bmi <= 23) bmiPts = 0;
  else if (user.bmi <= 28) bmiPts = 5;
  else if (user.bmi <= 33) bmiPts = 10;
  else bmiPts = 15;
  emr += bmiPts;
  breakdown.bmi = bmiPts;

  // ✅ Family History
  let famPts = 0;
  const famMap = { "both_above_65": -10, "one_above_65": -5, "both_below_65": 10 };
  famPts = famMap[user.parentStatus] || famMap[user.family] || 0;
  emr += famPts;
  breakdown.family = famPts;

  // ✅ Diseases
  const diseasePoints = {
    thyroid: [2.5, 5, 7.5, 10],
    asthma: [5, 7.5, 10, 12.5],
    hypertension: [5, 7.5, 10, 15],
    diabetes: [10, 15, 20, 25],
    gut_disorder: [5, 10, 15, 20]
  };

  let diseaseCount = 0;
  let healthPts = 0;

  if (user.diseases || user.severities) {
      const data = user.severities || user.diseases;
      for (let d in data) {
        let severity = data[d];
        const key = d === 'gut' ? 'gut_disorder' : d; // Handle legacy 'gut' id
        if (severity > 0 && diseasePoints[key]) {
          healthPts += diseasePoints[key][severity - 1];
          diseaseCount++;
        }
      }
  }
  emr += healthPts;
  breakdown.health = healthPts;

  // ✅ Co-morbidity
  let comorbPts = 0;
  if (diseaseCount === 2) comorbPts = 20;
  if (diseaseCount >= 3) comorbPts = 40;
  emr += comorbPts;
  breakdown.comorbidity = comorbPts;

  // ✅ Habits
  const habitPointsMap = { "never": 0, "occasional": 5, "moderate": 10, "heavy": 15 };
  let habitCount = 0;
  let lifePts = 0;

  const habits = ['smoking', 'alcohol', 'tobacco'];
  habits.forEach(h => {
    const val = user[h];
    if (val && val !== 'never') {
      lifePts += habitPointsMap[val] || 0;
      habitCount++;
    }
  });
  emr += lifePts;
  breakdown.lifestyle = lifePts;

  // ✅ Risky habits combo
  let comboPts = 0;
  if (habitCount === 2) comboPts = 20;
  if (habitCount >= 3) comboPts = 40;
  emr += comboPts;
  breakdown.habitCombo = comboPts;

  // ✅ Occupation Risk
  const occPoints = {
    desk_job: 0, light_manual: 0,
    moderate_physical: 15, heavy_manual: 15, merchant_navy: 15, oil_industry: 15, hazardous: 15, athlete: 15,
    pilot: 30, extreme_risk: 30
  };
  let occupationPts = occPoints[user.occupation] || 0;
  emr += occupationPts;
  breakdown.occupation = occupationPts;

  // ✅ Find Life Factor
  function getLifeFactor(emr) {
    if (emr <= 35) return 1;
    if (emr <= 60) return 2;
    if (emr <= 85) return 3;
    if (emr <= 120) return 4;
    if (emr <= 170) return 6;
    if (emr <= 225) return 8;
    if (emr <= 275) return 10;
    if (emr <= 350) return 12;
    if (emr <= 450) return 16;
    return 20;
  }

  function getLifeClass(emr) {
    if (emr <= 35) return 'I';
    if (emr <= 60) return 'II';
    if (emr <= 85) return 'III';
    if (emr <= 120) return 'IV';
    if (emr <= 170) return 'V';
    if (emr <= 225) return 'VI';
    if (emr <= 275) return 'VII';
    if (emr <= 350) return 'VIII';
    if (emr <= 450) return 'IX';
    return 'X';
  }

  // ✅ Health Factor
  function getHealthFactor(emr) {
    if (emr <= 20) return 0;
    if (emr <= 35) return 1;
    if (emr <= 60) return 2;
    if (emr <= 75) return 3;
    return 4;
  }

  function getHealthClass(emr) {
    if (emr <= 20) return 'Std';
    if (emr <= 35) return 'I';
    if (emr <= 60) return 'II';
    if (emr <= 75) return 'III';
    return 'IV';
  }

  let lifeFactor = getLifeFactor(emr);
  let lifeClass = getLifeClass(emr);
  let healthFactor = getHealthFactor(emr);
  let healthClass = getHealthClass(emr);

  // ✅ Get Rates
  function getRate(age) {
    if (age <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (age <= 40) return { life: 3.0, accident: 1.0, cir: 6.0 };
    if (age <= 45) return { life: 4.5, accident: 1.0, cir: 12.0 };
    if (age <= 50) return { life: 6.0, accident: 1.0, cir: 15.0 };
    if (age <= 55) return { life: 7.5, accident: 1.5, cir: 20.0 };
    return { life: 9.0, accident: 1.5, cir: 25.0 };
  }

  let rate = getRate(user.age || 30);

  // ✅ Sum Assured
  let lifeSA = user.lifeCover || 10000000;
  let cirSA = user.cirCover || 5000000;
  let accSA = user.accidentCover || 5000000;

  // ✅ Base Premium
  let lifeBase = (rate.life * lifeSA) / 1000;
  let cirBase = (rate.cir * cirSA) / 1000;
  let accBase = (rate.accident * accSA) / 1000;

  // ✅ Loading
  let lifePremium = Math.round(lifeBase + (lifeBase * (lifeFactor * 0.25)));
  let cirPremium = Math.round(cirBase + (cirBase * (healthFactor * 0.30)));
  let accPremium = Math.round(accBase + (accBase * (lifeFactor * 0.25)));

  const colorMap = { 1: '#10b981', 2: '#84cc16', 3: '#f59e0b', 4: '#f97316', 6: '#ef4444', 8: '#dc2626', 10: '#b91c1c', 12: '#991b1b', 16: '#7f1d1d', 20: '#450a0a' };

  return { emr, breakdown, lifeClass, healthClass, lifeFactor, healthFactor, lifePremium, cirPremium, accPremium, total: lifePremium + cirPremium + accPremium, color: colorMap[lifeFactor] || '#ef4444' };
}
