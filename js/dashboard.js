// ===== AegisAI - Dashboard Page =====

function renderDashboard(container) {
  const proposals = AppState.proposals;
  if (proposals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="min-height:60vh;">
        <i class="ri-dashboard-line" style="font-size:4rem;color:var(--accent);opacity:.3;"></i>
        <h2 style="font-size:1.375rem;font-weight:700;margin-top:.875rem;">${t('noProposals')}</h2>
        <p style="color:var(--text-secondary);margin-top:.375rem;max-width:22rem;font-size:.875rem;">${t('noProposalsDesc')}</p>
        <div style="display:flex;gap:.75rem;margin-top:1.25rem;flex-wrap:wrap;justify-content:center;">
          <button class="btn btn-primary" onclick="navigateTo('proposal')"><i class="ri-add-line"></i> ${t('newProposal')}</button>
          <button class="btn btn-secondary" onclick="navigateTo('scan')"><i class="ri-scan-2-line"></i> ${t('scanDoc')}</button>
        </div>
      </div>`;
    return;
  }
  const approved = proposals.filter(p => p.status === 'approved').length;
  const approvalRate = proposals.length > 0 ? Math.round((approved / proposals.length) * 100) : 0;
  const avgEMR = Math.round(proposals.reduce((s, p) => s + (p.emrScore || 100), 0) / proposals.length);
  const totalPremium = proposals.reduce((s, p) => s + ((p.premium && p.premium.total) || 0), 0);
  const statusCounts = { approved: 0, pending: 0, rejected: 0, under_review: 0 };
  proposals.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
  const riskCounts = { 'Class I': 0, 'Class II': 0, 'Class III': 0, 'Class IV': 0, 'Class V': 0 };
  proposals.forEach(p => { if (p.riskClass) riskCounts[p.riskClass] = (riskCounts[p.riskClass] || 0) + 1; });

  container.innerHTML = `
    <div style="margin-bottom:1.75rem;"><h1 style="font-size:1.625rem;font-weight:800;">${t('dashboard')}</h1><p style="color:var(--text-secondary);font-size:.8125rem;">Overview of your insurance proposals and analytics</p></div>
    <div class="grid-4 mb-8">
      ${[
      { label: t('totalProposals'), value: proposals.length, icon: 'ri-file-list-3-line', c: 'var(--accent)' },
      { label: t('approvalRate'), value: approvalRate + '%', icon: 'ri-check-double-line', c: 'var(--green)' },
      { label: t('avgEMR'), value: avgEMR, icon: 'ri-pulse-line', c: 'var(--yellow)' },
      { label: t('totalPremium'), value: formatCurrency(totalPremium), icon: 'ri-money-rupee-circle-line', c: 'var(--purple)' }
    ].map(s => `
        <div class="card slide-up" style="padding:1.25rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.625rem;">
            <span style="font-size:.75rem;color:var(--text-muted);font-weight:500;">${s.label}</span>
            <div style="width:2rem;height:2rem;border-radius:.4375rem;background:${s.c}12;color:${s.c};display:flex;align-items:center;justify-content:center;"><i class="${s.icon}" style="font-size:1rem;"></i></div>
          </div>
          <p style="font-size:1.375rem;font-weight:800;">${s.value}</p>
        </div>`).join('')}
    </div>
    <div class="grid-2 mb-8">
      <div class="card" style="padding:1.25rem;">
        <h3 style="font-size:.9375rem;font-weight:700;margin-bottom:1rem;">${t('statusDistribution')}</h3>
        ${[{ key: 'approved', label: t('approved'), c: 'var(--green)' }, { key: 'pending', label: t('pending'), c: 'var(--yellow)' }, { key: 'rejected', label: t('rejected'), c: 'var(--red)' }, { key: 'under_review', label: t('underReview'), c: 'var(--accent)' }].map(s => {
      const pct = proposals.length > 0 ? Math.round((statusCounts[s.key] / proposals.length) * 100) : 0;
      return `<div style="margin-bottom:.625rem;"><div style="display:flex;justify-content:space-between;margin-bottom:.1875rem;"><span style="font-size:.75rem;color:var(--text-secondary);">${s.label}</span><span style="font-size:.75rem;font-weight:600;">${statusCounts[s.key]} (${pct}%)</span></div><div style="height:.375rem;background:var(--bg-tertiary);border-radius:999px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${s.c};border-radius:999px;transition:width .6s;"></div></div></div>`;
    }).join('')}
      </div>
      <div class="card" style="padding:1.25rem;">
        <h3 style="font-size:.9375rem;font-weight:700;margin-bottom:1rem;">${t('riskDistribution')}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:.625rem;">
          ${[{ key: 'Class I', c: '#10b981' }, { key: 'Class II', c: '#84cc16' }, { key: 'Class III', c: '#f59e0b' }, { key: 'Class IV', c: '#ef4444' }, { key: 'Class V', c: '#dc2626' }].map(r => `
            <div style="flex:1;min-width:4.5rem;padding:.875rem;background:${r.c}10;border-radius:.625rem;text-align:center;border:1px solid ${r.c}25;">
              <p style="font-size:1.375rem;font-weight:800;color:${r.c};">${riskCounts[r.key]}</p>
              <p style="font-size:.625rem;font-weight:600;color:var(--text-muted);">${r.key}</p>
            </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card" style="padding:1.25rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h3 style="font-size:.9375rem;font-weight:700;">${t('recentProposals')}</h3>
        <button class="btn btn-sm btn-secondary" onclick="navigateTo('admin')">${t('viewAll')}</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="data-table"><thead><tr><th>ID</th><th>Name</th><th>EMR</th><th>Risk</th><th>Premium</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>${proposals.slice(0, 5).map(p => `<tr>
            <td style="font-weight:600;font-size:.6875rem;font-family:monospace;">${p.id}</td>
            <td style="font-weight:600;">${p.name || '—'}</td>
            <td><span style="font-weight:700;color:${getEMRColor(p.emrScore)};">${p.emrScore || '—'}</span></td>
            <td><span class="badge ${getRiskBadgeClass(p.riskClass)}">${p.riskClass || '—'}</span></td>
            <td style="font-weight:600;">${p.premium ? formatCurrency(p.premium.total) : '—'}</td>
            <td><span class="badge ${getStatusBadgeClass(p.status)}">${formatStatus(p.status)}</span></td>
            <td style="font-size:.6875rem;color:var(--text-muted);">${formatDate(p.createdAt)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function getEMRColor(emr) { if (!emr) return 'var(--text-primary)'; if (emr <= 90) return '#10b981'; if (emr <= 110) return '#84cc16'; if (emr <= 130) return '#f59e0b'; if (emr <= 150) return '#ef4444'; return '#dc2626'; }
function getRiskBadgeClass(rc) { if (!rc) return 'badge-blue'; if (rc === 'Class I' || rc === 'Class II') return 'badge-green'; if (rc === 'Class III') return 'badge-yellow'; return 'badge-red'; }
function getStatusBadgeClass(s) { return { approved: 'badge-green', pending: 'badge-yellow', rejected: 'badge-red', under_review: 'badge-blue' }[s] || 'badge-blue'; }
function formatStatus(s) { return s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'; }
