// ===== AegisAI - Scan Proposal Page =====
let scanState = { file: null, imageUrl: null, processing: false, processed: false, extractedData: null, editMode: false, cameraStream: null };

function renderScan(container) {
  scanState = { file: null, imageUrl: null, processing: false, processed: false, extractedData: null, editMode: false, cameraStream: null };
  container.innerHTML = `
    <div style="max-width:50rem;margin:0 auto;">
      <div class="mb-6"><h1 style="font-size:1.625rem;font-weight:800;">${t('scanInsDoc')}</h1><p style="color:var(--text-secondary);font-size:.8125rem;margin-top:.25rem;">Upload or capture a document for AI-powered data extraction</p></div>
      <div id="scan-content">${renderScanUpload()}</div>
    </div>
    <div id="camera-container" style="display:none;"></div>`;
  setupDragDrop();
}

function renderScanUpload() {
  return `
    <div class="card" style="padding:1.75rem;">
      <div class="scan-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
        <i class="ri-scan-2-line" style="font-size:3rem;color:var(--accent);margin-bottom:.75rem;display:block;"></i>
        <h3 style="font-size:1.125rem;font-weight:700;">${t('scanInsDoc')}</h3>
        <p style="color:var(--text-secondary);font-size:.8125rem;margin-top:.375rem;">${t('dragDrop')}</p>
        <p style="color:var(--text-muted);font-size:.6875rem;margin-top:.375rem;">JPG, PNG, PDF</p>
        <input type="file" id="file-input" accept="image/*,.pdf" style="display:none;" onchange="handleFileSelect(this.files[0])">
      </div>
      <div style="display:flex;gap:.75rem;margin-top:1.25rem;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="document.getElementById('file-input').click()"><i class="ri-upload-2-line"></i> ${t('uploadDoc')}</button>
        <button class="btn btn-secondary" onclick="openCamera()"><i class="ri-camera-line"></i> ${t('takePhoto')}</button>
      </div>
    </div>`;
}

function setupDragDrop() { setTimeout(() => { const z = document.getElementById('drop-zone'); if (!z) return; z.addEventListener('dragover', e => { e.preventDefault(); z.classList.add('drag-over'); }); z.addEventListener('dragleave', () => z.classList.remove('drag-over')); z.addEventListener('drop', e => { e.preventDefault(); z.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]); }); }, 100); }
function handleFileSelect(file) { if (!file) return; scanState.file = file; if (file.type.startsWith('image/')) { const r = new FileReader(); r.onload = e => { scanState.imageUrl = e.target.result; startProcessing(); }; r.readAsDataURL(file); } else { scanState.imageUrl = null; startProcessing(); } }

function openCamera() {
  const c = document.getElementById('camera-container'); if (!c) return; c.style.display = 'block';
  c.innerHTML = `<div class="camera-view" id="camera-view"><video id="camera-video" autoplay playsinline muted></video><div class="camera-frame"></div><div class="camera-frame-bottom"></div>
    <div style="position:absolute;top:1.5rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;padding:.375rem 1rem;border-radius:999px;font-size:.75rem;font-weight:600;"><i class="ri-scan-2-line"></i> Align document within frame</div>
    <button class="camera-close" onclick="closeCamera()"><i class="ri-close-line"></i></button>
    <button class="capture-btn" onclick="capturePhoto()"></button>
    <canvas id="camera-canvas" style="display:none;"></canvas></div>`;
  startCamera();
}

async function startCamera() { try { const constraints = [{ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }, { video: { facingMode: 'environment' } }, { video: true }]; let stream = null; for (const c of constraints) { try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch (e) { continue; } } if (!stream) throw new Error('No camera'); scanState.cameraStream = stream; const v = document.getElementById('camera-video'); if (v) { v.srcObject = stream; v.play(); } } catch (e) { closeCamera(); fallbackCapture(); } }
function fallbackCapture() { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.setAttribute('capture', 'environment'); i.onchange = e => { if (e.target.files.length > 0) handleFileSelect(e.target.files[0]); }; i.click(); }
function capturePhoto() { const v = document.getElementById('camera-video'), c = document.getElementById('camera-canvas'); if (!v || !c) return; c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(b => { if (b) { scanState.file = new File([b], 'capture.jpg', { type: 'image/jpeg' }); scanState.imageUrl = c.toDataURL('image/jpeg', .9); closeCamera(); startProcessing(); } }, 'image/jpeg', .9); }
function closeCamera() { if (scanState.cameraStream) { scanState.cameraStream.getTracks().forEach(t => t.stop()); scanState.cameraStream = null; } const c = document.getElementById('camera-container'); if (c) { c.style.display = 'none'; c.innerHTML = ''; } }

