// ===== AegisAI - Admin Page =====
let adminState = { searchTerm: '', statusFilter: 'all', viewingProposal: null, deletingId: null };

function renderAdmin(container) {
  adminState = { searchTerm: '', statusFilter: 'all', viewingProposal: null, deletingId: null };
  renderAdminContent(container);
}

function renderAdminContent(container) {
  const proposals = AppState.proposals;
  if (proposals.length === 0) {
    container.innerHTML = `
    <div class="empty-state" style="min-height:60vh;">
      <i class="ri-folder-open-line" style="font-size:4rem;color:var(--accent);opacity:.3;"></i>
      <h2 style="font-size:1.375rem;font-weight:700;margin-top:.875rem;">No Proposals to Manage</h2>
      <p style="color:var(--text-secondary);margin-top:.375rem;max-width:22rem;font-size:.875rem;">Start by creating a new proposal or scanning a document.</p>
      <button class="btn btn-primary mt-4" onclick="navigateTo('proposal')"><i class="ri-add-line"></i> ${t('newProposal')}</button>
    </div>`; return;
  }

  const filtered = proposals.filter(p => {
    const ms = !adminState.searchTerm || (p.name && p.name.toLowerCase().includes(adminState.searchTerm.toLowerCase())) || (p.id && p.id.toLowerCase().includes(adminState.searchTerm.toLowerCase()));
    const mf = adminState.statusFilter === 'all' || p.status === adminState.statusFilter;
    return ms && mf;
  });
  const stats = { total: proposals.length, approved: proposals.filter(p => p.status === 'approved').length, pending: proposals.filter(p => p.status === 'pending').length, rejected: proposals.filter(p => p.status === 'rejected').length };

  container.innerHTML = `
    <div style="margin-bottom:1.75rem;"><h1 style="font-size:1.625rem;font-weight:800;">${t('adminPanel')}</h1><p style="color:var(--text-secondary);font-size:.8125rem;">${t('manageAll')}</p></div>
    <div class="grid-4 mb-6">
      ${[{ l: 'Total', v: stats.total, c: 'var(--accent)' }, { l: t('approved'), v: stats.approved, c: 'var(--green)' }, { l: t('pending'), v: stats.pending, c: 'var(--yellow)' }, { l: t('rejected'), v: stats.rejected, c: 'var(--red)' }].map(s => `
        <div class="card" style="padding:1rem;border-left:3px solid ${s.c};"><p style="font-size:.6875rem;color:var(--text-muted);font-weight:500;">${s.l}</p><p style="font-size:1.5rem;font-weight:800;color:${s.c};">${s.v}</p></div>`).join('')}
    </div>
    <div class="card mb-6" style="padding:.875rem;">
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
        <div style="flex:1;min-width:10rem;position:relative;">
          <i class="ri-search-line" style="position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:1.125rem;"></i>
          <input type="text" class="form-input" style="padding-left:2.25rem;" placeholder="${t('searchPlaceholder')}" value="${adminState.searchTerm}" oninput="adminSearchChange(this.value)">
        </div>
        <select class="form-select" style="width:auto;min-width:9rem;" onchange="adminFilterChange(this.value)">
          <option value="all" ${adminState.statusFilter === 'all' ? 'selected' : ''}>${t('allStatus')}</option>
          <option value="pending" ${adminState.statusFilter === 'pending' ? 'selected' : ''}>${t('pending')}</option>
          <option value="approved" ${adminState.statusFilter === 'approved' ? 'selected' : ''}>${t('approved')}</option>
          <option value="rejected" ${adminState.statusFilter === 'rejected' ? 'selected' : ''}>${t('rejected')}</option>
          <option value="under_review" ${adminState.statusFilter === 'under_review' ? 'selected' : ''}>${t('underReview')}</option>
        </select>
      </div>
    </div>
    <div class="card" style="padding:.875rem;">
      <div style="overflow-x:auto;">
        <table class="data-table"><thead><tr><th>ID</th><th>Applicant</th><th>EMR</th><th>Risk</th><th>Premium</th><th>Status</th><th>Source</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${filtered.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);">No proposals match</td></tr>` : filtered.map(p => `<tr>
          <td style="font-weight:600;font-size:.625rem;font-family:monospace;">${p.id}</td>
          <td style="font-weight:600;">${p.name || '—'}</td>
          <td><span style="font-weight:700;color:${getEMRColor(p.emrScore)};">${p.emrScore || '—'}</span></td>
          <td><span class="badge ${getRiskBadgeClass(p.riskClass)}">${p.riskClass || '—'}</span></td>
          <td style="font-weight:600;">${p.premium ? formatCurrency(p.premium.total) : '—'}</td>
          <td><div class="status-dropdown">
            <button class="badge ${getStatusBadgeClass(p.status)}" style="cursor:pointer;border:none;font-family:inherit;" onclick="toggleStatusMenu('${p.id}')">${formatStatus(p.status)} ▾</button>
            <div class="status-menu" id="status-menu-${p.id}">
              ${['pending', 'approved', 'rejected', 'under_review'].map(s => `<button class="status-menu-item" onclick="changeStatus('${p.id}','${s}')"><span style="width:.4375rem;height:.4375rem;border-radius:50%;background:${{ approved: 'var(--green)', pending: 'var(--yellow)', rejected: 'var(--red)', under_review: 'var(--accent)' }[s]};"></span>${formatStatus(s)}</button>`).join('')}
            </div></div></td>
          <td><span class="badge ${p.source === 'scan' ? 'badge-purple' : 'badge-blue'}"><i class="${p.source === 'scan' ? 'ri-scan-2-line' : 'ri-edit-line'}" style="font-size:.75rem;"></i> ${p.source === 'scan' ? 'Scan' : 'Manual'}</span></td>
          <td style="font-size:.625rem;color:var(--text-muted);">${formatDate(p.createdAt)}</td>
          <td><div style="display:flex;gap:.25rem;">
            <button class="btn btn-icon btn-ghost" style="color:var(--accent);" title="View" onclick="viewProposal('${p.id}')"><i class="ri-eye-line" style="font-size:1rem;"></i></button>
            <button class="btn btn-icon btn-ghost" style="color:var(--green);" title="Download" onclick="downloadProposal('${p.id}')"><i class="ri-download-2-line" style="font-size:1rem;"></i></button>
            <button class="btn btn-icon btn-ghost" style="color:var(--red);" title="Delete" onclick="confirmDelete('${p.id}')"><i class="ri-delete-bin-line" style="font-size:1rem;"></i></button>
          </div></td></tr>`).join('')}</tbody></table>
      </div>
    </div>
    <div class="modal-overlay" id="view-modal"><div class="modal-content" id="view-modal-content"></div></div>
    <div class="modal-overlay" id="delete-modal">
      <div class="modal-content" style="max-width:26rem;text-align:center;">
        <i class="ri-error-warning-line" style="font-size:3rem;color:var(--red);margin-bottom:.75rem;"></i>
        <h3 style="font-size:1.125rem;font-weight:700;">${t('deleteConfirm')}</h3>
        <p style="color:var(--text-secondary);font-size:.8125rem;margin-top:.375rem;">${t('deleteDesc')} <strong id="delete-id"></strong></p>
        <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.25rem;">
          <button class="btn btn-secondary" onclick="closeModal('delete-modal')">${t('cancel')}</button>
          <button class="btn btn-danger" onclick="executeDelete()"><i class="ri-delete-bin-line"></i> ${t('delete')}</button>
        </div>
      </div>
    </div>`;
}

function adminSearchChange(v) { adminState.searchTerm = v; renderAdminContent(document.getElementById('page-content')); }
function adminFilterChange(v) { adminState.statusFilter = v; renderAdminContent(document.getElementById('page-content')); }
function toggleStatusMenu(id) { const m = document.getElementById(`status-menu-${id}`); document.querySelectorAll('.status-menu').forEach(x => { if (x !== m) x.classList.remove('show'); }); if (m) m.classList.toggle('show'); }
async function changeStatus(id, s) { await updateProposal(id, { status: s }); renderAdminContent(document.getElementById('page-content')); }

function viewProposal(id) {
  const p = getProposal(id); if (!p) return;
  document.getElementById('view-modal-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1.25rem;">
      <div><h2 style="font-size:1.125rem;font-weight:700;">Proposal Details</h2><p style="font-size:.6875rem;color:var(--text-muted);font-family:monospace;">${p.id}</p></div>
      <button class="btn btn-icon btn-ghost" onclick="closeModal('view-modal')"><i class="ri-close-line" style="font-size:1.125rem;"></i></button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.375rem;font-size:.8125rem;">
      ${[['Name', p.name], ['Age', p.age], ['Gender', p.gender], ['DOB', p.dob], ['Residence', p.residence], ['Profession', p.profession], ['Height', p.height ? p.height + ' cm' : '—'], ['Weight', p.weight ? p.weight + ' kg' : '—'], ['BMI', p.bmi ? parseFloat(p.bmi).toFixed(1) : '—'], ['Smoking', p.smoking], ['Alcohol', p.alcohol], ['Occupation', p.occupation ? p.occupation.replace(/_/g, ' ') : '—'], ['Income', p.income ? formatCurrency(parseFloat(p.income)) : '—'], ['Source', p.source || 'manual']].map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;padding:.375rem 0;border-bottom:1px solid var(--border-color);"><span style="color:var(--text-muted);">${k}</span><span style="font-weight:600;text-transform:capitalize;">${v || '—'}</span></div>`).join('')}
    </div>
    <div style="margin-top:1.25rem;padding-top:.875rem;border-top:1px solid var(--border-color);">
      <h4 style="font-size:.875rem;font-weight:700;margin-bottom:.625rem;">Assessment</h4>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.625rem;">
        <div style="padding:.625rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;"><p style="font-size:.625rem;color:var(--text-muted);">EMR</p><p style="font-size:1.125rem;font-weight:800;color:${getEMRColor(p.emrScore)};">${p.emrScore || '—'}</p></div>
        <div style="padding:.625rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;"><p style="font-size:.625rem;color:var(--text-muted);">Risk</p><p style="font-size:1.125rem;font-weight:800;">${p.riskClass || '—'}</p></div>
        <div style="padding:.625rem;background:var(--bg-secondary);border-radius:.625rem;text-align:center;"><p style="font-size:.625rem;color:var(--text-muted);">Premium</p><p style="font-size:1.125rem;font-weight:800;color:var(--accent);">${p.premium ? formatCurrency(p.premium.total) : '—'}</p></div>
      </div>
    </div>
    ${p.premium ? `<div style="margin-top:.875rem;"><h4 style="font-size:.75rem;font-weight:600;color:var(--text-muted);margin-bottom:.375rem;">Premium Breakdown</h4>
      <div style="display:flex;gap:.875rem;font-size:.8125rem;"><span>Life: <strong>${formatCurrency(p.premium.life)}</strong></span><span>CIR: <strong>${formatCurrency(p.premium.cir)}</strong></span><span>Acc: <strong>${formatCurrency(p.premium.accident)}</strong></span></div></div>` : ''}
    <div style="margin-top:1rem;border-top:1px solid var(--border-color);padding-top:.875rem;">
      <h4 style="font-size:.75rem;font-weight:600;color:var(--text-muted);margin-bottom:.5rem;">${t('download')}</h4>
      <div class="download-group">
        <button class="btn btn-primary btn-sm" onclick='exportProposalPDF(getProposal("${p.id}"))'><i class="ri-file-pdf-2-line"></i> PDF</button>
        <button class="btn btn-success btn-sm" onclick='exportProposalExcel(getProposal("${p.id}"))'><i class="ri-file-excel-2-line"></i> Excel</button>
        <button class="btn btn-secondary btn-sm" onclick='exportProposalCSV(getProposal("${p.id}"))'><i class="ri-file-text-line"></i> CSV</button>
      </div>
    </div>
    <div style="margin-top:.75rem;font-size:.6875rem;color:var(--text-muted);">Created: ${formatDate(p.createdAt)} · Status: <span class="badge ${getStatusBadgeClass(p.status)}">${formatStatus(p.status)}</span></div>`;
  document.getElementById('view-modal').classList.add('active');
}

function downloadProposal(id) { const p = getProposal(id); if (p) exportProposalPDF(p); }
function confirmDelete(id) { adminState.deletingId = id; document.getElementById('delete-id').textContent = id; document.getElementById('delete-modal').classList.add('active'); }
async function executeDelete() { if (adminState.deletingId) { await deleteProposal(adminState.deletingId); adminState.deletingId = null; closeModal('delete-modal'); renderAdminContent(document.getElementById('page-content')); } }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
