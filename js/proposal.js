// ===== AegisAI - New Proposal Page =====
let proposalFormData = {};
let currentStep = 0;

function renderNewProposal(container) {
  proposalFormData = { name: '', gender: '', dob: '', age: 0, residence: '', profession: '', height: '', weight: '', bmi: 0, fatherStatus: '', motherStatus: '', conditions: [], severities: {}, smoking: 'never', alcohol: 'never', tobacco: 'never', occupation: 'desk_job', income: '', incomeSource: 'salaried', lifeCover: 0, cirCover: 0, accidentCover: 0 };
  currentStep = 0;
  renderFormStep(container);
}

const STEPS = [
  { icon: 'ri-user-line', label: t('personalDetails').split(' ')[0] },
  { icon: 'ri-group-line', label: t('familyHistory').split(' ')[0] },
  { icon: 'ri-heart-pulse-line', label: t('healthConditions').split(' ')[0] },
  { icon: 'ri-goblet-line', label: t('lifestyle').split(' ')[0] },
  { icon: 'ri-briefcase-line', label: t('occupationRisk').split(' ')[0] },
  { icon: 'ri-wallet-3-line', label: t('financial').split(' ')[0] },
  { icon: 'ri-shield-check-line', label: t('coverage').split(' ')[0] },
  { icon: 'ri-file-list-3-line', label: t('summary') }
];

