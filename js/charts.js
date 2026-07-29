/* ============================================================
   OutBox Mail — Gráficos (Chart.js)
   Lê as cores do tema atual e redesenha quando o tema muda.
   ============================================================ */
window.Graficos = (function () {
  const vivos = [];
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  function base() {
    return {
      texto: css('--text-soft') || '#46505c',
      grade: css('--border') || '#e6eaef',
      brand: css('--brand') || '#F15532',
      verde: css('--green') || '#16A34A',
      azul: css('--blue') || '#2563EB',
      violeta: css('--violet') || '#7C3AED',
      ambar: css('--amber') || '#D97706',
      surface: css('--surface') || '#fff',
    };
  }

  function comum(c) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: false,
          labels: { color: c.texto, font: { family: 'Inter', size: 12 }, usePointStyle: true, boxWidth: 8 },
        },
        tooltip: {
          backgroundColor: c.surface,
          titleColor: css('--text'),
          bodyColor: c.texto,
          borderColor: c.grade,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          usePointStyle: true,
          titleFont: { family: 'Inter', weight: '700' },
          bodyFont: { family: 'Inter' },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: c.grade },
          ticks: { color: c.texto, font: { family: 'Inter', size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: c.grade },
          border: { display: false },
          ticks: { color: c.texto, font: { family: 'Inter', size: 11 } },
        },
      },
      animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700 },
    };
  }

  function criar(id, config) {
    const el = document.getElementById(id);
    if (!el || typeof Chart === 'undefined') return null;
    const g = new Chart(el, config);
    vivos.push({ id, g, fabricar: () => config });
    return g;
  }

  function receita(id, serie) {
    const c = base();
    const ctx = document.getElementById(id);
    if (!ctx) return;
    const grad = ctx.getContext('2d').createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, 'rgba(241,85,50,.28)');
    grad.addColorStop(1, 'rgba(241,85,50,0)');
    const opts = comum(c);
    opts.scales.y.ticks.callback = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR');
    opts.plugins.tooltip.callbacks = { label: (i) => ' Recebido: ' + OB.money(i.parsed.y) };
    criar(id, {
      type: 'line',
      data: {
        labels: serie.map((s) => s.rotulo),
        datasets: [{
          data: serie.map((s) => s.receita),
          borderColor: c.brand, backgroundColor: grad,
          borderWidth: 2.5, fill: true, tension: .38,
          pointRadius: 3, pointHoverRadius: 6,
          pointBackgroundColor: c.brand, pointBorderColor: c.surface, pointBorderWidth: 2,
        }],
      },
      options: opts,
    });
  }

  function caixas(id, serie) {
    const c = base();
    const opts = comum(c);
    opts.plugins.tooltip.callbacks = { label: (i) => ' ' + i.parsed.y + ' caixas ativas' };
    criar(id, {
      type: 'bar',
      data: {
        labels: serie.map((s) => s.rotulo),
        datasets: [{
          data: serie.map((s) => s.caixas),
          backgroundColor: c.azul, borderRadius: 7, borderSkipped: false, maxBarThickness: 34,
        }],
      },
      options: opts,
    });
  }

  function planos(id, dados) {
    const c = base();
    const cores = [c.violeta, c.brand, c.azul, c.verde];
    criar(id, {
      type: 'doughnut',
      data: {
        labels: dados.map((d) => d.nome),
        datasets: [{
          data: dados.map((d) => d.caixas),
          backgroundColor: cores, borderColor: c.surface, borderWidth: 3, hoverOffset: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom', display: true,
            labels: { color: c.texto, font: { family: 'Inter', size: 12 }, usePointStyle: true, boxWidth: 8, padding: 14 },
          },
          tooltip: {
            backgroundColor: c.surface, titleColor: css('--text'), bodyColor: c.texto,
            borderColor: c.grade, borderWidth: 1, padding: 12, cornerRadius: 10,
            callbacks: { label: (i) => ' ' + i.parsed + ' caixas' },
          },
        },
        animation: { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700 },
      },
    });
  }

  function destruir() {
    while (vivos.length) {
      const v = vivos.pop();
      try { v.g.destroy(); } catch (e) {}
    }
  }

  /* redesenha após troca de tema, mantendo os dados */
  function redesenhar() {
    if (!vivos.length) return;
    const ids = vivos.map((v) => v.id);
    destruir();
    if (window.Admin && Admin.desenharGraficos) setTimeout(() => Admin.desenharGraficos(ids), 40);
  }

  return { receita, caixas, planos, destruir, redesenhar };
})();
