(function () {
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY;
  const HEARTBEAT_MS = 15000;
  const IDLE_TIMEOUT_MS = 120000;

  if (typeof window.supabase === 'undefined' || !SUPABASE_URL || !SUPABASE_KEY) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const role = window.ACTIVITY_STUDENT_ROLE || urlParams.get('role') || 'aluno';

  // Não rastreamos professor/admin — o painel é para acompanhar alunos.
  if (role === 'professor' || role === 'admin') {
    return;
  }

  const studentEmail = (window.ACTIVITY_STUDENT_EMAIL || urlParams.get('user') || '').trim();
  if (!studentEmail) {
    return;
  }

  const studentName = window.ACTIVITY_STUDENT_NAME || urlParams.get('name') || studentEmail;
  const studentTurma = window.ACTIVITY_STUDENT_TURMA || urlParams.get('turma') || null;

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentLocation = window.ACTIVITY_LOCATION || 'desconhecido';
  let currentLabel = window.ACTIVITY_LABEL || null;
  let currentDetail = window.ACTIVITY_DETAIL || null;
  let paused = false;
  let lastInteraction = Date.now();

  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(evt => {
    document.addEventListener(evt, () => { lastInteraction = Date.now(); }, { passive: true });
  });

  function computeStatus() {
    if (document.hidden) return 'idle';
    if (Date.now() - lastInteraction > IDLE_TIMEOUT_MS) return 'idle';
    return 'active';
  }

  async function sendHeartbeat() {
    if (paused) return;

    const payload = {
      student_email: studentEmail,
      student_name: studentName,
      turma: studentTurma,
      status: computeStatus(),
      location: currentLocation,
      location_label: currentLabel,
      detail: currentDetail,
      last_interaction_at: new Date(lastInteraction).toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await sb.from('student_activity').upsert(payload, { onConflict: 'student_email' });
    } catch (err) {
      // presença é best-effort: nunca deve travar a experiência do aluno
    }
  }

  // API pública usada pelas páginas para reportar onde o aluno está
  window.reportActivity = function (location, label, detail) {
    currentLocation = location || currentLocation;
    currentLabel = label !== undefined ? label : currentLabel;
    currentDetail = detail !== undefined ? detail : currentDetail;
    sendHeartbeat();
  };

  // Usado pela plataforma.html quando um iframe (jogo/módulo) assume o rastreamento
  window.pauseActivityHeartbeat = function () {
    paused = true;
  };

  window.resumeActivityHeartbeat = function (location, label, detail) {
    paused = false;
    window.reportActivity(location, label, detail);
  };

  sendHeartbeat();
  setInterval(sendHeartbeat, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', sendHeartbeat);
})();
