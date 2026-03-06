// ===== AegisAI - Main Application =====

// --- State ---
const AppState = {
  currentPage: 'home',
  proposals: [],
  theme: localStorage.getItem('aegis-theme') || 'light',
  currency: localStorage.getItem('aegis-currency') || 'INR',
  language: localStorage.getItem('aegis-lang') || 'en',
  loaded: false,
};

// --- Translations ---
const i18n = {
  en: {
    home: 'Home', newProposal: 'New Proposal', dashboard: 'Dashboard', scan: 'Scan', admin: 'Admin',
    settings: 'Settings', theme: 'Theme', currency: 'Currency', language: 'Language',
    dark: 'Dark', light: 'Light',
    smartInsurance: 'Smart Insurance', poweredByAI: 'Powered by AI',
    aiPlatform: 'AI-Powered Insurance Platform',
    heroDesc: 'Experience the future of protection with AI-driven insights, instant EMR calculations, and seamless document processing.',
    getStarted: 'Get Started', scanDoc: 'Scan Document', premiumCalc: 'Premium Calculator',
    benefits: 'Benefits', whyChoose: 'Why Choose AegisAI',
    whyDesc: 'We combine cutting-edge technology with human-centric design for the best insurance experience.',
    instantQuotes: 'Instant Quotes', instantDesc: 'Get personalized insurance rates in seconds using our advanced proprietary algorithms.',
    aiAccuracy: 'AI-Driven Accuracy', aiDesc: 'Our AI ensures your coverage is perfectly tailored to your specific life stage and needs.',
    support247: '24/7 Support', supportDesc: 'Always-on assistance for claims and queries whenever you need it, day or night.',
    simpleProcess: 'Simple 3-step process', processDesc: "We've simplified the complex world of insurance. No more paperwork, no more confusion.",
    scanDocs: 'Scan Your Documents', scanDocsDesc: 'Upload a photo of your existing policy or ID. Our OCR engine handles the rest instantly.',
    aiAnalysis: 'AI Analysis', aiAnalysisDesc: 'Our AI analyzes thousands of data points to find coverage gaps and optimization opportunities.',
    getCovered: 'Get Covered', getCoveredDesc: 'Review your personalized smart plan and activate it with a single tap.',
    readyCTA: 'Ready for a smarter way to insure?', ctaDesc: 'Join over 50,000 users who have switched to AI-powered protection.',
    startQuote: 'Start Your Quote', learnMore: 'Learn More',
    totalProposals: 'Total Proposals', approvalRate: 'Approval Rate', avgEMR: 'Average EMR', totalPremium: 'Total Premium',
    noProposals: 'No Proposals Yet', noProposalsDesc: 'Create your first insurance proposal or scan a document to get started.',
    searchPlaceholder: 'Search by name or ID...',
    allStatus: 'All Status', pending: 'Pending', approved: 'Approved', rejected: 'Rejected', underReview: 'Under Review',
    personalDetails: 'Personal Details', familyHistory: 'Family History', healthConditions: 'Health Conditions',
    lifestyle: 'Lifestyle & Habits', occupationRisk: 'Occupation Risk', financial: 'Financial Info',
    coverage: 'Coverage Selection', summary: 'Summary', submitProposal: 'Submit Proposal',
    previous: 'Previous', next: 'Next',
    fullName: 'Full Name', gender: 'Gender', dob: 'Date of Birth', age: 'Age',
    residence: 'Place of Residence', profession: 'Profession', height: 'Height (cm)', weight: 'Weight (kg)',
    male: 'Male', female: 'Female', other: 'Other',
    scanInsDoc: 'Scan Insurance Document', dragDrop: 'Drag & drop your document here, or click to browse',
    uploadDoc: 'Upload Document', takePhoto: 'Take Photo',
    download: 'Download', downloadPDF: 'PDF', downloadExcel: 'Excel', downloadCSV: 'CSV',
    accuracy: 'Accuracy', processing: 'Processing', proposalsAnalyzed: 'Proposals Analyzed', userRating: 'User Rating',
    builtFor: 'Built for Modern Insurance Professionals',
    riskProfiling: 'Intelligent Risk Profiling', riskProfilingDesc: 'AI analyzes 50+ risk factors for accurate assessment',
    realTime: 'Real-Time Processing', realTimeDesc: 'Results in under 3 seconds with optimized algorithms',
    security: 'Enterprise-Grade Security', securityDesc: 'HIPAA and SOC 2 compliant data protection',
    compliance: 'Regulatory Compliance', complianceDesc: 'Meets all IRDAI regulatory guidelines',
    perfStats: 'Performance Stats', accuracyRate: 'Accuracy Rate', processingSpeed: 'Processing Speed',
    userSatisfaction: 'User Satisfaction', uptimeGuarantee: 'Uptime Guarantee',
    proposals: 'Proposals', companies: 'Companies',
    viewAll: 'View All', recentProposals: 'Recent Proposals',
    statusDistribution: 'Status Distribution', riskDistribution: 'Risk Distribution',
    adminPanel: 'Admin Panel', manageAll: 'Manage all insurance proposals',
    deleteConfirm: 'Delete Proposal?', deleteDesc: 'This action cannot be undone.',
    cancel: 'Cancel', delete: 'Delete',
    proposalSummary: 'Proposal Summary', emrBreakdown: 'EMR Breakdown', premiumBreakdown: 'Premium Breakdown',
    applicantDetails: 'Applicant Details',
    dataExtracted: 'Data Extracted Successfully', reviewEdit: 'Review and edit the extracted information below',
    edit: 'Edit', save: 'Save', createFromScan: 'Create Proposal from Scan',
    extractedInfo: 'Extracted Information', aiAssessment: 'Preliminary AI Assessment',
    lifeCover: 'Life Cover', cirCover: 'Critical Illness Rider', accidentCover: 'Accident Cover',
    annualIncome: 'Annual Income', incomeSource: 'Source of Income', maxEligibleCover: 'Maximum Eligible Cover',
  },
  hi: {
    home: 'होम', newProposal: 'नया प्रस्ताव', dashboard: 'डैशबोर्ड', scan: 'स्कैन', admin: 'एडमिन',
    settings: 'सेटिंग्स', theme: 'थीम', currency: 'मुद्रा', language: 'भाषा',
    dark: 'डार्क', light: 'लाइट',
    smartInsurance: 'स्मार्ट बीमा', poweredByAI: 'AI संचालित',
    aiPlatform: 'AI-संचालित बीमा प्लेटफॉर्म',
    heroDesc: 'AI-संचालित अंतर्दृष्टि, तत्काल EMR गणना और दस्तावेज़ प्रसंस्करण के साथ सुरक्षा का भविष्य अनुभव करें।',
    getStarted: 'शुरू करें', scanDoc: 'दस्तावेज़ स्कैन', premiumCalc: 'प्रीमियम कैलकुलेटर',
    benefits: 'लाभ', whyChoose: 'AegisAI क्यों चुनें',
    whyDesc: 'हम सर्वोत्तम बीमा अनुभव के लिए अत्याधुनिक तकनीक को मानव-केंद्रित डिज़ाइन के साथ जोड़ते हैं।',
    instantQuotes: 'तत्काल कोट्स', instantDesc: 'हमारे उन्नत एल्गोरिदम से सेकंड में व्यक्तिगत बीमा दरें प्राप्त करें।',
    aiAccuracy: 'AI-संचालित सटीकता', aiDesc: 'हमारा AI सुनिश्चित करता है कि आपका कवरेज आपकी ज़रूरतों के अनुसार है।',
    support247: '24/7 सहायता', supportDesc: 'दावों और प्रश्नों के लिए हमेशा उपलब्ध सहायता।',
    simpleProcess: 'सरल 3-चरण प्रक्रिया', processDesc: 'हमने बीमा को सरल बनाया है। कोई कागजी कार्रवाई नहीं।',
    scanDocs: 'दस्तावेज़ स्कैन करें', scanDocsDesc: 'अपनी मौजूदा पॉलिसी या ID की फ़ोटो अपलोड करें।',
    aiAnalysis: 'AI विश्लेषण', aiAnalysisDesc: 'हमारा AI कवरेज अंतराल खोजने के लिए डेटा का विश्लेषण करता है।',
    getCovered: 'कवर प्राप्त करें', getCoveredDesc: 'एक टैप से अपनी योजना सक्रिय करें।',
    readyCTA: 'बीमा करने का बेहतर तरीका?', ctaDesc: '50,000+ उपयोगकर्ताओं से जुड़ें।',
    startQuote: 'कोट शुरू करें', learnMore: 'और जानें',
    totalProposals: 'कुल प्रस्ताव', approvalRate: 'स्वीकृति दर', avgEMR: 'औसत EMR', totalPremium: 'कुल प्रीमियम',
    noProposals: 'कोई प्रस्ताव नहीं', noProposalsDesc: 'शुरू करने के लिए एक नया प्रस्ताव बनाएं।',
    searchPlaceholder: 'नाम या ID से खोजें...',
    allStatus: 'सभी स्थिति', pending: 'लंबित', approved: 'स्वीकृत', rejected: 'अस्वीकृत', underReview: 'समीक्षाधीन',
    personalDetails: 'व्यक्तिगत विवरण', familyHistory: 'पारिवारिक इतिहास', healthConditions: 'स्वास्थ्य स्थितियां',
    lifestyle: 'जीवनशैली', occupationRisk: 'व्यवसाय जोखिम', financial: 'वित्तीय जानकारी',
    coverage: 'कवरेज चयन', summary: 'सारांश', submitProposal: 'प्रस्ताव जमा करें',
    previous: 'पिछला', next: 'अगला',
    fullName: 'पूरा नाम', gender: 'लिंग', dob: 'जन्म तिथि', age: 'आयु',
    residence: 'निवास स्थान', profession: 'पेशा', height: 'ऊंचाई (सेमी)', weight: 'वजन (किग्रा)',
    male: 'पुरुष', female: 'महिला', other: 'अन्य',
    scanInsDoc: 'बीमा दस्तावेज़ स्कैन करें', dragDrop: 'यहां दस्तावेज़ खींचें या ब्राउज़ करें',
    uploadDoc: 'दस्तावेज़ अपलोड', takePhoto: 'फ़ोटो लें',
    download: 'डाउनलोड', downloadPDF: 'PDF', downloadExcel: 'Excel', downloadCSV: 'CSV',
    accuracy: 'सटीकता', processing: 'प्रसंस्करण', proposalsAnalyzed: 'विश्लेषित प्रस्ताव', userRating: 'उपयोगकर्ता रेटिंग',
    builtFor: 'आधुनिक बीमा पेशेवरों के लिए',
    riskProfiling: 'बुद्धिमान जोखिम प्रोफाइलिंग', riskProfilingDesc: 'AI 50+ जोखिम कारकों का विश्लेषण करता है',
    realTime: 'रीयल-टाइम प्रसंस्करण', realTimeDesc: '3 सेकंड से कम में परिणाम',
    security: 'एंटरप्राइज़ सुरक्षा', securityDesc: 'HIPAA और SOC 2 अनुपालन',
    compliance: 'नियामक अनुपालन', complianceDesc: 'IRDAI दिशानिर्देशों का पालन',
    perfStats: 'प्रदर्शन आंकड़े', accuracyRate: 'सटीकता दर', processingSpeed: 'प्रसंस्करण गति',
    userSatisfaction: 'उपयोगकर्ता संतुष्टि', uptimeGuarantee: 'अपटाइम गारंटी',
    proposals: 'प्रस्ताव', companies: 'कंपनियां',
    viewAll: 'सभी देखें', recentProposals: 'हाल के प्रस्ताव',
    statusDistribution: 'स्थिति वितरण', riskDistribution: 'जोखिम वितरण',
    adminPanel: 'एडमिन पैनल', manageAll: 'सभी बीमा प्रस्तावों का प्रबंधन',
    deleteConfirm: 'प्रस्ताव हटाएं?', deleteDesc: 'यह क्रिया पूर्ववत नहीं की जा सकती।',
    cancel: 'रद्द करें', delete: 'हटाएं',
    proposalSummary: 'प्रस्ताव सारांश', emrBreakdown: 'EMR विश्लेषण', premiumBreakdown: 'प्रीमियम विश्लेषण',
    applicantDetails: 'आवेदक विवरण',
    dataExtracted: 'डेटा सफलतापूर्वक निकाला गया', reviewEdit: 'नीचे निकाली गई जानकारी की समीक्षा करें',
    edit: 'संपादित', save: 'सहेजें', createFromScan: 'स्कैन से प्रस्ताव बनाएं',
    extractedInfo: 'निकाली गई जानकारी', aiAssessment: 'प्रारंभिक AI मूल्यांकन',
    lifeCover: 'जीवन कवर', cirCover: 'गंभीर बीमारी राइडर', accidentCover: 'दुर्घटना कवर',
    annualIncome: 'वार्षिक आय', incomeSource: 'आय का स्रोत', maxEligibleCover: 'अधिकतम पात्र कवर',
  }
};

