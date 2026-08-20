// Bloqueio de Ctrl+C/Ctrl+V ligado pelo professor, por turma (aba "Gestão"
// dentro de turmas/<turma>/plataforma.html).
//
// IMPORTANTE — isso é um desincentivo pedagógico, não segurança de verdade:
// só intercepta copiar/colar DENTRO das páginas do portal. Um aluno pode
// contornar abrindo o DevTools, desativando JS, ou colando em outra janela.
// Não existe forma de um site impedir isso de verdade fora de si mesmo.
//
// Roda em toda página que o incluir (plataforma de cada turma + cada jogo/
// atividade, já que iframes são documentos separados e não herdam listeners
// do documento pai). Não afeta o professor.
(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role') || 'aluno';
  if (role === 'professor' || role === 'admin') return;

  // O bloqueio agora é ligado por turma (dentro do portal de cada uma), não mais global.
  const turma = urlParams.get('turma') || 'global';

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY;
  if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) return;

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let blocked = false;
  let toastTimer = null;

  function showToast() {
    let toast = document.getElementById('__clipboardGuardToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = '__clipboardGuardToast';
      toast.textContent = 'Copiar/colar desabilitado pelo professor.';
      toast.style.cssText = [
        'position:fixed', 'left:50%', 'bottom:18px', 'transform:translateX(-50%)',
        'background:#1a1a1a', 'color:#f5f5f5', 'font:600 12px system-ui,sans-serif',
        'padding:8px 16px', 'border-radius:4px', 'z-index:2147483647',
        'box-shadow:0 2px 10px rgba(0,0,0,.4)', 'pointer-events:none',
        'opacity:0', 'transition:opacity .15s ease',
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1600);
  }

  function onKeydown(e) {
    if (!blocked) return;
    const key = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (key === 'c' || key === 'v' || key === 'x')) {
      e.preventDefault();
      e.stopPropagation();
      showToast();
    }
  }

  function onClipboardEvent(e) {
    if (!blocked) return;
    e.preventDefault();
    showToast();
  }

  document.addEventListener('keydown', onKeydown, true);
  document.addEventListener('copy', onClipboardEvent, true);
  document.addEventListener('cut', onClipboardEvent, true);
  document.addEventListener('paste', onClipboardEvent, true);

  async function fetchState() {
    const { data } = await sb
      .from('classroom_settings')
      .select('clipboard_blocked')
      .eq('id', turma)
      .maybeSingle();
    blocked = !!(data && data.clipboard_blocked);
  }

  function setupRealtime() {
    sb.channel('realtime_classroom_settings_' + turma)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_settings', filter: `id=eq.${turma}` }, fetchState)
      .subscribe();
  }

  fetchState();
  setupRealtime();
})();