function renderFormStep(container) {
  container.innerHTML = `
    <div style="max-width:50rem;margin:0 auto;">
      <div class="text-center mb-6">
        <h1 style="font-size:1.625rem;font-weight:800;">${t('newProposal')}</h1>
        <p style="color:var(--text-secondary);font-size:.8125rem;margin-top:.25rem;">Complete all steps to generate your personalized premium</p>
      </div>
      <div class="card mb-6" style="padding:.75rem;">
        <div class="stepper-container" id="stepper">
          ${STEPS.map((s, i) => `
            <div class="step-item">
              <div style="display:flex;flex-direction:column;align-items:center;">
                <button class="step-circle ${i === currentStep ? 'active' : i < currentStep ? 'completed' : 'inactive'}" onclick="${i < currentStep ? `goToStep(${i})` : ''}" ${i > currentStep ? 'disabled' : ''}>
                  <i class="${i < currentStep ? 'ri-check-line' : s.icon}"></i>
                </button>
                <span class="step-label ${i === currentStep ? 'active' : ''}">${s.label}</span>
              </div>
              ${i < STEPS.length - 1 ? `<div class="step-connector ${i < currentStep ? 'completed' : ''}" style="margin:0 .125rem;align-self:flex-start;margin-top:1.5rem;"></div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card fade-in" style="padding:1.75rem;" id="step-content">${renderStepContent(currentStep)}</div>
      <div style="display:flex;justify-content:space-between;margin-top:1.25rem;">
        <button class="btn btn-secondary" onclick="prevStep()" ${currentStep === 0 ? 'style="visibility:hidden;"' : ''}>
          <i class="ri-arrow-left-line"></i> ${t('previous')}
        </button>
        ${currentStep < STEPS.length - 1 ? `
          <button class="btn btn-primary" onclick="nextStep()">${t('next')} <i class="ri-arrow-right-line"></i></button>
        `: `
          <button class="btn btn-success btn-lg" onclick="submitProposal()"><i class="ri-check-double-line"></i> ${t('submitProposal')}</button>
        `}
      </div>
    </div>`;
}

function renderStepContent(step) {
  switch (step) { case 0: return renderPersonalStep(); case 1: return renderFamilyStep(); case 2: return renderHealthStep(); case 3: return renderLifestyleStep(); case 4: return renderOccupationStep(); case 5: return renderFinancialStep(); case 6: return renderCoverageStep(); case 7: return renderSummaryStep(); default: return ''; }
}

function renderPersonalStep() {
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-user-line" style="color:var(--accent);"></i> ${t('personalDetails')}</h3>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">${t('fullName')} *</label><input type="text" class="form-input" placeholder="${t('fullName')}" value="${proposalFormData.name}" onchange="proposalFormData.name=this.value"></div>
      <div class="form-group"><label class="form-label">${t('gender')} *</label>
        <div class="radio-group">${['male', 'female', 'other'].map(g => `<label class="radio-option ${proposalFormData.gender === g ? 'selected' : ''}" onclick="selectRadio('gender','${g}',this)"><input type="radio" name="gender" value="${g}" ${proposalFormData.gender === g ? 'checked' : ''}> ${t(g)}</label>`).join('')}</div>
      </div>
      <div class="form-group"><label class="form-label">${t('dob')} *</label><input type="date" class="form-input" value="${proposalFormData.dob}" onchange="updateDOB(this.value)"></div>
      <div class="form-group"><label class="form-label">${t('age')}</label><input type="text" class="form-input" id="f-age" value="${proposalFormData.age || ''}" readonly style="background:var(--bg-tertiary);"></div>
      <div class="form-group"><label class="form-label">${t('residence')}</label>
        <select class="form-select" onchange="proposalFormData.residence=this.value"><option value="">Select...</option>${['Urban', 'Semi-Urban', 'Rural'].map(r => `<option value="${r.toLowerCase()}" ${proposalFormData.residence === r.toLowerCase() ? 'selected' : ''}>${r}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">${t('profession')}</label>
        <select class="form-select" onchange="proposalFormData.profession=this.value"><option value="">Select...</option>${['Salaried', 'Self-Employed', 'Business', 'Professional', 'Student', 'Retired'].map(p => `<option value="${p.toLowerCase()}" ${proposalFormData.profession === p.toLowerCase() ? 'selected' : ''}>${p}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">${t('height')}</label><input type="number" class="form-input" placeholder="170" value="${proposalFormData.height}" onchange="updateBMI(this.value,'height')"></div>
      <div class="form-group"><label class="form-label">${t('weight')}</label><input type="number" class="form-input" placeholder="70" value="${proposalFormData.weight}" onchange="updateBMI(this.value,'weight')"></div>
    </div>
    <div class="form-group"><label class="form-label">BMI</label>
      <div id="bmi-display" style="padding:.625rem .875rem;border-radius:.625rem;background:var(--bg-secondary);font-weight:700;font-size:1rem;">${proposalFormData.bmi > 0 ? getBMIDisplay(proposalFormData.bmi) : '<span style="color:var(--text-muted);font-weight:400;font-size:.8125rem;">Enter height & weight</span>'}</div>
    </div>`;
}

function renderFamilyStep() {
  const opts = [{ value: 'alive_healthy', label: 'Alive & Healthy', emr: '0' }, { value: 'minor_issues', label: 'Minor Health Issues', emr: '+10' }, { value: 'major_issues', label: 'Major Health Issues', emr: '+25' }, { value: 'deceased_before_60', label: 'Deceased (Before 60)', emr: '+50' }, { value: 'deceased_after_60', label: 'Deceased (After 60)', emr: '+25' }];
  const renderOpts = (field) => opts.map(o => `
    <label class="radio-option ${proposalFormData[field] === o.value ? 'selected' : ''}" onclick="selectRadio('${field}','${o.value}',this)" style="width:100%;justify-content:space-between;">
      <span>${o.label}</span><span class="badge ${o.emr === '0' ? 'badge-green' : 'badge-yellow'}">${o.emr} EMR</span>
    </label>`).join('');
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-group-line" style="color:var(--accent);"></i> ${t('familyHistory')}</h3>
    <div class="form-group"><label class="form-label">Father's Health Status</label><div class="radio-group" style="flex-direction:column;">${renderOpts('fatherStatus')}</div></div>
    <div class="form-group mt-6"><label class="form-label">Mother's Health Status</label><div class="radio-group" style="flex-direction:column;">${renderOpts('motherStatus')}</div></div>`;
}

function renderHealthStep() {
  const conds = [{ id: 'diabetes', label: 'Diabetes', icon: 'ri-drop-line' }, { id: 'hypertension', label: 'Hypertension', icon: 'ri-heart-pulse-line' }, { id: 'heart_disease', label: 'Heart Disease', icon: 'ri-hearts-line' }, { id: 'respiratory', label: 'Respiratory', icon: 'ri-lungs-line' }, { id: 'cancer', label: 'Cancer History', icon: 'ri-virus-line' }, { id: 'liver', label: 'Liver Disease', icon: 'ri-body-scan-line' }, { id: 'kidney', label: 'Kidney Disease', icon: 'ri-capsule-line' }, { id: 'neurological', label: 'Neurological', icon: 'ri-brain-line' }];
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-heart-pulse-line" style="color:var(--accent);"></i> ${t('healthConditions')}</h3>
    <p style="font-size:.8125rem;color:var(--text-secondary);margin-bottom:1rem;">Select existing conditions and set severity.</p>
    <div class="grid-2">${conds.map(c => `<label class="checkbox-option ${proposalFormData.conditions.includes(c.id) ? 'selected' : ''}" onclick="toggleCondition('${c.id}',this)"><input type="checkbox" ${proposalFormData.conditions.includes(c.id) ? 'checked' : ''}><i class="${c.icon}" style="font-size:1rem;"></i> ${c.label}</label>`).join('')}</div>
    <div id="severity-sliders" style="margin-top:1.25rem;">
      ${proposalFormData.conditions.map(c => {
    const cond = conds.find(x => x.id === c); const sev = proposalFormData.severities[c] || 1;
    return `<div style="margin-bottom:.75rem;padding:.875rem;background:var(--bg-secondary);border-radius:.625rem;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.375rem;"><span style="font-size:.8125rem;font-weight:600;">${cond ? cond.label : c}</span><span class="badge ${sev <= 1 ? 'badge-green' : sev <= 2 ? 'badge-yellow' : 'badge-red'}">${['Mild', 'Moderate', 'Severe', 'Critical'][sev - 1]}</span></div><input type="range" class="range-slider" min="1" max="4" value="${sev}" oninput="updateSeverity('${c}',this.value)"></div>`;
  }).join('')}
    </div>`;
}

function renderLifestyleStep() {
  const renderGroup = (field, label, options) => `
    <div class="form-group mt-4"><label class="form-label">${label}</label>
    <div class="radio-group" style="flex-direction:column;">${options.map(o => `
      <label class="radio-option ${proposalFormData[field] === o.value ? 'selected' : ''}" onclick="selectRadio('${field}','${o.value}',this)" style="width:100%;justify-content:space-between;">
        <span>${o.label}</span><span class="badge ${o.emr === '0' ? 'badge-green' : 'badge-yellow'}">${o.emr}‰</span>
      </label>`).join('')}</div></div>`;
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-goblet-line" style="color:var(--accent);"></i> ${t('lifestyle')}</h3>
    ${renderGroup('smoking', 'Smoking Status', [{ value: 'never', label: 'Never', emr: '0' }, { value: 'former', label: 'Former', emr: '+15' }, { value: 'occasional', label: 'Occasional', emr: '+25' }, { value: 'regular', label: 'Regular', emr: '+40' }])}
    ${renderGroup('alcohol', 'Alcohol', [{ value: 'never', label: 'Never', emr: '0' }, { value: 'social', label: 'Social', emr: '+5' }, { value: 'moderate', label: 'Moderate', emr: '+15' }, { value: 'heavy', label: 'Heavy', emr: '+30' }])}
    ${renderGroup('tobacco', 'Tobacco', [{ value: 'never', label: 'Never', emr: '0' }, { value: 'occasional', label: 'Occasional', emr: '+15' }, { value: 'regular', label: 'Regular', emr: '+30' }])}`;
}

function renderOccupationStep() {
  const occs = [{ value: 'desk_job', label: 'Office / Desk Job', risk: 'Low', emr: '0‰' }, { value: 'light_manual', label: 'Light Manual Work', risk: 'Low-Med', emr: '0.5‰' }, { value: 'moderate_physical', label: 'Moderate Physical', risk: 'Medium', emr: '1‰' }, { value: 'heavy_manual', label: 'Heavy Manual', risk: 'High', emr: '2‰' }, { value: 'hazardous', label: 'Hazardous', risk: 'Very High', emr: '3‰' }, { value: 'extreme_risk', label: 'Extreme Risk', risk: 'Critical', emr: '5‰' }];
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-briefcase-line" style="color:var(--accent);"></i> ${t('occupationRisk')}</h3>
    <div class="radio-group" style="flex-direction:column;">${occs.map(o => `
      <label class="radio-option ${proposalFormData.occupation === o.value ? 'selected' : ''}" onclick="selectRadio('occupation','${o.value}',this)" style="width:100%;justify-content:space-between;">
        <div><div style="font-weight:600;">${o.label}</div><div style="font-size:.6875rem;color:var(--text-muted);">Risk: ${o.risk}</div></div>
        <span class="badge badge-blue">${o.emr}</span>
      </label>`).join('')}</div>`;
}

function renderFinancialStep() {
  const max = (parseFloat(proposalFormData.income) || 0) * 15;
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-wallet-3-line" style="color:var(--accent);"></i> ${t('financial')}</h3>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">${t('annualIncome')}</label><input type="number" class="form-input" placeholder="1000000" value="${proposalFormData.income}" onchange="proposalFormData.income=this.value;updateMaxCover();"></div>
      <div class="form-group"><label class="form-label">${t('incomeSource')}</label>
        <select class="form-select" onchange="proposalFormData.incomeSource=this.value">${['Salaried', 'Self-Employed', 'Business', 'Professional', 'Agriculture', 'Rental Income'].map(s => `<option value="${s.toLowerCase().replace(/ /g, '_')}" ${proposalFormData.incomeSource === s.toLowerCase().replace(/ /g, '_') ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group mt-4"><label class="form-label">${t('maxEligibleCover')}</label>
      <div style="padding:.875rem;background:var(--accent-light);border-radius:.625rem;border:1px solid rgba(79,70,229,.15);">
        <p style="font-size:1.375rem;font-weight:800;color:var(--accent);" id="max-cover-display">${max > 0 ? formatCurrency(max) : '—'}</p>
        <p style="font-size:.6875rem;color:var(--text-muted);">15× Annual Income</p>
      </div>
    </div>`;
}

function renderCoverageStep() {
  const max = Math.max((parseFloat(proposalFormData.income) || 0) * 15, 10000000);
  const slider = (field, label, maxV, step, color, displayId) => `
    <div class="form-group mt-4"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.375rem;"><label class="form-label" style="margin:0;">${label}</label><span style="font-size:.9375rem;font-weight:700;color:${color};" id="${displayId}">${formatCurrency(proposalFormData[field])}</span></div>
    <input type="range" class="range-slider" min="0" max="${maxV}" step="${step}" value="${proposalFormData[field]}" oninput="updateCoverage('${field}',this.value)">
    <div style="display:flex;justify-content:space-between;font-size:.625rem;color:var(--text-muted);"><span>${formatCurrency(0)}</span><span>${formatCurrency(maxV)}</span></div></div>`;
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-shield-check-line" style="color:var(--accent);"></i> ${t('coverage')}</h3>
    ${slider('lifeCover', t('lifeCover'), max, 100000, 'var(--accent)', 'life-cover-val')}
    ${slider('cirCover', t('cirCover'), 5000000, 100000, 'var(--purple)', 'cir-cover-val')}
    ${slider('accidentCover', t('accidentCover'), 1000000, 50000, 'var(--green)', 'acc-cover-val')}`;
}

function renderSummaryStep() {
  const emr = calculateEMR(proposalFormData), rc = getRiskClass(emr.totalEMR), prem = calculatePremium(proposalFormData, emr.totalEMR);
  return `
    <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:1.25rem;display:flex;align-items:center;gap:.5rem;"><i class="ri-file-list-3-line" style="color:var(--accent);"></i> ${t('proposalSummary')}</h3>
    <div style="display:flex;flex-wrap:wrap;gap:2rem;align-items:center;justify-content:center;margin-bottom:1.75rem;">
      <div class="emr-meter"><div class="emr-meter-bg"></div><div style="display:flex;flex-direction:column;align-items:center;"><span class="emr-meter-value">${emr.totalEMR}</span><span class="emr-meter-label">EMR Score</span></div></div>
      <div>
        <div class="badge" style="background:${rc.color}20;color:${rc.color};font-size:.9375rem;padding:.4375rem .875rem;font-weight:700;">${rc.class}</div>
        <p style="font-size:.8125rem;color:var(--text-secondary);margin-top:.375rem;">${rc.label}</p>
        <div style="margin-top:.875rem;"><p style="font-size:.6875rem;color:var(--text-muted);">Total Annual Premium</p><p style="font-size:1.625rem;font-weight:800;color:var(--accent);">${formatCurrency(prem.total)}</p></div>
      </div>
    </div>
    <div style="margin-bottom:1.25rem;">
      <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem;">${t('emrBreakdown')}</h4>
      ${Object.entries(emr.breakdown).map(([k, v]) => `
        <div style="display:flex;align-items:center;gap:.625rem;margin-bottom:.375rem;">
          <span style="width:4.5rem;font-size:.75rem;font-weight:500;color:var(--text-secondary);text-transform:capitalize;">${k}</span>
          <div style="flex:1;height:1.125rem;background:var(--bg-tertiary);border-radius:.25rem;overflow:hidden;"><div style="height:100%;width:${Math.min(v / 2, 100)}%;background:${k === 'base' ? 'var(--accent)' : k === 'family' ? 'var(--purple)' : k === 'health' ? 'var(--red)' : k === 'lifestyle' ? 'var(--yellow)' : 'var(--green)'};border-radius:.25rem;"></div></div>
          <span style="font-size:.75rem;font-weight:700;min-width:2rem;">${v}</span>
        </div>`).join('')}
    </div>
    <div style="margin-bottom:1.25rem;">
      <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem;">${t('premiumBreakdown')}</h4>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.625rem;" class="premium-grid">
        ${[{ l: t('lifeCover'), v: prem.life, c: 'var(--accent)' }, { l: t('cirCover'), v: prem.cir, c: 'var(--purple)' }, { l: t('accidentCover'), v: prem.accident, c: 'var(--green)' }].map(p => `
          <div style="padding:.875rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;">
            <p style="font-size:.6875rem;color:var(--text-muted);">${p.l}</p>
            <p style="font-size:1rem;font-weight:700;color:${p.c};">${formatCurrency(p.v)}</p>
          </div>`).join('')}
      </div>
    </div>
    <div style="border-top:1px solid var(--border-color);padding-top:1.25rem;">
      <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem;">${t('applicantDetails')}</h4>
      <div class="grid-2" style="font-size:.8125rem;">
        ${[['Name', proposalFormData.name], ['Age', proposalFormData.age], ['Gender', proposalFormData.gender], ['Residence', proposalFormData.residence], ['BMI', proposalFormData.bmi > 0 ? proposalFormData.bmi.toFixed(1) : '—'], ['Occupation', proposalFormData.occupation.replace(/_/g, ' ')], ['Income', proposalFormData.income ? formatCurrency(parseFloat(proposalFormData.income)) : '—'], ['Smoking', proposalFormData.smoking]].map(([k, v]) => `
          <div style="display:flex;justify-content:space-between;padding:.375rem 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">${k}</span><span style="font-weight:600;text-transform:capitalize;">${v || '—'}</span></div>`).join('')}
      </div>
    </div>`;
}

// --- Helpers ---
function selectRadio(f, v, el) { proposalFormData[f] = v; const g = el.closest('.radio-group'); g.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected')); el.classList.add('selected'); }
function updateDOB(v) { proposalFormData.dob = v; if (v) { const b = new Date(v), td = new Date(); let a = td.getFullYear() - b.getFullYear(); const m = td.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && td.getDate() < b.getDate())) a--; proposalFormData.age = a; const el = document.getElementById('f-age'); if (el) el.value = a; } }
function updateBMI(v, f) { proposalFormData[f] = v; const h = parseFloat(proposalFormData.height), w = parseFloat(proposalFormData.weight); if (h > 0 && w > 0) { proposalFormData.bmi = w / ((h / 100) ** 2); const el = document.getElementById('bmi-display'); if (el) el.innerHTML = getBMIDisplay(proposalFormData.bmi); } }
function getBMIDisplay(bmi) { const v = bmi.toFixed(1); let c = 'var(--green)', l = 'Normal'; if (bmi < 18.5) { c = 'var(--yellow)'; l = 'Underweight'; } else if (bmi >= 25 && bmi < 30) { c = 'var(--yellow)'; l = 'Overweight'; } else if (bmi >= 30) { c = 'var(--red)'; l = 'Obese'; } return `<span style="color:${c};">${v}</span> <span style="font-size:.6875rem;color:var(--text-muted);font-weight:400;">(${l})</span>`; }
function toggleCondition(id, el) { const i = proposalFormData.conditions.indexOf(id); if (i === -1) { proposalFormData.conditions.push(id); proposalFormData.severities[id] = 1; } else { proposalFormData.conditions.splice(i, 1); delete proposalFormData.severities[id]; } const c = document.getElementById('step-content'); if (c) c.innerHTML = renderStepContent(2); }
function updateSeverity(c, v) { proposalFormData.severities[c] = parseInt(v); const el = document.getElementById('step-content'); if (el) el.innerHTML = renderStepContent(2); }
function updateCoverage(f, v) { proposalFormData[f] = parseInt(v); const map = { lifeCover: 'life-cover-val', cirCover: 'cir-cover-val', accidentCover: 'acc-cover-val' }; const el = document.getElementById(map[f]); if (el) el.textContent = formatCurrency(parseInt(v)); }
function updateMaxCover() { const m = (parseFloat(proposalFormData.income) || 0) * 15; const el = document.getElementById('max-cover-display'); if (el) el.textContent = m > 0 ? formatCurrency(m) : '—'; }
function goToStep(s) { currentStep = s; renderFormStep(document.getElementById('page-content')); }
function nextStep() { if (currentStep < STEPS.length - 1) { currentStep++; renderFormStep(document.getElementById('page-content')); } }
function prevStep() { if (currentStep > 0) { currentStep--; renderFormStep(document.getElementById('page-content')); } }

async function submitProposal() {
  const emr = calculateEMR(proposalFormData), rc = getRiskClass(emr.totalEMR), prem = calculatePremium(proposalFormData, emr.totalEMR);
  const proposal = { name: proposalFormData.name, age: proposalFormData.age, gender: proposalFormData.gender, dob: proposalFormData.dob, residence: proposalFormData.residence, profession: proposalFormData.profession, height: proposalFormData.height, weight: proposalFormData.weight, bmi: proposalFormData.bmi, fatherStatus: proposalFormData.fatherStatus, motherStatus: proposalFormData.motherStatus, conditions: [...proposalFormData.conditions], severities: { ...proposalFormData.severities }, smoking: proposalFormData.smoking, alcohol: proposalFormData.alcohol, tobacco: proposalFormData.tobacco, occupation: proposalFormData.occupation, income: proposalFormData.income, incomeSource: proposalFormData.incomeSource, lifeCover: proposalFormData.lifeCover, cirCover: proposalFormData.cirCover, accidentCover: proposalFormData.accidentCover, emrScore: emr.totalEMR, emrBreakdown: emr.breakdown, riskClass: rc.class, premium: prem, status: 'pending', source: 'manual' };
  const saved = await addProposal(proposal);
  showProposalResult(saved);
}

function showProposalResult(proposal) {
  const container = document.getElementById('page-content');
  container.innerHTML = `
    <div style="max-width:50rem;margin:0 auto;" class="fade-in">
      <div class="text-center mb-6">
        <div style="width:4rem;height:4rem;border-radius:50%;background:rgba(16,185,129,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;"><i class="ri-check-double-line" style="font-size:2rem;color:var(--green);"></i></div>
        <h1 style="font-size:1.625rem;font-weight:800;">Proposal Submitted!</h1>
        <p style="color:var(--text-secondary);font-size:.875rem;">ID: <strong>${proposal.id}</strong></p>
      </div>
      <div class="card" style="padding:1.75rem;">
        <div style="display:flex;flex-wrap:wrap;gap:1.5rem;align-items:center;justify-content:center;margin-bottom:1.5rem;">
          <div class="emr-meter"><div class="emr-meter-bg"></div><div style="display:flex;flex-direction:column;align-items:center;"><span class="emr-meter-value">${proposal.emrScore}</span><span class="emr-meter-label">EMR Score</span></div></div>
          <div>
            <div class="badge" style="background:${getRiskClass(proposal.emrScore).color}20;color:${getRiskClass(proposal.emrScore).color};font-size:.9375rem;padding:.4375rem .875rem;font-weight:700;">${proposal.riskClass}</div>
            <p style="font-size:.8125rem;color:var(--text-secondary);margin-top:.25rem;">${getRiskClass(proposal.emrScore).label}</p>
            <p style="margin-top:.75rem;font-size:.6875rem;color:var(--text-muted);">Total Annual Premium</p>
            <p style="font-size:1.5rem;font-weight:800;color:var(--accent);">${formatCurrency(proposal.premium.total)}</p>
          </div>
        </div>
        <!-- Download Buttons -->
        <div style="border-top:1px solid var(--border-color);padding-top:1.25rem;">
          <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.625rem;"><i class="ri-download-2-line" style="color:var(--accent);"></i> ${t('download')}</h4>
          <div class="download-group">
            <button class="btn btn-primary btn-sm" onclick='exportProposalPDF(${JSON.stringify(proposal).replace(/'/g, "\\'")})'><i class="ri-file-pdf-2-line"></i> ${t('downloadPDF')}</button>
            <button class="btn btn-success btn-sm" onclick='exportProposalExcel(${JSON.stringify(proposal).replace(/'/g, "\\'")})'><i class="ri-file-excel-2-line"></i> ${t('downloadExcel')}</button>
            <button class="btn btn-secondary btn-sm" onclick='exportProposalCSV(${JSON.stringify(proposal).replace(/'/g, "\\'")})'><i class="ri-file-text-line"></i> ${t('downloadCSV')}</button>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.5rem;">
        <button class="btn btn-primary" onclick="navigateTo('dashboard')"><i class="ri-dashboard-line"></i> ${t('dashboard')}</button>
        <button class="btn btn-secondary" onclick="navigateTo('proposal')"><i class="ri-add-line"></i> ${t('newProposal')}</button>
      </div>
    </div>`;
}