function t(key) {
  return (i18n[AppState.language] && i18n[AppState.language][key]) || i18n.en[key] || key;
}

// --- Currency ---
const currencyConfig = {
  INR: { symbol: '₹', rate: 1, locale: 'en-IN' },
  USD: { symbol: '$', rate: 0.012, locale: 'en-US' },
  EUR: { symbol: '€', rate: 0.011, locale: 'de-DE' },
  GBP: { symbol: '£', rate: 0.0095, locale: 'en-GB' },
};

function formatCurrency(amount) {
  if (!amount && amount !== 0) return currencyConfig[AppState.currency].symbol + '0';
  const cfg = currencyConfig[AppState.currency];
  const converted = Math.round(amount * cfg.rate);
  return cfg.symbol + converted.toLocaleString(cfg.locale);
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString(AppState.language === 'hi' ? 'hi-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// --- API Configuration ---
const API_BASE = 'http://localhost:3000/api';
let useAPI = true; // Will be set to false if server is unavailable

// --- Server connectivity check ---
async function checkServerConnection() {
  try {
    const res = await fetch(API_BASE + '/health', { signal: AbortSignal.timeout(2000) });
    if (res.ok) { useAPI = true; console.log('✅ Connected to AegisAI backend server'); return true; }
  } catch (e) { /* server not available */ }
  useAPI = false;
  console.log('⚠️ Backend server not available, using localStorage fallback');
  return false;
}

// --- Proposals (API with localStorage fallback) ---
async function loadProposals() {
  if (useAPI) {
    try {
      const res = await fetch(API_BASE + '/proposals');
      if (res.ok) {
        AppState.proposals = (await res.json()).map(p => ({ ...p, createdAt: new Date(p.createdAt) }));
        return;
      }
    } catch (e) { console.warn('API fetch failed, using localStorage fallback'); useAPI = false; }
  }
  // localStorage fallback
  try {
    const data = localStorage.getItem('aegis-proposals');
    if (data) AppState.proposals = JSON.parse(data).map(p => ({ ...p, createdAt: new Date(p.createdAt) }));
  } catch (e) { AppState.proposals = []; }
}

function saveProposalsLocal() { localStorage.setItem('aegis-proposals', JSON.stringify(AppState.proposals)); }

async function addProposal(proposal) {
  proposal.id = 'AGS-' + Date.now().toString(36).toUpperCase();
  proposal.createdAt = new Date();
  proposal.status = proposal.status || 'pending';

  if (useAPI) {
    try {
      const res = await fetch(API_BASE + '/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposal),
      });
      if (res.ok) {
        const saved = await res.json();
        saved.createdAt = new Date(saved.createdAt);
        AppState.proposals.unshift(saved);
        return saved;
      }
    } catch (e) { console.warn('API save failed, using localStorage'); }
  }
  // Fallback
  AppState.proposals.unshift(proposal);
  saveProposalsLocal();
  return proposal;
}

async function updateProposal(id, updates) {
  if (useAPI) {
    try {
      const res = await fetch(API_BASE + '/proposals/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        updated.createdAt = new Date(updated.createdAt);
        const idx = AppState.proposals.findIndex(p => p.id === id);
        if (idx !== -1) AppState.proposals[idx] = updated;
        return;
      }
    } catch (e) { console.warn('API update failed, using localStorage'); }
  }
  // Fallback
  const idx = AppState.proposals.findIndex(p => p.id === id);
  if (idx !== -1) { AppState.proposals[idx] = { ...AppState.proposals[idx], ...updates }; saveProposalsLocal(); }
}

async function deleteProposal(id) {
  if (useAPI) {
    try {
      const res = await fetch(API_BASE + '/proposals/' + id, { method: 'DELETE' });
      if (res.ok) {
        AppState.proposals = AppState.proposals.filter(p => p.id !== id);
        return;
      }
    } catch (e) { console.warn('API delete failed, using localStorage'); }
  }
  // Fallback
  AppState.proposals = AppState.proposals.filter(p => p.id !== id);
  saveProposalsLocal();
}

function getProposal(id) { return AppState.proposals.find(p => p.id === id); }

// --- EMR Calculator ---
function calculateEMR(data) {
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
  lifestyleEMR += sMap[data.smoking] || 0; lifestyleEMR += aMap[data.alcohol] || 0; lifestyleEMR += tMap[data.tobacco] || 0;
  const oMap = { desk_job: 0, light_manual: 5, moderate_physical: 10, heavy_manual: 20, hazardous: 30, extreme_risk: 50 };
  occupationEMR += oMap[data.occupation] || 0;
  const totalEMR = base + familyEMR + healthEMR + lifestyleEMR + occupationEMR;
  return { base, familyEMR, healthEMR, lifestyleEMR, occupationEMR, totalEMR, breakdown: { base, family: familyEMR, health: healthEMR, lifestyle: lifestyleEMR, occupation: occupationEMR } };
}
function getRiskClass(emr) {
  if (emr <= 90) return { class: 'Class I', label: 'Lowest Risk', color: '#10b981' };
  if (emr <= 110) return { class: 'Class II', label: 'Low Risk', color: '#84cc16' };
  if (emr <= 130) return { class: 'Class III', label: 'Moderate Risk', color: '#f59e0b' };
  if (emr <= 150) return { class: 'Class IV', label: 'High Risk', color: '#ef4444' };
  return { class: 'Class V', label: 'Highest Risk', color: '#dc2626' };
}
function calculatePremium(data, emr) {
  const f = emr / 100, lifeP = Math.round((data.lifeCover || 0) * 0.005 * f), cirP = Math.round((data.cirCover || 0) * 0.008 * f), accP = Math.round((data.accidentCover || 0) * 0.003);
  return { life: lifeP, cir: cirP, accident: accP, total: lifeP + cirP + accP };
}

// --- Theme ---
function applyTheme() {
  document.documentElement.classList.toggle('dark', AppState.theme === 'dark');
  localStorage.setItem('aegis-theme', AppState.theme);
  document.querySelectorAll('.theme-icon-el').forEach(el => el.className = AppState.theme === 'dark' ? 'ri-sun-line theme-icon-el' : 'ri-moon-line theme-icon-el');
}
function toggleTheme() { AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark'; applyTheme(); }

// --- Settings ---
function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  if (panel) panel.classList.toggle('show');
}
function setCurrency(val) { AppState.currency = val; localStorage.setItem('aegis-currency', val); renderPage(); }
function setLanguage(val) { AppState.language = val; localStorage.setItem('aegis-lang', val); renderPage(); updateNavLabels(); }

function updateNavLabels() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

// --- Router ---
function navigateTo(page) { AppState.currentPage = page; window.location.hash = page; renderPage(); updateNavActive(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function updateNavActive() { document.querySelectorAll('.nav-link,.mobile-nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === AppState.currentPage)); }
function renderPage() {
  const c = document.getElementById('page-content');
  if (!c) return;
  c.innerHTML = ''; c.className = 'page-container fade-in';
  switch (AppState.currentPage) {
    case 'home': renderHome(c); break;
    case 'proposal': renderNewProposal(c); break;
    case 'dashboard': renderDashboard(c); break;
    case 'scan': renderScan(c); break;
    case 'admin': renderAdmin(c); break;
    default: renderHome(c);
  }
}

// --- Export Functions ---
function exportProposalPDF(proposal) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const p = proposal;
  const cur = (v) => formatCurrency(v);

  doc.setFontSize(20); doc.setTextColor(79, 70, 229);
  doc.text('AegisAI - Insurance Proposal', 20, 25);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`ID: ${p.id} | Date: ${formatDate(p.createdAt)}`, 20, 33);
  doc.setDrawColor(79, 70, 229); doc.line(20, 37, 190, 37);

  let y = 47;
  const addSection = (title) => { doc.setFontSize(12); doc.setTextColor(79, 70, 229); doc.text(title, 20, y); y += 8; };
  const addRow = (k, v) => { doc.setFontSize(9); doc.setTextColor(80); doc.text(k, 25, y); doc.setTextColor(30); doc.text(String(v || '—'), 90, y); y += 6; };

  addSection('Personal Details');
  addRow('Name', p.name); addRow('Age', p.age); addRow('Gender', p.gender);
  addRow('Residence', p.residence); addRow('Profession', p.profession);
  addRow('BMI', p.bmi ? parseFloat(p.bmi).toFixed(1) : '—');
  y += 4;

  addSection('Risk Assessment');
  addRow('EMR Score', p.emrScore); addRow('Risk Class', p.riskClass); addRow('Status', p.status);
  y += 4;

  addSection('Premium Details');
  if (p.premium) {
    addRow('Life Cover Premium', cur(p.premium.life));
    addRow('CIR Premium', cur(p.premium.cir));
    addRow('Accident Premium', cur(p.premium.accident));
    addRow('Total Annual Premium', cur(p.premium.total));
  }

  doc.setFontSize(8); doc.setTextColor(150);
  doc.text('Generated by AegisAI Smart Insurance Platform', 20, 280);
  doc.save(`AegisAI_${p.id}.pdf`);
}

function exportProposalExcel(proposal) {
  const p = proposal;
  const data = [
    ['AegisAI - Insurance Proposal'],
    ['ID', p.id], ['Date', formatDate(p.createdAt)], [],
    ['Personal Details'],
    ['Name', p.name], ['Age', p.age], ['Gender', p.gender],
    ['Residence', p.residence], ['Profession', p.profession], ['BMI', p.bmi ? parseFloat(p.bmi).toFixed(1) : ''], [],
    ['Risk Assessment'],
    ['EMR Score', p.emrScore], ['Risk Class', p.riskClass], ['Status', p.status], [],
    ['Premium Details'],
    ['Life Cover', p.premium ? p.premium.life : ''], ['CIR', p.premium ? p.premium.cir : ''],
    ['Accident', p.premium ? p.premium.accident : ''], ['Total', p.premium ? p.premium.total : '']
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Proposal');
  XLSX.writeFile(wb, `AegisAI_${p.id}.xlsx`);
}

function exportProposalCSV(proposal) {
  const p = proposal;
  const rows = [
    ['Field', 'Value'],
    ['ID', p.id], ['Date', formatDate(p.createdAt)],
    ['Name', p.name], ['Age', p.age], ['Gender', p.gender],
    ['Residence', p.residence], ['Profession', p.profession],
    ['EMR Score', p.emrScore], ['Risk Class', p.riskClass], ['Status', p.status],
    ['Life Premium', p.premium ? p.premium.life : ''], ['CIR Premium', p.premium ? p.premium.cir : ''],
    ['Accident Premium', p.premium ? p.premium.accident : ''], ['Total Premium', p.premium ? p.premium.total : '']
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `AegisAI_${p.id}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// --- Init ---
async function initApp() {
  await checkServerConnection();
  await loadProposals();
  applyTheme();
  const hash = window.location.hash.replace('#', '') || 'home';
  AppState.currentPage = hash;
  const ls = document.getElementById('loading-screen');
  setTimeout(() => {
    if (ls) { ls.classList.add('fade-out'); setTimeout(() => ls.style.display = 'none', 500); }
    renderPage(); updateNavActive(); updateNavLabels(); AppState.loaded = true;
  }, 2000);
  window.addEventListener('hashchange', () => { AppState.currentPage = window.location.hash.replace('#', '') || 'home'; renderPage(); updateNavActive(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.status-dropdown')) document.querySelectorAll('.status-menu').forEach(m => m.classList.remove('show'));
    if (!e.target.closest('.nav-btn-settings') && !e.target.closest('.settings-panel')) {
      const sp = document.getElementById('settings-panel'); if (sp) sp.classList.remove('show');
    }
  });
}
document.addEventListener('DOMContentLoaded', initApp);
