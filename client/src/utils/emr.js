export function calculateEMR(data) {
    let base = 100, familyEMR = 0, healthEMR = 0, lifestyleEMR = 0, occupationEMR = 0;
    const fMap = { alive_healthy: 0, minor_issues: 10, major_issues: 25, deceased_before_60: 50, deceased_after_60: 25 };
    familyEMR += fMap[data.fatherStatus] || 0;
    familyEMR += fMap[data.motherStatus] || 0;
    if (data.conditions && data.conditions.length > 0) {
        const cBase = { diabetes: 15, hypertension: 12, heart_disease: 30, respiratory: 10, cancer: 40, liver: 20, kidney: 18, neurological: 22 };
        data.conditions.forEach(c => { const sev = (data.severities && data.severities[c]) || 1; healthEMR += (cBase[c] || 10) * (0.5 + sev * 0.5); });
    }
    const sMap = { never: 0, former: 15, occasional: 25, regular: 40 };
    const aMap = { never: 0, social: 5, moderate: 15, heavy: 30 };
    const tMap = { never: 0, occasional: 15, regular: 30 };
    lifestyleEMR += sMap[data.smoking] || 0;
    lifestyleEMR += aMap[data.alcohol] || 0;
    lifestyleEMR += tMap[data.tobacco] || 0;
    const oMap = { desk_job: 0, light_manual: 5, moderate_physical: 10, heavy_manual: 20, hazardous: 30, extreme_risk: 50 };
    occupationEMR += oMap[data.occupation] || 0;
    const totalEMR = base + familyEMR + healthEMR + lifestyleEMR + occupationEMR;
    return { base, familyEMR, healthEMR, lifestyleEMR, occupationEMR, totalEMR, breakdown: { base, family: familyEMR, health: healthEMR, lifestyle: lifestyleEMR, occupation: occupationEMR } };
}

export function getRiskClass(emr) {
    if (emr <= 90) return { class: 'Class I', label: 'Lowest Risk', color: '#10b981' };
    if (emr <= 110) return { class: 'Class II', label: 'Low Risk', color: '#84cc16' };
    if (emr <= 130) return { class: 'Class III', label: 'Moderate Risk', color: '#f59e0b' };
    if (emr <= 150) return { class: 'Class IV', label: 'High Risk', color: '#ef4444' };
    return { class: 'Class V', label: 'Highest Risk', color: '#dc2626' };
}

export function calculatePremium(data, emr) {
    const f = emr / 100;
    const lifeP = Math.round((data.lifeCover || 0) * 0.005 * f);
    const cirP = Math.round((data.cirCover || 0) * 0.008 * f);
    const accP = Math.round((data.accidentCover || 0) * 0.003);
    return { life: lifeP, cir: cirP, accident: accP, total: lifeP + cirP + accP };
}
