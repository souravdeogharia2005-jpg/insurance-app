// ===== AegisAI - Home Page =====

function renderHome(container) {
  container.innerHTML = `
    <!-- Hero -->
    <section style="padding:2rem 0 3.5rem;position:relative;overflow:hidden;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center;" class="hero-grid">
        <div class="slide-up">
          <div class="badge badge-blue mb-4" style="font-size:.8125rem;padding:.375rem 1rem;">
            <i class="ri-sparkling-2-fill" style="font-size:1rem;"></i>
            ${t('aiPlatform')}
          </div>
          <h1 style="font-size:clamp(2.5rem,5vw,4.25rem);font-weight:800;line-height:1.05;letter-spacing:-.03em;" class="blur-in">
            ${t('smartInsurance')}
          </h1>
          <h1 style="font-size:clamp(2.5rem,5vw,4.25rem);font-weight:800;line-height:1.05;letter-spacing:-.03em;" class="text-gradient blur-in">
            ${t('poweredByAI')}
          </h1>

          <div style="margin-top:1.5rem;display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;font-size:1.0625rem;color:var(--text-secondary);">
            Powered by
            <span class="badge badge-blue" id="tech-rotate" style="font-weight:700;font-size:.9375rem;padding:.375rem 1rem;"></span>
            for
            <span class="badge badge-purple" id="feature-rotate" style="font-weight:700;font-size:.9375rem;padding:.375rem 1rem;"></span>
          </div>

          <p style="margin-top:1.25rem;font-size:1rem;line-height:1.7;color:var(--text-secondary);max-width:30rem;">${t('heroDesc')}</p>

          <div style="margin-top:2rem;display:flex;flex-wrap:wrap;gap:.75rem;">
            <button class="btn btn-primary btn-lg shine-btn" onclick="navigateTo('proposal')">
              <i class="ri-calculator-line"></i> ${t('premiumCalc')}
            </button>
            <button class="btn btn-secondary btn-lg" onclick="navigateTo('scan')">
              <i class="ri-scan-2-line"></i> ${t('scanDoc')}
            </button>
          </div>
        </div>

        <div style="position:relative;" class="hero-visual-area">
          <div style="aspect-ratio:4/3;border-radius:1.5rem;overflow:hidden;border:5px solid var(--bg-primary);box-shadow:0 20px 60px rgba(79,70,229,.12);background:linear-gradient(135deg,#0f172a,#1e293b);" class="hero-image-container">
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
              <div style="width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(79,70,229,.5) 0%,rgba(139,92,246,.3) 40%,transparent 70%);filter:blur(30px);animation:textPulse 3s ease-in-out infinite;"></div>
              <div style="position:absolute;width:140px;height:140px;border:2px solid rgba(79,70,229,.3);border-radius:50%;animation:textPulse 2s ease-in-out infinite;"></div>
              <div style="position:absolute;width:200px;height:200px;border:1px solid rgba(139,92,246,.2);border-radius:50%;animation:textPulse 3s ease-in-out infinite .5s;"></div>
              <div style="position:absolute;width:260px;height:260px;border:1px solid rgba(79,70,229,.1);border-radius:50%;animation:textPulse 4s ease-in-out infinite 1s;"></div>
              <i class="ri-brain-line" style="position:absolute;font-size:3.5rem;color:rgba(99,102,241,.7);"></i>
            </div>
          </div>
          <div class="card floating-card" style="position:absolute;bottom:-1.25rem;left:-1.25rem;padding:.875rem 1rem;display:flex;align-items:center;gap:.625rem;z-index:10;">
            <div style="width:2.75rem;height:2.75rem;border-radius:50%;background:rgba(16,185,129,.1);display:flex;align-items:center;justify-content:center;color:var(--green);"><i class="ri-verified-badge-fill" style="font-size:1.375rem;"></i></div>
            <div>
              <p style="font-size:.8125rem;font-weight:700;">Policy Verified</p>
              <p style="font-size:.6875rem;color:var(--text-muted);">Savings: ${formatCurrency(3150000)}/ year</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Float Stats -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.875rem;margin-top:2.5rem;" class="stats-float-grid">
        ${[
      { val: '125', sub: 'EMR Score · Real-time', icon: 'ri-pulse-line', c: 'var(--accent)' },
      { val: 'Class III', sub: 'Risk Class · 50+ Factors', icon: 'ri-shield-check-line', c: 'var(--green)' },
      { val: formatCurrency(5150000), sub: 'Premium · Competitive', icon: 'ri-money-rupee-circle-line', c: 'var(--yellow)' }
    ].map(s => `
          <div class="card floating-card" style="padding:1.125rem;display:flex;align-items:center;gap:.875rem;">
            <div style="width:2.75rem;height:2.75rem;border-radius:.625rem;background:${s.c}12;display:flex;align-items:center;justify-content:center;color:${s.c};"><i class="${s.icon}" style="font-size:1.375rem;"></i></div>
            <div><p style="font-size:1.375rem;font-weight:800;color:${s.c};">${s.val}</p><p style="font-size:.625rem;color:var(--text-muted);font-weight:500;">${s.sub}</p></div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Stats -->
    <section style="padding:2.5rem 0;">
      <div class="grid-4">
        ${[
      { value: '99.5%', label: t('accuracy'), icon: 'ri-focus-3-line', c: 'var(--accent)' },
      { value: '<3 Sec', label: t('processing'), icon: 'ri-flashlight-line', c: 'var(--green)' },
      { value: '50K+', label: t('proposalsAnalyzed'), icon: 'ri-file-list-3-line', c: 'var(--yellow)' },
      { value: '4.9/5', label: t('userRating'), icon: 'ri-star-fill', c: 'var(--purple)' }
    ].map(s => `
          <div class="card slide-up" style="padding:1.25rem;text-align:center;">
            <div style="width:2.75rem;height:2.75rem;border-radius:.625rem;background:${s.c}12;color:${s.c};margin:0 auto .625rem;display:flex;align-items:center;justify-content:center;"><i class="${s.icon}" style="font-size:1.25rem;"></i></div>
            <p style="font-size:1.625rem;font-weight:800;color:${s.c};">${s.value}</p>
            <p style="font-size:.75rem;color:var(--text-muted);font-weight:500;">${s.label}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Benefits -->
    <section style="padding:2.5rem 0;">
      <div class="text-center mb-8">
        <p class="section-label">${t('benefits')}</p>
        <h2 class="section-title mt-2">${t('whyChoose')}</h2>
        <p class="section-subtitle" style="max-width:34rem;margin:.625rem auto 0;">${t('whyDesc')}</p>
      </div>
      <div class="grid-3">
        ${[
      { icon: 'ri-flashlight-fill', title: t('instantQuotes'), desc: t('instantDesc') },
      { icon: 'ri-brain-fill', title: t('aiAccuracy'), desc: t('aiDesc') },
      { icon: 'ri-customer-service-2-fill', title: t('support247'), desc: t('supportDesc') }
    ].map(b => `
          <div class="card slide-up" style="padding:1.75rem;">
            <div style="width:3.25rem;height:3.25rem;border-radius:.875rem;background:var(--accent-light);color:var(--accent);display:flex;align-items:center;justify-content:center;margin-bottom:1rem;"><i class="${b.icon}" style="font-size:1.5rem;"></i></div>
            <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:.375rem;">${b.title}</h3>
            <p style="font-size:.875rem;color:var(--text-secondary);line-height:1.6;">${b.desc}</p>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- How It Works -->
    <section style="padding:2.5rem 0;">
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:3rem;align-items:start;" class="how-grid">
        <div>
          <h2 class="section-title">${t('simpleProcess')}</h2>
          <p class="section-subtitle">${t('processDesc')}</p>
          <div class="card" style="margin-top:1.25rem;padding:1.125rem;background:var(--accent-light);border-color:rgba(79,70,229,.15);box-shadow:none;">
            <p style="font-size:.8125rem;font-style:italic;color:var(--accent);font-weight:500;">"It took me less than 2 minutes to switch and save ${formatCurrency(4500000)}."</p>
            <p style="font-size:.6875rem;font-weight:700;color:var(--text-muted);margin-top:.375rem;text-transform:uppercase;">— Sarah J., Mumbai</p>
          </div>
        </div>
        <div>
          ${[
      { icon: 'ri-scan-2-line', title: t('scanDocs'), desc: t('scanDocsDesc'), active: true },
      { icon: 'ri-cpu-line', title: t('aiAnalysis'), desc: t('aiAnalysisDesc') },
      { icon: 'ri-shield-check-fill', title: t('getCovered'), desc: t('getCoveredDesc'), last: true }
    ].map(s => `
            <div style="display:flex;gap:1.25rem;${!s.last ? 'padding-bottom:1.75rem;' : ''}">
              <div style="display:flex;flex-direction:column;align-items:center;">
                <div style="width:3.25rem;height:3.25rem;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;${s.active ? 'background:var(--accent);color:#fff;box-shadow:0 4px 14px rgba(79,70,229,.4);' : 'background:var(--bg-primary);color:var(--accent);border:2px solid var(--accent);'}"><i class="${s.icon}" style="font-size:1.25rem;"></i></div>
                ${!s.last ? '<div style="flex:1;width:2px;background:var(--border-color);margin-top:.625rem;"></div>' : ''}
              </div>
              <div><h4 style="font-size:1.0625rem;font-weight:700;">${s.title}</h4><p style="font-size:.875rem;color:var(--text-secondary);line-height:1.6;margin-top:.25rem;max-width:26rem;">${s.desc}</p></div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Performance -->
    <section style="padding:2.5rem 0;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:start;" class="perf-grid">
        <div>
          <h2 class="section-title">${t('builtFor')}</h2>
          <div style="margin-top:1.5rem;display:flex;flex-direction:column;gap:1rem;">
            ${[
      { icon: 'ri-brain-line', title: t('riskProfiling'), desc: t('riskProfilingDesc'), c: 'var(--accent)' },
      { icon: 'ri-flashlight-line', title: t('realTime'), desc: t('realTimeDesc'), c: 'var(--yellow)' },
      { icon: 'ri-lock-2-line', title: t('security'), desc: t('securityDesc'), c: 'var(--green)' },
      { icon: 'ri-verified-badge-line', title: t('compliance'), desc: t('complianceDesc'), c: 'var(--purple)' }
    ].map(f => `
              <div style="display:flex;gap:.875rem;align-items:start;">
                <div style="width:2.375rem;height:2.375rem;border-radius:.5rem;background:${f.c}12;color:${f.c};display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="${f.icon}" style="font-size:1.125rem;"></i></div>
                <div><h4 style="font-size:.875rem;font-weight:700;">${f.title}</h4><p style="font-size:.8125rem;color:var(--text-secondary);margin-top:.0625rem;">${f.desc}</p></div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card" style="padding:1.5rem;">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:1.25rem;">${t('perfStats')}</h3>
          ${[
      { label: t('accuracyRate'), value: 99.5, c: 'progress-blue' },
      { label: t('processingSpeed'), value: 97, c: 'progress-green' },
      { label: t('userSatisfaction'), value: 98, c: 'progress-purple' },
      { label: t('uptimeGuarantee'), value: 99.9, c: 'progress-yellow' }
    ].map(p => `
            <div style="margin-bottom:1rem;">
              <div style="display:flex;justify-content:space-between;margin-bottom:.25rem;"><span style="font-size:.75rem;font-weight:500;color:var(--text-secondary);">${p.label}</span><span style="font-size:.75rem;font-weight:700;">${p.value}%</span></div>
              <div class="progress-bar"><div class="progress-fill ${p.c}" style="width:${p.value}%;"></div></div>
            </div>
          `).join('')}
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.625rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border-color);">
            <div class="text-center"><p style="font-size:1rem;font-weight:800;color:var(--accent);">50K+</p><p style="font-size:.625rem;color:var(--text-muted);">${t('proposals')}</p></div>
            <div class="text-center"><p style="font-size:1rem;font-weight:800;color:var(--green);">500+</p><p style="font-size:.625rem;color:var(--text-muted);">${t('companies')}</p></div>
            <div class="text-center"><p style="font-size:1rem;font-weight:800;color:var(--purple);">24/7</p><p style="font-size:.625rem;color:var(--text-muted);">${t('support247')}</p></div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section style="margin:2.5rem 0;">
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:1.75rem;padding:3.5rem 2rem;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-5rem;right:-3rem;width:20rem;height:20rem;border-radius:50%;background:var(--accent);filter:blur(80px);opacity:.15;"></div>
        <div style="position:relative;z-index:1;max-width:34rem;margin:0 auto;">
          <h2 style="font-size:clamp(1.625rem,3vw,2.25rem);font-weight:800;color:#fff;line-height:1.15;">${t('readyCTA')}</h2>
          <p style="margin-top:.875rem;font-size:1rem;color:#94a3b8;line-height:1.7;">${t('ctaDesc')}</p>
          <div style="margin-top:1.75rem;display:flex;flex-wrap:wrap;justify-content:center;gap:.75rem;">
            <button class="btn btn-lg" style="background:#fff;color:#1e1b4b;" onclick="navigateTo('proposal')">${t('startQuote')}</button>
            <button class="btn btn-lg" style="background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.3);" onclick="navigateTo('scan')">${t('learnMore')}</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer" style="margin:0 -1.5rem -2rem;border-radius:0;">
      <div class="footer-inner">
        <div style="display:flex;align-items:center;gap:.5rem;">
          <div style="width:1.75rem;height:1.75rem;border-radius:.375rem;background:linear-gradient(135deg,var(--accent),var(--purple));color:#fff;display:flex;align-items:center;justify-content:center;"><i class="ri-shield-star-fill" style="font-size:.875rem;"></i></div>
          <span style="font-weight:700;font-size:.9375rem;">AegisAI</span>
        </div>
        <p style="font-size:.75rem;color:var(--text-muted);">© 2024 AegisAI. All rights reserved.</p>
        <div style="display:flex;gap:.875rem;">
          <i class="ri-global-line" style="color:var(--text-muted);cursor:pointer;font-size:1.125rem;"></i>
          <i class="ri-question-line" style="color:var(--text-muted);cursor:pointer;font-size:1.125rem;"></i>
          <i class="ri-mail-line" style="color:var(--text-muted);cursor:pointer;font-size:1.125rem;"></i>
        </div>
      </div>
    </footer>
  `;
  setupRotatingText();
  animateProgressBars();
}

function setupRotatingText() {
  const tech = ['AI Technology', 'Machine Learning', 'Smart Analytics', 'Deep Learning', 'Neural Networks'];
  const feat = ['Accurate EMR', 'Instant Quotes', 'Risk Analysis', 'Smart Decisions', 'Better Results'];
  let ti = 0, fi = 0;
  const tEl = document.getElementById('tech-rotate');
  const fEl = document.getElementById('feature-rotate');
  if (!tEl || !fEl) return;
  tEl.textContent = tech[0]; fEl.textContent = feat[0];
  [tEl, fEl].forEach(el => { el.style.transition = 'opacity .2s,transform .2s'; el.style.display = 'inline-block'; });
  setInterval(() => { ti = (ti + 1) % tech.length; tEl.style.opacity = '0'; tEl.style.transform = 'translateY(6px)'; setTimeout(() => { tEl.textContent = tech[ti]; tEl.style.opacity = '1'; tEl.style.transform = 'translateY(0)'; }, 200); }, 2500);
  setInterval(() => { fi = (fi + 1) % feat.length; fEl.style.opacity = '0'; fEl.style.transform = 'translateY(6px)'; setTimeout(() => { fEl.textContent = feat[fi]; fEl.style.opacity = '1'; fEl.style.transform = 'translateY(0)'; }, 200); }, 3000);
}

function animateProgressBars() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { const b = e.target; const w = b.style.width; b.style.width = '0%'; setTimeout(() => b.style.width = w, 100); obs.unobserve(b); } });
  }, { threshold: .3 });
  document.querySelectorAll('.progress-fill').forEach(b => obs.observe(b));
}
