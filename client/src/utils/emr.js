// ==========================================
// AegisAI - Industry-Standard EMR Calculator
// Based on life insurance underwriting tables
// ==========================================

// 📊 BMI → EMR
function getBmiEMR(bmi) {
    if (!bmi || bmi <= 0) return 0;
    if (bmi < 18) return 10;
    if (bmi <= 23) return 0;
    if (bmi <= 28) return 5;
    if (bmi <= 33) return 10;
    if (bmi <= 38) return 15;
    return 20; // >38 extreme
}

// 👨‍👩‍👦 Family History → EMR
function getFamilyEMR(status) {
    const map = {
        both_above_65:     -10,
        one_above_65:      -5,
        both_below_65:     10,
        // legacy fallbacks
        alive_healthy:     -10,
        minor_issues:      -5,
        major_issues:      5,
        deceased_after_60: -5,
        deceased_before_60: 10,
    };
    return map[status] || 0;
}

// 🏥 Health Conditions - severity points table (severity 1-4)
const DISEASE_POINTS = {
    thyroid:      [2.5, 5,   7.5, 10],
    asthma:       [5,   7.5, 10,  12.5],
    hypertension: [5,   7.5, 10,  15],
    diabetes:     [10,  15,  20,  25],
    gut_disorder: [5,   10,  15,  20],
    // backward-compat keys used in legacy data
    heart_disease:  [10, 15, 20, 30],
    respiratory:    [5,  7.5, 10, 12.5],
    cancer:         [15, 20, 25, 40],
    liver:          [5,  10, 15, 20],
    kidney:         [7.5, 10, 15, 18],
    neurological:   [7.5, 10, 15, 22],
};

// 🚬 Personal Habits → EMR per level (1=occasional, 2=regular moderate, 3=regular heavy)
const HABIT_POINTS = [5, 10, 15];

const HABIT_LEVEL_MAP = {
    never:      0,
    social:     1,
    occasional: 1,
    moderate:   2,
    regular:    2,
    heavy:      3,
    former:     1,
};

// 💼 Occupation → flat EMR addition
const OCCUPATION_MAP = {
    athlete:         2,
    pilot:           6,
    driver:          2,
    merchant_navy:   3,
    oil_industry:    3,
    hazardous:       3,
    extreme_risk:    6,
    heavy_manual:    2,
    moderate_physical: 1,
    light_manual:    0,
    desk_job:        0,
};

// 📈 Life Insurance EMR → Factor
function getLifeFactor(emr) {
    if (emr <= 35)  return { class: 'I',    factor: 1,  label: 'Standard' };
    if (emr <= 60)  return { class: 'II',   factor: 2,  label: 'Low Risk' };
    if (emr <= 85)  return { class: 'III',  factor: 3,  label: 'Moderate' };
    if (emr <= 120) return { class: 'IV',   factor: 4,  label: 'High' };
    if (emr <= 170) return { class: 'V',    factor: 6,  label: 'Very High' };
    if (emr <= 225) return { class: 'VI',   factor: 8,  label: 'Extra Risk' };
    if (emr <= 275) return { class: 'VII',  factor: 10, label: 'Severe' };
    if (emr <= 350) return { class: 'VIII', factor: 12, label: 'Very Severe' };
    if (emr <= 450) return { class: 'IX',   factor: 16, label: 'Critical' };
    return              { class: 'X',    factor: 20, label: 'Danger' };
}

// 🏥 Health Insurance EMR → Factor
function getHealthFactor(emr) {
    if (emr <= 20) return { class: 'Std', factor: 0,  label: 'Standard' };
    if (emr <= 35) return { class: 'I',   factor: 1,  label: 'Low' };
    if (emr <= 60) return { class: 'II',  factor: 2,  label: 'Moderate' };
    if (emr <= 75) return { class: 'III', factor: 3,  label: 'High' };
    return             { class: 'IV',  factor: 4,  label: 'Very High' };
}

// 💰 Age → Premium rates per mille
function getAgeRate(age) {
    if (!age || age <= 0) return { life: 1.5, accident: 1.0, cir: 3.0 };
    if (age <= 35) return { life: 1.5,  accident: 1.0, cir: 3.0 };
    if (age <= 40) return { life: 3.0,  accident: 1.0, cir: 6.0 };
    if (age <= 45) return { life: 4.5,  accident: 1.0, cir: 12.0 };
    if (age <= 50) return { life: 6.0,  accident: 1.0, cir: 15.0 };
    if (age <= 55) return { life: 7.5,  accident: 1.5, cir: 20.0 };
    return               { life: 9.0,  accident: 1.5, cir: 25.0 };
}

