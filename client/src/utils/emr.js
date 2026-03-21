// ============================================================
// AegisAI - MASTER EMR ENGINE v6.0 (Corrected Dataset)
// Based on user-provided controlled dataset (March 2026)
// ============================================================
// Field contract from ProposalPage:
//   user.age          - number
//   user.bmi          - number (auto-calculated from height/weight)
//   user.parentStatus - "both_above_65" | "one_above_65" | "both_below_65"
//   user.diseases     - { thyroid: 0-4, asthma: 0-4, hypertension: 0-4, diabetes: 0-4, gut_disorder: 0-4 }
//   user.smoking      - 0(Never) | 1(Occasional) | 2(Moderate) | 3(High)
//   user.alcohol      - 0 | 1 | 2 | 3
//   user.tobacco      - 0 | 1 | 2 | 3
//   user.occupation   - string
//   user.lifeCover    - number (rupees)
//   user.cirCover     - number (rupees)
//   user.accCover     - number (rupees)
// ============================================================

export function calculateInsurance(user) {
  // ─── STEP 1: INITIALIZE ───────────────────────────────────
  let emr = 0;
  let diseaseCount = 0;
  let habitCount = 0;
  const breakdown = { bmi: 0, family: 0, health: 0, comorbidity: 0, lifestyle: 0, habitCombo: 0, occupation: 0 };

  // ─── STEP 2: BMI ──────────────────────────────────────────
  // Exact ranges from dataset page 1
  const bmi = parseFloat(user.bmi) || 0;
  let bmiPts = 0;
  if (bmi > 0) {
    if      (bmi < 18)  bmiPts = 10;
    else if (bmi <= 23) bmiPts = 0;
    else if (bmi <= 28) bmiPts = 5;
    else if (bmi <= 33) bmiPts = 10;
    else if (bmi <= 38) bmiPts = 15;
    // else > 38: safe fallback = 0 (edge case)
  }
  emr += bmiPts;
  breakdown.bmi = bmiPts;

  // ─── STEP 3: FAMILY HISTORY (FIXED ⚠️) ───────────────────
  // both alive >65 → -10
  // one alive >65  → -5   ← THIS was wrong (+5 before)
  // both died <65  → +10
  // default / both_below_65 → +10
  const familyKey = user.parentStatus || user.family || '';
  let famPts = 0;
  if      (familyKey === 'both_above_65') famPts = -10;
  else if (familyKey === 'one_above_65')  famPts = -5;
  else if (familyKey === 'both_below_65') famPts = 10;
  emr += famPts;
  breakdown.family = famPts;

  // ─── STEP 4: HEALTH CONDITIONS ───────────────────────────
  // severity levels 1-4 indexed from array (index = level - 1)
  // Thyroid L1=2.5, L2=5, L3=7.5, L4=10
  const diseaseTable = {
    thyroid:      [2.5, 5, 7.5, 10],
    asthma:       [5,   7.5, 10, 12.5],
    hypertension: [5,   7.5, 10, 15],
    diabetes:     [10,  15,  20, 25],
    gut_disorder: [5,   10,  15, 20],
  };

  let healthPts = 0;
  const diseases = user.diseases || {};
  for (const key in diseases) {
    const severity = parseInt(diseases[key]) || 0;
    if (severity > 0 && diseaseTable[key]) {
      healthPts += diseaseTable[key][severity - 1];
      diseaseCount++;
    }
  }
  emr += healthPts;
  breakdown.health = healthPts;

  // ─── STEP 5: CO-MORBIDITY ─────────────────────────────────
  // 2 diseases → +20  |  3+ diseases → +40
  let comorbPts = 0;
  if      (diseaseCount >= 3) comorbPts = 40;
  else if (diseaseCount === 2) comorbPts = 20;
  emr += comorbPts;
  breakdown.comorbidity = comorbPts;

  // ─── STEP 6: PERSONAL HABITS ──────────────────────────────
  // Form sends 0/1/2/3 as top-level: user.smoking, user.alcohol, user.tobacco
  // Also supports user.habits object for scan-based proposals
  const habitLevelToPoints = { 0: 0, 1: 5, 2: 10, 3: 15 };

  function addHabit(level) {
    const pts = habitLevelToPoints[parseInt(level) || 0] || 0;
    if (pts > 0) { habitCount++; }
    return pts;
  }

  let lifestylePts = 0;

  if (user.habits && typeof user.habits === 'object') {
    // Scan page sends object: { smoking: 1, alcohol: 2, tobacco: 0 }
    for (const key in user.habits) {
      lifestylePts += addHabit(user.habits[key]);
    }
  } else {
    // Proposal page sends top-level: user.smoking, user.alcohol, user.tobacco
    lifestylePts += addHabit(user.smoking);
    lifestylePts += addHabit(user.alcohol);
    lifestylePts += addHabit(user.tobacco);
  }
  emr += lifestylePts;
  breakdown.lifestyle = lifestylePts;

  // ─── STEP 7: RISKY HABIT COMBINATION ─────────────────────
  // 2 habits → +20  |  3 habits → +40
  let comboPts = 0;
  if      (habitCount >= 3) comboPts = 40;
  else if (habitCount === 2) comboPts = 20;
  emr += comboPts;
  breakdown.habitCombo = comboPts;

  // ─── STEP 8: OCCUPATION extra per mille (NOT added to EMR) ────────────────
  // Per dataset page 2: occupation is an EXTRA CHARGE per mille of sum assured
  // Applied ONLY to life part, BEFORE loading
  const occPerMille = {
    normal: 0, desk_job: 0, student: 0, homemaker: 0,
    athlete: 2,
    driver: 2,
    merchant_navy: 3,
    oil_industry: 3,   // oil_gas in dataset
    oil_gas: 3,        // alias
    hazardous: 3,
    pilot: 6,
  };
  const occExtra = occPerMille[user.occupation] || 0;
  // occPremium is computed after we know lifeSA below
  breakdown.occupation = 0; // Occupation does NOT affect EMR

  // ─── STEP 9: LIFE CLASS (Page 2 of dataset) ───────────────
  function getLifeClass(emrVal) {
    if (emrVal <= 35)  return { class: 'I',   factor: 1, color: '#22C55E' };
    if (emrVal <= 60)  return { class: 'II',  factor: 2, color: '#84CC16' };
    if (emrVal <= 85)  return { class: 'III', factor: 3, color: '#F59E0B' };
    if (emrVal <= 120) return { class: 'IV',  factor: 4, color: '#F97316' };
    return               { class: 'V+',  factor: 6, color: '#EF4444' };
  }

  // ─── STEP 10: CIR CLASS (Page 3 of dataset) ───────────────
  function getCIRClass(emrVal) {
    if (emrVal <= 20) return { class: 'Std', factor: 0 };
    if (emrVal <= 35) return { class: 'I',   factor: 1 };
    if (emrVal <= 60) return { class: 'II',  factor: 2 };
    if (emrVal <= 75) return { class: 'III', factor: 3 };
    return              { class: 'IV',  factor: 4 };
  }

  const lifeData = getLifeClass(emr);
  const cirData  = getCIRClass(emr);

  // ─── STEP 11: BASE RATES per ₹1000 Sum Assured ────────────
  function getRates(age) {
    const a = parseInt(age) || 30;
    if (a <= 35) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (a <= 40) return { life: 3.0, accident: 1.0, cir: 6.0 };
    if (a <= 45) return { life: 4.5, accident: 1.0, cir: 12.0 };
    if (a <= 50) return { life: 6.0, accident: 1.0, cir: 15.0 };
    if (a <= 55) return { life: 7.5, accident: 1.5, cir: 20.0 };
    return               { life: 9.0, accident: 1.5, cir: 25.0 };
  }

  const rate     = getRates(user.age);
  const lifeSA   = parseFloat(user.lifeCover)  || 10000000;
  const cirSA    = parseFloat(user.cirCover)   || 5000000;
  const accSA    = parseFloat(user.accCover)   || 5000000;

  const lifeBase = (rate.life     * lifeSA) / 1000;
  const accBase  = (rate.accident * accSA)  / 1000;
  const cirBase  = (rate.cir      * cirSA)  / 1000;

  // ─── STEP 12: OCCUPATION EXTRA (per mille, added to lifeBase before loading) ─
  // ✅ Correct: occPremium = occExtra × units (based on lifeSA)
  // ✅ Applied only to life part, before loading
  const occPremium = occExtra * (lifeSA / 1000);

  // ─── STEP 13: APPLY LOADING (SEPARATE for Life vs CIR) ────
  // LIFE:   (lifeBase + occPremium + accBase) × (1 + 0.25 × lifeFactor)
  // CIR:    cirBase                            × (1 + 0.30 × cirFactor)
  const lifeLoading = 1 + 0.25 * lifeData.factor;
  const cirLoading  = 1 + 0.30 * cirData.factor;

  const lifePremium = Math.round((lifeBase + occPremium + accBase) * lifeLoading);
  const cirPremium  = Math.round(cirBase * cirLoading);
  const totalPremium = lifePremium + cirPremium;

  // ─── RETURN ───────────────────────────────────────────────
  return {
    emr,
    breakdown,
    // Life classification
    lifeClass:   lifeData.class,
    lifeFactor:  lifeData.factor,
    // CIR classification
    cirClass:    cirData.class,
    cirFactor:   cirData.factor,
    // Keep healthClass/healthFactor as aliases for UI display
    healthClass:  cirData.class,
    healthFactor: cirData.factor,
    // Premiums
    lifePremium,
    cirPremium,
    accPremium: 0, // Already rolled into lifePremium (life+accident bases combined)
    total: totalPremium,
    color: lifeData.color,
  };
}
