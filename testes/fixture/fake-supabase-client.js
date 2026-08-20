// Cliente Supabase falso, em memória, só com o suficiente pra exercitar o
// mesmo código que a app roda de verdade (from/select/eq/upsert/update/
// delete/channel/rpc). Os dados vêm de window.__FAKE_DB__, que cada teste
// injeta via page.addInitScript antes de navegar.
(function () {
  function db() {
    window.__FAKE_DB__ = window.__FAKE_DB__ || {};
    return window.__FAKE_DB__;
  }

  function table(name) {
    const d = db();
    d[name] = d[name] || [];
    return d[name];
  }

  // Opt-in: window.__FAKE_DB__.__errors = { game_scores: 'relation "game_scores" does not exist' }
  // simula uma tabela/policy ausente no Supabase de verdade, pra testar como
  // a app reage a um erro de consulta (não só a "tabela vazia").
  function forcedError(name) {
    const err = db().__errors && db().__errors[name];
    return err ? { message: err } : null;
  }

  function matches(row, filters) {
    return filters.every(([col, val]) => row[col] === val);
  }

  function makeQuery(name) {
    const filters = [];
    let orderBy = null;
    let limitN = null;
    const api = {
      select() { return api; },
      eq(col, val) { filters.push([col, val]); return api; },
      order(col, opts) { orderBy = { col, ascending: !(opts && opts.ascending === false) }; return api; },
      limit(n) { limitN = n; return api; },
      maybeSingle() {
        const error = forcedError(name);
        return Promise.resolve({
          data: error ? null : (table(name).filter(r => matches(r, filters))[0] || null),
          error,
        });
      },
      upsert(payload, opts) {
        const rows = Array.isArray(payload) ? payload : [payload];
        const t = table(name);
        // onConflict pode ser uma coluna só ("id") ou composta ("turma,data,student_email"),
        // igual ao Supabase de verdade — nesse caso a linha só é a "mesma" se TODAS baterem.
        const conflictCols = ((opts && opts.onConflict) || (rows[0] && (rows[0].id !== undefined ? 'id' : rows[0].ip_address !== undefined ? 'ip_address' : rows[0].student_email !== undefined ? 'student_email' : null)) || '')
          .split(',').map(c => c.trim()).filter(Boolean);
        rows.forEach(row => {
          const idx = conflictCols.length ? t.findIndex(r => conflictCols.every(c => r[c] === row[c])) : -1;
          if (idx >= 0) t[idx] = Object.assign({}, t[idx], row);
          else t.push(row);
        });
        return Promise.resolve({ data: rows, error: null });
      },
      update(payload) {
        return {
          eq(col, val) {
            table(name).forEach(r => { if (r[col] === val) Object.assign(r, payload); });
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      delete() {
        return {
          eq(col, val) {
            const t = table(name);
            db()[name] = t.filter(r => r[col] !== val);
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
      then(resolve, reject) {
        const error = forcedError(name);
        if (error) return Promise.resolve({ data: null, error }).then(resolve, reject);
        let rows = table(name).filter(r => matches(r, filters));
        if (orderBy) {
          rows = rows.slice().sort((a, b) => {
            const av = a[orderBy.col], bv = b[orderBy.col];
            if (av === bv) return 0;
            const cmp = av > bv ? 1 : -1;
            return orderBy.ascending ? cmp : -cmp;
          });
        }
        if (limitN != null) rows = rows.slice(0, limitN);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  function createClient() {
    return {
      from(name) { return makeQuery(name); },
      channel() {
        const chan = {
          on(_event, filterConfig, callback) {
            const d = db();
            d.__realtimeCallbacks = d.__realtimeCallbacks || {};
            const t = filterConfig && filterConfig.table;
            if (t) (d.__realtimeCallbacks[t] = d.__realtimeCallbacks[t] || []).push(callback);
            return chan;
          },
          subscribe() { return chan; },
        };
        return chan;
      },
      removeChannel() {},
      // Casos especiais que espelham as funções reais do Supabase (ver
      // sql/supabase-quizrush.sql): mutam a linha e devolvem question_started_at
      // como o now() do "banco" faria, em vez do relógio de quem chamou.
      rpc(name, params) {
        if (name === 'quizrush_start_session' || name === 'quizrush_next_question') {
          const row = table('quizrush_sessions').find(r => r.id === params.p_session_id);
          if (!row) return Promise.resolve({ data: null, error: null });
          const now = new Date().toISOString();
          row.status = 'question';
          row.current_index = name === 'quizrush_next_question' ? params.p_index : 0;
          row.question_started_at = now;
          return Promise.resolve({ data: now, error: null });
        }
        if (name === 'quizrush_server_now') {
          return Promise.resolve({ data: new Date().toISOString(), error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
    };
  }

  window.supabase = { createClient };

  // Ajuda os testes a simular uma atualização em tempo real (o mock acima
  // não entrega eventos sozinho): modifique window.__FAKE_DB__.<tabela>
  // primeiro, depois chame isto pra disparar os callbacks inscritos nela —
  // exercita o caminho de verdade (subscribe → callback → refetch), não só
  // uma função interna chamada direto pelo teste.
  window.__fireFakeRealtime = function (table) {
    ((db().__realtimeCallbacks && db().__realtimeCallbacks[table]) || []).forEach(cb => cb());
  };
})();