// ============================================================
// MAIN: calculateEMR
// data shape:
//   bmi, fatherStatus, motherStatus,
//   conditions (array of keys), severities (object key→1..4),
//   smoking, alcohol, tobacco (string levels),
//   occupation (string key), age (number)
// ============================================================
export function calculateEMR(data) {
    let bmiEMR = 0, familyEMR = 0, healthEMR = 0,
        coMorbidityEMR = 0, lifestyleEMR = 0, habitComboEMR = 0, occupationEMR = 0;

    // -- BMI
    bmiEMR = getBmiEMR(parseFloat(data.bmi) || 0);

    // -- Family (use single parentStatus OR separate father/mother)
    if (data.parentStatus) {
        familyEMR = getFamilyEMR(data.parentStatus);
    } else {
        familyEMR = getFamilyEMR(data.fatherStatus) + getFamilyEMR(data.motherStatus);
    }

    // -- Health conditions + co-morbidity
    const activeConditions = Array.isArray(data.conditions) ? data.conditions : [];
    let diseaseCount = 0;
    activeConditions.forEach(condKey => {
        const sev = (data.severities && data.severities[condKey]) || 1;
        const pts = DISEASE_POINTS[condKey];
        if (pts) {
            const idx = Math.min(Math.max(Math.floor(sev) - 1, 0), pts.length - 1);
            healthEMR += pts[idx];
            diseaseCount++;
        }
    });

    // Co-morbidity bonus
    if (diseaseCount === 2) coMorbidityEMR = 20;
    else if (diseaseCount >= 3) coMorbidityEMR = 40;

    // -- Habits
    const habitKeys = ['smoking', 'alcohol', 'tobacco'];
    let habitCount = 0;
    habitKeys.forEach(h => {
        const level = HABIT_LEVEL_MAP[data[h]] || 0;
        if (level > 0) {
            lifestyleEMR += HABIT_POINTS[level - 1];
            habitCount++;
        }
    });

    // Risky habit combo bonus
    if (habitCount === 2) habitComboEMR = 20;
    else if (habitCount >= 3) habitComboEMR = 40;

    // -- Occupation
    occupationEMR = OCCUPATION_MAP[data.occupation] || 0;

    const totalEMR = bmiEMR + familyEMR + healthEMR + coMorbidityEMR +
                     lifestyleEMR + habitComboEMR + occupationEMR;

    return {
        totalEMR: Math.max(0, Math.round(totalEMR)),
        bmiEMR, familyEMR, healthEMR, coMorbidityEMR,
        lifestyleEMR, habitComboEMR, occupationEMR,
        // keep legacy keys for compatibility
        base: 0, healthEMR, lifestyleEMR, occupationEMR,
        breakdown: {
            bmi: bmiEMR, family: familyEMR, health: healthEMR,
            comorbidity: coMorbidityEMR, lifestyle: lifestyleEMR,
            habitCombo: habitComboEMR, occupation: occupationEMR,
        },
    };
}

// ============================================================
// getRiskClass — returns life factor & colour for the UI ring
// ============================================================
export function getRiskClass(emr) {
    const lf = getLifeFactor(emr);
    const colorMap = {
        1:  '#10b981', 2:  '#84cc16', 3:  '#f59e0b',
        4:  '#f97316', 6:  '#ef4444', 8:  '#dc2626',
        10: '#b91c1c', 12: '#991b1b', 16: '#7f1d1d', 20: '#450a0a',
    };
    return {
        class:  'Class ' + lf.class,
        label:  lf.label,
        factor: lf.factor,
        color:  colorMap[lf.factor] || '#ef4444',
    };
}

// ============================================================
// calculatePremium
// data: { lifeCover, cirCover, accidentCover, age }
// emr: number
// ============================================================
export function calculatePremium(data, emr) {
    const age = parseInt(data.age) || 30;
    const rate = getAgeRate(age);

    const lifeSA     = parseFloat(data.lifeCover)     || 0;
    const cirSA      = parseFloat(data.cirCover)      || 0;
    const accSA      = parseFloat(data.accidentCover) || 0;

    const lf = getLifeFactor(emr);
    const hf = getHealthFactor(emr);

    // Base premium = rate × SA / 1000
    const lifeBase = (rate.life     * lifeSA) / 1000;
    const cirBase  = (rate.cir      * cirSA)  / 1000;
    const accBase  = (rate.accident * accSA)  / 1000;

    // Loading: Life = factor × 25%, CIR = health_factor × 30%
    const lifeLoading   = lf.factor * 0.25;
    const cirLoading    = hf.factor * 0.30;

    const lifePremium = Math.round(lifeBase + lifeBase * lifeLoading);
    const cirPremium  = Math.round(cirBase  + cirBase  * cirLoading);
    const accPremium  = Math.round(accBase);  // flat, no loading

    return {
        life:     lifePremium,
        cir:      cirPremium,
        accident: accPremium,
        total:    lifePremium + cirPremium + accPremium,
        lifeFactor:   lf.factor,
        healthFactor: hf.factor,
        lifeClass:    lf.class,
        healthClass:  hf.class,
    };
}
