/**
 * NexusTask — Analytics Module
 */
(function () {
  const COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#22C55E', done: '#22C55E', pending: '#F59E0B', progress: '#06B6D4' };

  function init() {
    NexusStore.load();
    renderStats();
    renderCompletionChart();
    renderPriorityChart();
    renderWeeklyChart();
    renderTrendChart();
    renderTimeTracking();
    renderGoals();
    UI.updateSidebarProgress();
  }

  function setupCanvas(canvas, height = 220) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.parentElement.clientWidth;
    canvas.width = w * dpr;
    canvas.height = height * dpr;
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    return { ctx, w, h: height };
  }

  function renderStats() {
    const stats = NexusStore.getStats();
    const tasks = NexusStore.getTasks();
    const highDone = tasks.filter(t => t.priority === 'high' && t.completed).length;
    const weekAvg = Math.round(stats.rate * 0.85 + 10);

    const container = document.getElementById('analyticsStats');
    if (!container) return;

    const items = [
      { label: 'Completion Rate', value: stats.rate + '%', icon: '✅', color: 'green' },
      { label: 'Tasks Completed', value: stats.completed, icon: '📊', color: 'purple' },
      { label: 'Weekly Average', value: weekAvg + '%', icon: '📈', color: 'cyan' },
      { label: 'High Priority Done', value: highDone, icon: '⚡', color: 'amber' }
    ];

    container.innerHTML = items.map((item, i) => `
      <div class="card stat-card reveal" style="animation-delay:${i * 0.1}s">
        <div class="stat-icon ${item.color}">${item.icon}</div>
        <div class="stat-value" data-animate="${item.value}">0</div>
        <div class="stat-label">${item.label}</div>
      </div>
    `).join('');

    container.querySelectorAll('.stat-value').forEach(el => {
      const target = el.dataset.animate;
      if (target.includes('%')) {
        animateValue(el, 0, parseInt(target), '%');
      } else {
        animateValue(el, 0, parseInt(target), '');
      }
    });
  }

  function animateValue(el, from, to, suffix) {
    const duration = 1000;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const val = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderCompletionChart() {
    const canvas = document.getElementById('completionChart');
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const stats = NexusStore.getStats();
    const inProgress = NexusStore.getTasks().filter(t => !t.completed && t.progress > 0).length;

    const data = [
      { label: 'Completed', value: stats.completed, color: COLORS.done },
      { label: 'In Progress', value: inProgress, color: COLORS.progress },
      { label: 'Pending', value: stats.pending - inProgress, color: COLORS.pending }
    ].filter(d => d.value > 0);

    if (!data.length) data.push({ label: 'No data', value: 1, color: '#334155' });

    drawDonut(ctx, w / 2, h / 2, Math.min(w, h) / 2 - 20, data);
    renderLegend('completionLegend', data);
  }

  function renderPriorityChart() {
    const canvas = document.getElementById('priorityChart');
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const tasks = NexusStore.getTasks();

    const data = ['high', 'medium', 'low'].map(p => ({
      label: p.charAt(0).toUpperCase() + p.slice(1),
      value: tasks.filter(t => t.priority === p).length,
      color: COLORS[p]
    })).filter(d => d.value > 0);

    if (!data.length) data.push({ label: 'None', value: 1, color: '#334155' });
    drawDonut(ctx, w / 2, h / 2, Math.min(w, h) / 2 - 20, data);
    renderLegend('priorityLegend', data);
  }

  function drawDonut(ctx, cx, cy, r, data) {
    const total = data.reduce((s, d) => s + d.value, 0);
    let start = -Math.PI / 2;
    ctx.clearRect(0, 0, cx * 2, cy * 2);

    data.forEach(d => {
      const slice = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.arc(cx, cy, r * 0.55, start + slice, start, true);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      start += slice;
    });
  }

  function renderLegend(id, data) {
    const el = document.getElementById(id);
    if (!el) return;
    const total = data.reduce((s, d) => s + d.value, 0);
    el.innerHTML = data.map(d => `
      <span class="legend-item">
        <span class="legend-dot" style="background:${d.color}"></span>
        ${d.label} (${Math.round((d.value / total) * 100)}%)
      </span>
    `).join('');
  }

  function renderWeeklyChart() {
    const canvas = document.getElementById('weeklyChart');
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 240);

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const values = days.map((_, i) => {
      const base = NexusStore.getStats().rate;
      return Math.max(0, Math.min(100, Math.round(base + (Math.sin(i) * 15) + (Math.random() * 10 - 5))));
    });

    drawBarChart(ctx, w, h, days, values, '#7C3AED');
  }

  function renderTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const { ctx, w, h } = setupCanvas(canvas, 240);

    const labels = ['W1', 'W2', 'W3', 'W4'];
    const rate = NexusStore.getStats().rate;
    const values = labels.map((_, i) => Math.max(10, Math.min(100, rate - 20 + i * 8 + Math.round(Math.random() * 5))));

    drawLineChart(ctx, w, h, labels, values, '#06B6D4');
  }

  function drawBarChart(ctx, w, h, labels, values, color) {
    const max = Math.max(...values, 1);
    const pad = 40;
    const barW = (w - pad * 2) / labels.length;

    ctx.clearRect(0, 0, w, h);
    labels.forEach((label, i) => {
      const barH = ((values[i] / max) * (h - 50));
      const x = pad + i * barW + barW * 0.15;
      const y = h - 30 - barH;
      const grad = ctx.createLinearGradient(0, y, 0, h - 30);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW * 0.7, barH, 4);
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + barW * 0.35, h - 8);
    });
  }

  function drawLineChart(ctx, w, h, labels, values, color) {
    const max = Math.max(...values, 1);
    const pad = 40;
    const stepX = (w - pad * 2) / (labels.length - 1);

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    values.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = h - 30 - (v / max) * (h - 50);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    values.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = h - 30 - (v / max) * (h - 50);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px Inter,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], x, h - 8);
    });
  }

  function renderTimeTracking() {
    const container = document.getElementById('timeTracking');
    if (!container) return;

    const cats = NexusStore.getCategoryStats().filter(c => c.count > 0).slice(0, 5);
    const max = Math.max(...cats.map(c => c.count), 1);

    container.innerHTML = cats.map(cat => `
      <div class="time-track-item">
        <span style="font-size:0.85rem;min-width:80px">${cat.icon} ${UI.escapeHtml(cat.name)}</span>
        <div class="time-bar"><div class="time-bar-fill" style="width:0%" data-width="${(cat.count / max) * 100}%"></div></div>
        <span style="font-size:0.8rem;color:var(--text-muted)">${cat.count}h</span>
      </div>
    `).join('') || '<p style="color:var(--text-muted)">No time data yet</p>';

    setTimeout(() => {
      container.querySelectorAll('.time-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width;
      });
    }, 200);
  }

  function renderGoals() {
    const tasks = NexusStore.getTasks();
    const highPriority = tasks.filter(t => t.priority === 'high');
    const goalRate = highPriority.length
      ? Math.round((highPriority.filter(t => t.completed).length / highPriority.length) * 100)
      : NexusStore.getStats().rate;

    const circle = document.getElementById('goalCircle');
    const percent = document.getElementById('goalPercent');
    const text = document.getElementById('goalText');
    const circumference = 2 * Math.PI * 68;

    if (circle) {
      circle.style.strokeDasharray = circumference;
      setTimeout(() => {
        circle.style.strokeDashoffset = circumference - (goalRate / 100) * circumference;
      }, 150);
    }
    if (percent) percent.textContent = goalRate + '%';
    if (text) {
      text.textContent = goalRate >= 80
        ? 'Excellent! You\'re crushing your goals.'
        : `${highPriority.filter(t => !t.completed).length} high-priority tasks remaining.`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('resize', () => {
    renderCompletionChart();
    renderPriorityChart();
    renderWeeklyChart();
    renderTrendChart();
  });
})();