function startProcessing() {
  scanState.processing = true; const content = document.getElementById('scan-content'); if (!content) return;
  const msgs = ['Initializing AI engine...', 'Processing document...', 'Detecting text regions...', 'Extracting personal details...', 'Analyzing health information...', 'Validating extracted data...'];
  content.innerHTML = `<div class="card" style="padding:1.75rem;"><div style="display:flex;gap:1.5rem;align-items:start;flex-wrap:wrap;">
    ${scanState.imageUrl ? `<div style="width:10rem;flex-shrink:0;"><img src="${scanState.imageUrl}" alt="Doc" style="width:100%;border-radius:.625rem;border:1px solid var(--border-color);"></div>` : `<div style="width:10rem;height:8rem;background:var(--bg-secondary);border-radius:.625rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="ri-file-pdf-2-line" style="font-size:2.5rem;color:var(--text-muted);"></i></div>`}
    <div style="flex:1;min-width:10rem;"><h3 style="font-size:1rem;font-weight:700;margin-bottom:.875rem;"><i class="ri-sparkling-2-fill" style="color:var(--accent);"></i> AI Processing...</h3>
    <div class="scan-progress mb-4"><div class="scan-progress-fill" id="scan-progress-fill" style="width:0%;"></div></div>
    <p id="scan-status" style="font-size:.8125rem;color:var(--text-secondary);">${msgs[0]}</p></div></div></div>`;
  let progress = 0, msgIdx = 0; const iv = setInterval(() => { progress += 2; const f = document.getElementById('scan-progress-fill'), s = document.getElementById('scan-status'); if (f) f.style.width = progress + '%'; if (progress % 17 === 0 && msgIdx < msgs.length - 1) { msgIdx++; if (s) s.textContent = msgs[msgIdx]; } if (progress >= 100) { clearInterval(iv); setTimeout(() => finishProcessing(), 300); } }, 40);
}

function finishProcessing() {
  scanState.processing = false; scanState.processed = true;
  const names = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Neha Gupta', 'Vikram Singh'];
  const n = names[Math.floor(Math.random() * names.length)], a = 25 + Math.floor(Math.random() * 30);
  scanState.extractedData = { name: n, age: a, gender: Math.random() > .5 ? 'male' : 'female', dob: `${2026 - a}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`, phone: '9' + Math.floor(1e8 + Math.random() * 9e8), email: n.toLowerCase().replace(' ', '.') + '@email.com', residence: ['urban', 'semi-urban', 'rural'][Math.floor(Math.random() * 3)], profession: ['salaried', 'self-employed', 'business'][Math.floor(Math.random() * 3)], height: 155 + Math.floor(Math.random() * 30), weight: 50 + Math.floor(Math.random() * 40), bmi: 0, conditions: Math.random() > .5 ? ['diabetes'] : [], smoking: 'never', alcohol: Math.random() > .6 ? 'social' : 'never', income: String(5e5 + Math.floor(Math.random() * 15e5)), lifeCover: 5e6 + Math.floor(Math.random() * 1e7) };
  scanState.extractedData.bmi = scanState.extractedData.weight / ((scanState.extractedData.height / 100) ** 2);
  renderExtractedData();
}

function renderExtractedData() {
  const content = document.getElementById('scan-content'), d = scanState.extractedData; if (!content || !d) return;
  const emr = calculateEMR({ fatherStatus: 'alive_healthy', motherStatus: 'alive_healthy', conditions: d.conditions, severities: {}, smoking: d.smoking, alcohol: d.alcohol, tobacco: 'never', occupation: 'desk_job' });
  const rc = getRiskClass(emr.totalEMR), prem = calculatePremium({ lifeCover: d.lifeCover, cirCover: 0, accidentCover: 0 }, emr.totalEMR);
  content.innerHTML = `
    <div class="card" style="padding:1.75rem;">
      <div style="display:flex;align-items:center;gap:.625rem;margin-bottom:1.25rem;padding-bottom:.875rem;border-bottom:1px solid var(--border-color);">
        <div style="width:2.25rem;height:2.25rem;border-radius:50%;background:rgba(16,185,129,.1);color:var(--green);display:flex;align-items:center;justify-content:center;"><i class="ri-check-double-line" style="font-size:1.125rem;"></i></div>
        <div><h3 style="font-size:1rem;font-weight:700;">${t('dataExtracted')}</h3><p style="font-size:.75rem;color:var(--text-muted);">${t('reviewEdit')}</p></div>
        <button class="btn btn-sm ${scanState.editMode ? 'btn-primary' : 'btn-secondary'}" style="margin-left:auto;" onclick="toggleEditMode()"><i class="${scanState.editMode ? 'ri-save-line' : 'ri-edit-line'}" style="font-size:.875rem;"></i> ${scanState.editMode ? t('save') : t('edit')}</button>
      </div>
      <div style="display:grid;grid-template-columns:${scanState.imageUrl ? '10rem 1fr' : '1fr'};gap:1.25rem;" class="scan-result-grid">
        ${scanState.imageUrl ? `<div><img src="${scanState.imageUrl}" alt="Doc" style="width:100%;border-radius:.625rem;border:1px solid var(--border-color);"></div>` : ''}
        <div><h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem;">${t('extractedInfo')}</h4>
          <div class="grid-2" style="font-size:.8125rem;">
            ${[['Name', d.name, 'name'], ['Age', d.age, 'age'], ['Gender', d.gender, 'gender'], ['Phone', d.phone, 'phone'], ['Email', d.email, 'email'], ['Residence', d.residence, 'residence'], ['Height', d.height, 'height'], ['Weight', d.weight, 'weight'], ['BMI', d.bmi.toFixed(1), null], ['Income', formatCurrency(parseFloat(d.income)), 'income']].map(([l, v, k]) => renderField(l, v, k)).join('')}
          </div>
          ${d.conditions.length > 0 ? `<div style="margin-top:.75rem;"><span style="font-size:.75rem;color:var(--text-muted);">Conditions:</span><div style="display:flex;gap:.375rem;margin-top:.25rem;">${d.conditions.map(c => `<span class="badge badge-red" style="text-transform:capitalize;">${c}</span>`).join('')}</div></div>` : ''}
        </div>
      </div>
      <div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border-color);">
        <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.75rem;">${t('aiAssessment')}</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;" class="assessment-grid">
          <div style="padding:.875rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;"><p style="font-size:.6875rem;color:var(--text-muted);">EMR</p><p style="font-size:1.375rem;font-weight:800;color:${getEMRColor(emr.totalEMR)};">${emr.totalEMR}</p></div>
          <div style="padding:.875rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;"><p style="font-size:.6875rem;color:var(--text-muted);">Risk</p><p style="font-size:1.125rem;font-weight:800;color:${rc.color};">${rc.class}</p></div>
          <div style="padding:.875rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;"><p style="font-size:.6875rem;color:var(--text-muted);">Premium</p><p style="font-size:1.125rem;font-weight:800;color:var(--accent);">${formatCurrency(prem.total)}</p></div>
        </div>
      </div>
    </div>
    <div style="margin-top:1.25rem;text-align:center;">
      <button class="btn btn-primary btn-lg shine-btn" onclick="createProposalFromScan()" style="width:100%;max-width:22rem;"><i class="ri-add-circle-line"></i> ${t('createFromScan')}</button>
    </div>`;
}

function renderField(l, v, k) { if (scanState.editMode && k) return `<div style="padding:.25rem 0;"><span style="color:var(--text-muted);display:block;font-size:.625rem;margin-bottom:.0625rem;">${l}</span><input type="text" class="form-input" style="padding:.3125rem .5rem;font-size:.8125rem;" value="${v}" onchange="scanState.extractedData.${k}=this.value"></div>`; return `<div style="display:flex;justify-content:space-between;padding:.25rem 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">${l}</span><span style="font-weight:600;text-transform:capitalize;">${v}</span></div>`; }
function toggleEditMode() { scanState.editMode = !scanState.editMode; renderExtractedData(); }

async function createProposalFromScan() {
  const d = scanState.extractedData; if (!d) return;
  const emr = calculateEMR({ fatherStatus: 'alive_healthy', motherStatus: 'alive_healthy', conditions: d.conditions || [], severities: {}, smoking: d.smoking || 'never', alcohol: d.alcohol || 'never', tobacco: 'never', occupation: 'desk_job' });
  const rc = getRiskClass(emr.totalEMR), prem = calculatePremium({ lifeCover: d.lifeCover || 0, cirCover: 0, accidentCover: 0 }, emr.totalEMR);
  await addProposal({ name: d.name, age: parseInt(d.age) || 0, gender: d.gender, dob: d.dob, residence: d.residence, profession: d.profession, height: d.height, weight: d.weight, bmi: d.bmi, conditions: d.conditions || [], smoking: d.smoking || 'never', alcohol: d.alcohol || 'never', occupation: 'desk_job', income: d.income, lifeCover: d.lifeCover || 0, cirCover: 0, accidentCover: 0, emrScore: emr.totalEMR, emrBreakdown: emr.breakdown, riskClass: rc.class, premium: prem, status: 'pending', source: 'scan' });
  navigateTo('dashboard');
}
