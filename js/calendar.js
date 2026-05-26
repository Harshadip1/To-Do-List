/**
 * NexusTask — Calendar Module
 */
(function () {
  let currentDate = new Date();
  let selectedDate = new Date().toISOString().split('T')[0];
  let viewMode = 'month';

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function init() {
    NexusStore.load();
    bindEvents();
    render();
    renderReminders();
    renderDayDetail(selectedDate);
  }

  function bindEvents() {
    document.getElementById('calPrev')?.addEventListener('click', () => navigate(-1));
    document.getElementById('calNext')?.addEventListener('click', () => navigate(1));

    document.querySelectorAll('.cal-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.cal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        viewMode = tab.dataset.view;
        render();
      });
    });
  }

  function navigate(dir) {
    if (viewMode === 'month') currentDate.setMonth(currentDate.getMonth() + dir);
    else if (viewMode === 'week') currentDate.setDate(currentDate.getDate() + dir * 7);
    else currentDate.setDate(currentDate.getDate() + dir);
    render();
  }

  function getTasksForDate(dateStr) {
    return NexusStore.getTasks().filter(t => t.dueDate === dateStr);
  }

  function dateStr(d) {
    return d.toISOString().split('T')[0];
  }

  function render() {
    const title = document.getElementById('calTitle');
    const container = document.getElementById('calendarView');
    if (!container) return;

    if (viewMode === 'month') {
      if (title) title.textContent = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      container.innerHTML = renderMonth();
    } else if (viewMode === 'week') {
      if (title) title.textContent = 'Week of ' + getWeekStart(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      container.innerHTML = renderWeek();
    } else {
      if (title) title.textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      container.innerHTML = renderDay();
    }

    bindDayClicks();
  }

  function getWeekStart(d) {
    const start = new Date(d);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }

  function renderMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const today = dateStr(new Date());

    let html = '<div class="calendar-grid">';
    DAY_NAMES.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });

    const prevMonth = new Date(year, month, 0);
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonth.getDate() - i);
      html += dayCell(d, true, today);
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(year, month, day);
      html += dayCell(d, false, today);
    }
    const remaining = 42 - (startPad + last.getDate());
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      html += dayCell(d, true, today);
    }
    html += '</div>';
    return html;
  }

  function dayCell(d, otherMonth, today) {
    const ds = dateStr(d);
    const tasks = getTasksForDate(ds);
    const isToday = ds === today;
    const isSelected = ds === selectedDate;
    const hasDeadline = tasks.some(t => !t.completed);

    let dots = tasks.slice(0, 3).map(t => {
      const cat = UI.getCategory(t.category);
      return `<span class="cal-event-dot" style="background:${cat.color}"></span>`;
    }).join('');

    return `
      <div class="cal-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasDeadline ? 'has-deadline' : ''}"
        data-date="${ds}" tabindex="0" role="button">
        ${d.getDate()}
        <div class="cal-events">${dots}</div>
      </div>
    `;
  }

  function renderWeek() {
    const start = getWeekStart(currentDate);
    let html = '<div class="calendar-grid" style="grid-template-columns:repeat(7,1fr)">';
    DAY_NAMES.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });

    const today = dateStr(new Date());
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const ds = dateStr(d);
      const tasks = getTasksForDate(ds);
      html += `
        <div class="cal-day ${ds === today ? 'today' : ''} ${ds === selectedDate ? 'selected' : ''}" data-date="${ds}" style="min-height:100px;aspect-ratio:auto">
          <strong>${d.getDate()}</strong>
          ${tasks.map(t => `<div style="font-size:0.65rem;margin-top:4px;padding:2px 4px;border-radius:4px;background:var(--gradient-card);cursor:pointer" data-task="${t.id}">${UI.escapeHtml(t.title.substring(0, 12))}</div>`).join('')}
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  function renderDay() {
    const ds = dateStr(currentDate);
    const tasks = getTasksForDate(ds);
    selectedDate = ds;

    let html = `<div style="padding:1rem">`;
    if (!tasks.length) {
      html += '<p style="color:var(--text-muted)">No tasks scheduled for this day.</p>';
    } else {
      tasks.forEach(t => {
        const cat = UI.getCategory(t.category);
        html += `
          <div class="deadline-item" style="margin-bottom:0.5rem;cursor:pointer" data-task="${t.id}">
            <span class="badge-tag badge-priority ${t.priority}">${t.priority}</span>
            <div style="flex:1">
              <strong>${UI.escapeHtml(t.title)}</strong>
              <p style="font-size:0.8rem;color:var(--text-muted)">${cat.icon} ${cat.name}</p>
            </div>
            <span>${t.progress || 0}%</span>
          </div>
        `;
      });
    }
    html += '</div>';
    renderDayDetail(ds);
    return html;
  }

  function bindDayClicks() {
    document.querySelectorAll('.cal-day[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        selectedDate = cell.dataset.date;
        document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        renderDayDetail(selectedDate);
      });
    });

    document.querySelectorAll('[data-task]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showTaskPopup(el.dataset.task);
      });
    });
  }

  function renderDayDetail(dateStr) {
    const title = document.getElementById('selectedDateTitle');
    const container = document.getElementById('dayTasks');
    if (!title || !container) return;

    const d = new Date(dateStr + 'T12:00:00');
    title.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const tasks = getTasksForDate(dateStr);
    if (!tasks.length) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem">No tasks on this date.</p>';
      return;
    }

    container.innerHTML = tasks.map(t => `
      <div class="deadline-item" style="cursor:pointer;margin-bottom:0.5rem" data-task="${t.id}">
        <div style="flex:1">
          <strong>${UI.escapeHtml(t.title)}</strong>
          <p style="font-size:0.8rem;color:var(--text-muted)">${t.completed ? '✓ Done' : t.status}</p>
        </div>
        <span class="badge-tag badge-priority ${t.priority}">${t.priority}</span>
      </div>
    `).join('');

    container.querySelectorAll('[data-task]').forEach(el => {
      el.addEventListener('click', () => showTaskPopup(el.dataset.task));
    });
  }

  function renderReminders() {
    const list = document.getElementById('remindersList');
    if (!list) return;

    const upcoming = NexusStore.getTasks()
      .filter(t => !t.completed && t.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    list.innerHTML = upcoming.map(t => `
      <div class="deadline-item" style="margin-bottom:0.5rem">
        <span style="font-size:1.2rem">🔔</span>
        <div style="flex:1">
          <p style="font-size:0.85rem">${UI.escapeHtml(t.title)}</p>
          <span style="font-size:0.75rem;color:var(--text-muted)">${UI.formatDate(t.dueDate)}</span>
        </div>
      </div>
    `).join('') || '<p style="color:var(--text-muted);font-size:0.85rem">No upcoming reminders</p>';
  }

  function showTaskPopup(id) {
    const task = NexusStore.getTask(id);
    if (!task) return;
    const cat = UI.getCategory(task.category);
    document.getElementById('eventModalTitle').textContent = task.title;
    document.getElementById('eventModalBody').innerHTML = `
      <p>${UI.escapeHtml(task.description || 'No description')}</p>
      <div class="task-meta" style="margin-top:1rem">
        <span class="badge-tag badge-priority ${task.priority}">${task.priority}</span>
        <span class="badge-tag" style="background:${cat.color}22;color:${cat.color}">${cat.name}</span>
      </div>
      <p style="margin-top:1rem;font-size:0.9rem"><strong>Due:</strong> ${UI.formatDate(task.dueDate)}</p>
      <p style="font-size:0.9rem"><strong>Progress:</strong> ${task.progress || 0}%</p>
      ${task.notes ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted)">📝 ${UI.escapeHtml(task.notes)}</p>` : ''}
    `;
    UI.openModal('eventModal');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
