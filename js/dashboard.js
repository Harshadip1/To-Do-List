/**
 * NexusTask — Dashboard Page
 */
(function () {
  const CIRCUMFERENCE = 2 * Math.PI * 60;

  function initDashboard() {
    NexusStore.load();
    renderWelcome();
    renderStats();
    renderProgressCircle();
    renderDashboardChart();
    renderActivities();
    renderDeadlines();
    renderStickyNotes();
    initPomodoro();
    UI.updateSidebarProgress();
  }

  function renderWelcome() {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';

    const title = document.getElementById('welcomeTitle');
    const sub = document.getElementById('welcomeSubtitle');
    const stats = NexusStore.getStats();

    if (title) title.textContent = `${greeting}!`;
    if (sub) {
      sub.textContent = stats.pending > 0
        ? `You have ${stats.pending} task(s) waiting. Let's make today productive.`
        : 'All caught up! Great work staying on top of things.';
    }
  }

  function renderStats() {
    const stats = NexusStore.getStats();
    const tasks = NexusStore.getTasks();
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const dueThisWeek = tasks.filter(t => {
      if (!t.dueDate || t.completed) return false;
      const d = new Date(t.dueDate);
      return d >= today && d <= weekEnd;
    }).length;

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) animateNumber(el, parseInt(el.textContent) || 0, val);
    };

    set('statCompleted', stats.completed);
    set('statPending', stats.pending);
    set('statScore', stats.productivityScore);
    set('statDeadlines', dueThisWeek);

    const change = document.getElementById('statCompletedChange');
    if (change) {
      change.textContent = stats.completedToday > 0
        ? `+${stats.completedToday} completed today`
        : 'Keep going!';
    }
  }

  function animateNumber(el, from, to) {
    const duration = 800;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderProgressCircle() {
    const stats = NexusStore.getStats();
    const circle = document.getElementById('progressCircle');
    const percent = document.getElementById('progressPercent');
    const offset = CIRCUMFERENCE - (stats.rate / 100) * CIRCUMFERENCE;

    if (circle) {
      circle.style.strokeDasharray = CIRCUMFERENCE;
      setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);
    }
    if (percent) percent.textContent = stats.rate + '%';
  }

  function renderDashboardChart() {
    const canvas = document.getElementById('dashboardChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const stats = NexusStore.getStats();
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 200 * dpr;
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = 200;

    const data = [
      { label: 'Done', value: stats.completed, color: '#22C55E' },
      { label: 'Pending', value: stats.pending, color: '#F59E0B' },
      { label: 'In Progress', value: NexusStore.getTasks().filter(t => !t.completed && t.progress > 0).length, color: '#06B6D4' }
    ];
    const max = Math.max(...data.map(d => d.value), 1);
    const barW = (w - 80) / data.length;

    ctx.clearRect(0, 0, w, h);
    data.forEach((d, i) => {
      const barH = (d.value / max) * (h - 60);
      const x = 40 + i * barW + barW * 0.15;
      const y = h - 30 - barH;
      const grad = ctx.createLinearGradient(0, y, 0, h - 30);
      grad.addColorStop(0, d.color);
      grad.addColorStop(1, d.color + '44');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW * 0.7, barH, 6);
      ctx.fill();
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW * 0.35, h - 10);
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(d.value, x + barW * 0.35, y - 8);
    });
  }

  function renderActivities() {
    const list = document.getElementById('activityList');
    if (!list) return;
    const activities = NexusStore.getActivities().slice(0, 6);
    list.innerHTML = activities.map((a, i) => `
      <li class="activity-item" style="animation-delay:${i * 0.08}s">
        <span class="activity-dot ${a.type === 'complete' ? 'complete' : a.type === 'create' ? 'create' : 'update'}"></span>
        <div>
          <p>${UI.escapeHtml(a.message)}</p>
          <time>${UI.formatRelativeTime(a.time)}</time>
        </div>
      </li>
    `).join('') || '<li class="activity-item"><p>No recent activity</p></li>';
  }

  function renderDeadlines() {
    const container = document.getElementById('deadlineList');
    if (!container) return;

    const upcoming = NexusStore.getTasks()
      .filter(t => !t.completed && t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    if (!upcoming.length) {
      container.innerHTML = '<div class="empty-state"><p>No upcoming deadlines</p></div>';
      return;
    }

    container.innerHTML = upcoming.map(t => {
      const d = new Date(t.dueDate);
      return `
        <div class="deadline-item">
          <div class="deadline-date">
            <span class="day">${d.getDate()}</span>
            <span class="month">${d.toLocaleDateString('en', { month: 'short' })}</span>
          </div>
          <div style="flex:1">
            <strong>${UI.escapeHtml(t.title)}</strong>
            <p style="font-size:0.8rem;color:var(--text-muted)">${UI.getCategory(t.category).name} · ${t.priority} priority</p>
          </div>
          <span class="badge-tag badge-priority ${t.priority}">${t.priority}</span>
        </div>
      `;
    }).join('');
  }

  function renderStickyNotes() {
    const container = document.getElementById('stickyNotes');
    if (!container) return;
    const notes = NexusStore.getStickyNotes();
    container.innerHTML = notes.map(n => `
      <div class="sticky-note">${UI.escapeHtml(n.text)}</div>
    `).join('');
  }

  function initPomodoro() {
    const display = document.getElementById('pomodoroDisplay');
    const startBtn = document.getElementById('pomodoroStart');
    const resetBtn = document.getElementById('pomodoroReset');
    if (!display) return;

    const settings = NexusStore.getSettings();
    let totalSecs = (settings.pomodoroMinutes || 25) * 60;
    let remaining = totalSecs;
    let interval = null;
    let running = false;

    const format = (s) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const tick = () => {
      remaining--;
      display.textContent = format(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        running = false;
        startBtn.textContent = 'Start';
        UI.toast('Pomodoro complete! Take a break.', 'success');
        remaining = totalSecs;
        display.textContent = format(remaining);
      }
    };

    startBtn?.addEventListener('click', () => {
      if (running) {
        clearInterval(interval);
        running = false;
        startBtn.textContent = 'Resume';
      } else {
        interval = setInterval(tick, 1000);
        running = true;
        startBtn.textContent = 'Pause';
      }
    });

    resetBtn?.addEventListener('click', () => {
      clearInterval(interval);
      running = false;
      remaining = totalSecs;
      display.textContent = format(remaining);
      startBtn.textContent = 'Start';
    });

    display.textContent = format(remaining);
  }

  document.addEventListener('DOMContentLoaded', initDashboard);
  window.addEventListener('resize', () => renderDashboardChart());
})();
