/* ============================================================
   OutBox Mail — Utilitários de interface
   Toast, modal, confirmação, cópia, tema e máscaras.
   ============================================================ */
window.UI = (function () {
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  /* ---------- toast ---------- */
  const ICO_TOAST = { ok: 'checkCircle', err: 'xCircle', info: 'info', warn: 'alert' };
  function toast(tipo, titulo, msg) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (tipo || 'info');
    el.innerHTML = `${ico(ICO_TOAST[tipo] || 'info')}
      <div><div class="tt">${esc(titulo)}</div>${msg ? `<div class="tm">${esc(msg)}</div>` : ''}</div>`;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s, transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(24px)';
      setTimeout(() => el.remove(), 320);
    }, 3800);
  }

  /* ---------- modal ---------- */
  let ultimoFoco = null;
  function modal({ titulo, sub, corpo, acoes, largo, aoAbrir }) {
    fecharModal();
    ultimoFoco = document.activeElement;
    const root = document.getElementById('modal-root');
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal ${largo ? 'modal-lg' : ''}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
        <div class="modal-head">
          <div>
            <h3>${esc(titulo)}</h3>
            ${sub ? `<p>${esc(sub)}</p>` : ''}
          </div>
          <button class="btn-icon" data-fechar aria-label="Fechar">${ico('x')}</button>
        </div>
        <div class="modal-body">${corpo || ''}</div>
        ${acoes ? `<div class="modal-foot">${acoes}</div>` : ''}
      </div>`;
    root.appendChild(bd);

    bd.addEventListener('click', (e) => {
      if (e.target === bd || e.target.closest('[data-fechar]')) fecharModal();
    });
    document.addEventListener('keydown', onEsc);
    const foco = bd.querySelector('input,select,textarea,button:not([data-fechar])');
    if (foco) setTimeout(() => foco.focus(), 60);
    if (aoAbrir) aoAbrir(bd);
    return bd;
  }
  function onEsc(e) { if (e.key === 'Escape') fecharModal(); }
  function fecharModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.removeEventListener('keydown', onEsc);
    if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} }
    ultimoFoco = null;
  }

  function confirmar({ titulo, msg, ok = 'Confirmar', perigo }) {
    return new Promise((resolve) => {
      const bd = modal({
        titulo,
        corpo: `<p style="color:var(--text-soft);font-size:.94rem;max-width:none">${esc(msg)}</p>`,
        acoes: `<button class="btn btn-ghost" data-fechar>Cancelar</button>
                <button class="btn ${perigo ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button>`,
      });
      bd.querySelector('[data-ok]').addEventListener('click', () => { fecharModal(); resolve(true); });
      bd.addEventListener('click', (e) => {
        if (e.target === bd || e.target.closest('[data-fechar]')) resolve(false);
      });
    });
  }

  /* ---------- cópia ---------- */
  async function copiar(texto, rotulo) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      ta.remove();
    }
    toast('ok', 'Copiado', rotulo || 'Conteúdo copiado para a área de transferência.');
  }

  function linhaCopia(valor, rotulo) {
    return `<div class="copy-row">
      <code>${esc(valor)}</code>
      <button class="btn-icon btn-sm" data-copiar="${esc(valor)}" aria-label="Copiar ${esc(rotulo || 'valor')}">${ico('copy')}</button>
    </div>`;
  }

  /* delegação global para qualquer [data-copiar] */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copiar]');
    if (b) copiar(b.getAttribute('data-copiar'));
  });

  /* ---------- tema ---------- */
  function aplicarTema(t) {
    document.documentElement.setAttribute('data-theme', t);
    OB.tema.salvar(t);
    document.querySelectorAll('[data-logo]').forEach((img) => {
      img.src = t === 'dark' ? 'assets/logo-branca.svg' : 'assets/logo-preta.svg';
    });
    document.querySelectorAll('[data-tema-ico]').forEach((b) => {
      b.innerHTML = ico(t === 'dark' ? 'sun' : 'moon');
    });
    if (window.Graficos && Graficos.redesenhar) Graficos.redesenhar();
  }
  function alternarTema() {
    aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  /* ---------- máscaras e validações ---------- */
  const soDigitos = (v) => String(v).replace(/\D/g, '');

  function mascaraDoc(v) {
    const d = soDigitos(v).slice(0, 14);
    if (d.length <= 11) {
      return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  function mascaraTel(v) {
    const d = soDigitos(v).slice(0, 11);
    if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }
  function ligarMascara(input, fn) {
    if (!input) return;
    input.addEventListener('input', () => { input.value = fn(input.value); });
  }

  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());
  const dominioValido = (v) => /^(?!-)[a-z0-9-]{2,63}(\.[a-z]{2,})+$/i.test(String(v).trim().replace(/^www\./i, ''));
  const localValido = (v) => /^[a-z0-9]([a-z0-9._-]{0,30}[a-z0-9])?$/i.test(String(v).trim());

  function forcaSenha(s) {
    let f = 0;
    if (s.length >= 8) f++;
    if (/[A-Z]/.test(s)) f++;
    if (/[0-9]/.test(s)) f++;
    if (/[^A-Za-z0-9]/.test(s)) f++;
    return f; /* 0 a 4 */
  }
  function senhaForte(n = 14) {
    const abc = 'abcdefghijkmnopqrstuvwxyz';
    const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const num = '23456789';
    const sim = '!@#$%&*?';
    const todos = abc + ABC + num + sim;
    let s = abc[rnd(abc.length)] + ABC[rnd(ABC.length)] + num[rnd(num.length)] + sim[rnd(sim.length)];
    for (let i = s.length; i < n; i++) s += todos[rnd(todos.length)];
    return s.split('').sort(() => Math.random() - .5).join('');
  }
  const rnd = (n) => Math.floor(Math.random() * n);

  /* ---------- campo de senha com olhinho ---------- */
  function campoSenha(id, placeholder, autocomplete) {
    return `<div class="pwd-wrap">
      <input type="password" class="input" id="${id}" placeholder="${esc(placeholder || '••••••••')}" autocomplete="${autocomplete || 'current-password'}">
      <button type="button" class="pwd-toggle" data-olho="${id}" aria-label="Mostrar senha">${ico('eye')}</button>
    </div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-olho]');
    if (!b) return;
    const inp = document.getElementById(b.getAttribute('data-olho'));
    if (!inp) return;
    const mostrar = inp.type === 'password';
    inp.type = mostrar ? 'text' : 'password';
    b.innerHTML = ico(mostrar ? 'eyeOff' : 'eye');
    b.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
  });

  /* ---------- estado de carregamento em botão ---------- */
  function carregando(btn, texto) {
    if (!btn) return () => {};
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${ico('refresh', 'spin')}<span>${esc(texto || 'Aguarde')}</span>`;
    return () => { btn.disabled = false; btn.innerHTML = original; };
  }

  /* ---------- badges de status ---------- */
  const STATUS = {
    ativo: ['badge-green', 'Ativo'], ativa: ['badge-green', 'Ativa'],
    pendente: ['badge-amber', 'Aguardando DNS'],
    suspenso: ['badge-red', 'Suspenso'], suspensa: ['badge-red', 'Suspensa'],
    cancelado: ['badge-mut', 'Cancelado'], cancelada: ['badge-mut', 'Cancelada'],
    trial: ['badge-blue', 'Em teste'], inadimplente: ['badge-red', 'Inadimplente'],
    paga: ['badge-green', 'Paga'], aberta: ['badge-amber', 'Em aberto'], vencida: ['badge-red', 'Vencida'],
    aberto: ['badge-amber', 'Aberto'], respondido: ['badge-blue', 'Respondido'], fechado: ['badge-mut', 'Fechado'],
  };
  function badge(status) {
    const [cls, txt] = STATUS[status] || ['badge-mut', status];
    return `<span class="badge ${cls}"><span class="dot"></span>${esc(txt)}</span>`;
  }

  return {
    esc, toast, modal, fecharModal, confirmar, copiar, linhaCopia,
    aplicarTema, alternarTema, mascaraDoc, mascaraTel, ligarMascara, soDigitos,
    emailValido, dominioValido, localValido, forcaSenha, senhaForte,
    campoSenha, carregando, badge,
  };
})();
