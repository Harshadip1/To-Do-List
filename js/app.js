/**
 * NexusTask — Core Application Module
 * Store, theme, notifications, shared UI, demo data
 */
const NexusStore = (() => {
  const STORAGE_KEY = 'nexustask_data';

  const defaultCategories = [
    { id: 'work', name: 'Work', color: '#7C3AED', icon: '💼' },
    { id: 'personal', name: 'Personal', color: '#06B6D4', icon: '🏠' },
    { id: 'study', name: 'Study', color: '#22C55E', icon: '📚' },
    { id: 'shopping', name: 'Shopping', color: '#F59E0B', icon: '🛒' },
    { id: 'health', name: 'Health', color: '#EF4444', icon: '❤️' },
    { id: 'projects', name: 'Projects', color: '#EC4899', icon: '🚀' }
  ];

  const defaultSettings = {
    theme: 'dark',
    accentColor: '#7C3AED',
    notifications: true,
    emailReminders: false,
    language: 'en',
    pomodoroMinutes: 25
  };

  let data = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        data = JSON.parse(raw);
        if (!data.categories?.length) data.categories = [...defaultCategories];
        if (!data.settings) data.settings = { ...defaultSettings };
        return data;
      }
    } catch (e) {
      console.warn('Storage load failed', e);
    }
    data = seedDemoData();
    save();
    return data;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }

  function seedDemoData() {
    const now = new Date();
    const addDays = (d) => {
      const x = new Date(now);
      x.setDate(x.getDate() + d);
      return x.toISOString().split('T')[0];
    };

    const tasks = [
      {
        id: 't1', title: 'Design system audit', description: 'Review component library and update design tokens for consistency.',
        category: 'work', priority: 'high', status: 'in-progress', progress: 65,
        dueDate: addDays(2), completed: false, notes: 'Focus on accessibility', labels: ['design', 'ui'],
        attachments: ['mockup.fig'], createdAt: addDays(-5)
      },
      {
        id: 't2', title: 'Quarterly report preparation', description: 'Compile metrics and prepare presentation slides.',
        category: 'work', priority: 'high', status: 'pending', progress: 20,
        dueDate: addDays(5), completed: false, notes: '', labels: ['reports'],
        attachments: [], createdAt: addDays(-3)
      },
      {
        id: 't3', title: 'Complete React course module', description: 'Finish hooks and context API sections.',
        category: 'study', priority: 'medium', status: 'in-progress', progress: 80,
        dueDate: addDays(7), completed: false, notes: 'Chapter 12 remaining', labels: ['learning'],
        attachments: [], createdAt: addDays(-10)
      },
      {
        id: 't4', title: 'Grocery shopping', description: 'Vegetables, fruits, and weekly essentials.',
        category: 'shopping', priority: 'low', status: 'pending', progress: 0,
        dueDate: addDays(1), completed: false, notes: '', labels: [],
        attachments: [], createdAt: addDays(-1)
      },
      {
        id: 't5', title: 'Morning workout routine', description: '30 min cardio + strength training.',
        category: 'health', priority: 'medium', status: 'done', progress: 100,
        dueDate: addDays(0), completed: true, notes: '', labels: ['fitness'],
        attachments: [], createdAt: addDays(-2)
      },
      {
        id: 't6', title: 'Launch landing page', description: 'Deploy marketing site with analytics integration.',
        category: 'projects', priority: 'high', status: 'in-progress', progress: 45,
        dueDate: addDays(14), completed: false, notes: 'Need QA sign-off', labels: ['launch', 'web'],
        attachments: ['spec.pdf'], createdAt: addDays(-7)
      },
      {
        id: 't7', title: 'Plan weekend trip', description: 'Book accommodation and create itinerary.',
        category: 'personal', priority: 'low', status: 'pending', progress: 10,
        dueDate: addDays(21), completed: false, notes: '', labels: ['travel'],
        attachments: [], createdAt: addDays(-4)
      },
      {
        id: 't8', title: 'Team standup notes', description: 'Document blockers and action items.',
        category: 'work', priority: 'medium', status: 'done', progress: 100,
        dueDate: addDays(-1), completed: true, notes: '', labels: [],
        attachments: [], createdAt: addDays(-1)
      }
    ];

    const activities = [
      { id: 'a1', type: 'complete', message: 'Completed "Morning workout routine"', time: addDays(0) },
      { id: 'a2', type: 'create', message: 'Created "Grocery shopping"', time: addDays(-1) },
      { id: 'a3', type: 'update', message: 'Updated progress on "Design system audit"', time: addDays(-1) },
      { id: 'a4', type: 'complete', message: 'Completed "Team standup notes"', time: addDays(-2) },
      { id: 'a5', type: 'create', message: 'Created "Launch landing page"', time: addDays(-7) }
    ];

    const stickyNotes = [
      { id: 's1', text: 'Review PR #42 before EOD' },
      { id: 's2', text: 'Call vendor at 3pm' },
      { id: 's3', text: 'Ideas: dark mode toggle animation' }
    ];

    return {
      tasks,
      categories: [...defaultCategories],
      activities,
      stickyNotes,
      settings: { ...defaultSettings },
      notifications: []
    };
  }

  function getTasks() { return data?.tasks || []; }
  function getCategories() { return data?.categories || defaultCategories; }
  function getSettings() { return data?.settings || defaultSettings; }
  function getActivities() { return data?.activities || []; }
  function getStickyNotes() { return data?.stickyNotes || []; }

  function getTask(id) {
    return getTasks().find(t => t.id === id);
  }

  function addTask(task) {
    const t = {
      id: 't' + Date.now(),
      completed: false,
      progress: 0,
      status: 'pending',
      notes: '',
      labels: [],
      attachments: [],
      createdAt: new Date().toISOString().split('T')[0],
      ...task
    };
    data.tasks.unshift(t);
    logActivity('create', `Created "${t.title}"`);
    syncNotifications();
    save();
    return t;
  }

  function updateTask(id, updates) {
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const prev = data.tasks[idx];
    data.tasks[idx] = { ...prev, ...updates };
    if (updates.completed === true) {
      data.tasks[idx].progress = 100;
      data.tasks[idx].status = 'done';
      logActivity('complete', `Completed "${data.tasks[idx].title}"`);
    } else if (updates.completed === false) {
      data.tasks[idx].status = data.tasks[idx].progress > 0 ? 'in-progress' : 'pending';
    }
    if (updates.progress !== undefined && !updates.completed) {
      const p = updates.progress;
      data.tasks[idx].status = p >= 100 ? 'done' : p > 0 ? 'in-progress' : 'pending';
      if (p >= 100) data.tasks[idx].completed = true;
    }
    logActivity('update', `Updated "${data.tasks[idx].title}"`);
    syncNotifications();
    save();
    return data.tasks[idx];
  }

  function deleteTask(id) {
    const task = getTask(id);
    data.tasks = data.tasks.filter(t => t.id !== id);
    if (task) logActivity('update', `Deleted "${task.title}"`);
    syncNotifications();
    save();
  }

  function deleteTasks(ids) {
    ids.forEach(id => deleteTask(id));
  }

  function addCategory(cat) {
    const c = { id: 'cat' + Date.now(), ...cat };
    data.categories.push(c);
    save();
    return c;
  }

  function updateCategory(id, updates) {
    const idx = data.categories.findIndex(c => c.id === id);
    if (idx === -1) return;
    data.categories[idx] = { ...data.categories[idx], ...updates };
    save();
  }

  function deleteCategory(id) {
    data.categories = data.categories.filter(c => c.id !== id);
    data.tasks.forEach(t => {
      if (t.category === id) t.category = 'personal';
    });
    save();
  }

  function logActivity(type, message) {
    data.activities.unshift({
      id: 'a' + Date.now(),
      type,
      message,
      time: new Date().toISOString()
    });
    if (data.activities.length > 50) data.activities = data.activities.slice(0, 50);
  }

  function syncNotifications() {
    const notifs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    getTasks().forEach(task => {
      if (!task.dueDate || task.completed) return;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

      if (diff <= 0) {
        notifs.push({
          id: 'n-due-' + task.id,
          type: 'due',
          title: 'Overdue task',
          message: `"${task.title}" is past due`,
          time: new Date().toISOString(),
          unread: true
        });
      } else if (diff <= 3) {
        notifs.push({
          id: 'n-up-' + task.id,
          type: 'priority',
          title: 'Upcoming deadline',
          message: `"${task.title}" due in ${diff} day(s)`,
          time: new Date().toISOString(),
          unread: true
        });
      }

      if (task.priority === 'high' && !task.completed) {
        notifs.push({
          id: 'n-pri-' + task.id,
          type: 'priority',
          title: 'High priority',
          message: `"${task.title}" needs attention`,
          time: new Date().toISOString(),
          unread: diff <= 7
        });
      }
    });

    getTasks().filter(t => t.completed).slice(0, 3).forEach(task => {
      notifs.push({
        id: 'n-done-' + task.id,
        type: 'done',
        title: 'Task completed',
        message: `"${task.title}" marked complete`,
        time: task.createdAt,
        unread: false
      });
    });

    data.notifications = notifs.slice(0, 20);
  }

  function getNotifications() {
    syncNotifications();
    return data.notifications || [];
  }

  function getStats() {
    const tasks = getTasks();
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const total = tasks.length;
    const rate = total ? Math.round((completed / total) * 100) : 0;

    const today = new Date().toISOString().split('T')[0];
    const completedToday = tasks.filter(t =>
      t.completed && t.dueDate === today
    ).length;

    const productivityScore = Math.min(100, Math.round(
      rate * 0.5 +
      (completedToday * 10) +
      (tasks.filter(t => t.progress > 0 && !t.completed).length * 5)
    ));

    return { completed, pending, total, rate, productivityScore, completedToday };
  }

  function getCategoryStats() {
    return getCategories().map(cat => ({
      ...cat,
      count: getTasks().filter(t => t.category === cat.id).length,
      completed: getTasks().filter(t => t.category === cat.id && t.completed).length
    }));
  }

  function updateSettings(updates) {
    data.settings = { ...data.settings, ...updates };
    save();
  }

  function exportData() {
    return JSON.stringify(data, null, 2);
  }

  function importData(json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed.tasks) {
        data = parsed;
        save();
        return true;
      }
    } catch (e) { return false; }
    return false;
  }

  return {
    load, save, getTasks, getTask, addTask, updateTask, deleteTask, deleteTasks,
    getCategories, addCategory, updateCategory, deleteCategory,
    getSettings, updateSettings, getActivities, getStickyNotes, getNotifications,
    getStats, getCategoryStats, exportData, importData, logActivity
  };
})();

/* Theme */
const ThemeManager = {
  init() {
    NexusStore.load();
    const settings = NexusStore.getSettings();
    this.apply(settings.theme, settings.accentColor);
  },

  apply(theme, accent) {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
    if (accent) {
      document.documentElement.style.setProperty('--primary', accent);
    }
  },

  toggle() {
    const s = NexusStore.getSettings();
    const next = s.theme === 'dark' ? 'light' : 'dark';
    NexusStore.updateSettings({ theme: next });
    this.apply(next, s.accentColor);
    return next;
  }
};

/* UI Helpers */
const UI = {
  formatDate(dateStr) {
    if (!dateStr) return 'No date';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatRelativeTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return this.formatDate(iso.split('T')[0]);
  },

  getCategory(id) {
    return NexusStore.getCategories().find(c => c.id === id) || { name: id, color: '#7C3AED', icon: '📁' };
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  toast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { info: 'ℹ️', success: '✅', error: '❌' };
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${icons[type] || icons.info}</span><span>${this.escapeHtml(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  },

  openModal(id) {
    document.getElementById(id)?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
    document.body.style.overflow = '';
  },

  initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) UI.closeModal(overlay.id);
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) UI.closeModal(modal.id);
      });
    });
  },

  initSidebar() {
    const toggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }
    const open = () => {
      sidebar?.classList.add('open');
      overlay.classList.add('open');
    };
    const close = () => {
      sidebar?.classList.remove('open');
      overlay.classList.remove('open');
    };
    toggle?.addEventListener('click', () => {
      sidebar?.classList.contains('open') ? close() : open();
    });
    overlay.addEventListener('click', close);
  },

  initParticles() {
    const container = document.querySelector('.particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 15 + 's';
      p.style.animationDuration = 12 + Math.random() * 10 + 's';
      container.appendChild(p);
    }
  },

  initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  },

  initHeader() {
    const themeBtn = document.getElementById('themeToggle');
    themeBtn?.addEventListener('click', () => {
      const theme = ThemeManager.toggle();
      updateThemeIcon(theme);
      UI.toast(`Switched to ${theme} mode`, 'success');
    });
    updateThemeIcon(NexusStore.getSettings().theme);

    const notifBtn = document.getElementById('notifToggle');
    const dropdown = document.getElementById('notifDropdown');
    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('open');
      renderNotifications();
    });
    document.addEventListener('click', () => dropdown?.classList.remove('open'));

    const globalSearch = document.getElementById('globalSearch');
    globalSearch?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && globalSearch.value.trim()) {
        sessionStorage.setItem('nexustask_search', globalSearch.value.trim());
        window.location.href = 'tasks.html';
      }
    });

    updateNotifBadge();
  },

  setActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
  },

  updateSidebarProgress() {
    const stats = NexusStore.getStats();
    const bar = document.querySelector('.mini-progress-bar');
    const label = document.querySelector('.sidebar-score');
    if (bar) bar.style.width = stats.rate + '%';
    if (label) label.textContent = stats.rate + '%';
  }
};

function renderNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;
  const notifs = NexusStore.getNotifications();
  if (!notifs.length) {
    list.innerHTML = '<div class="notif-item"><div class="notif-body"><p>No notifications</p></div></div>';
    return;
  }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${n.unread ? 'unread' : ''}">
      <div class="notif-icon ${n.type}">${n.type === 'due' ? '⏰' : n.type === 'done' ? '✓' : '⚡'}</div>
      <div class="notif-body">
        <p><strong>${UI.escapeHtml(n.title)}</strong></p>
        <p>${UI.escapeHtml(n.message)}</p>
        <span>${UI.formatRelativeTime(n.time)}</span>
      </div>
    </div>
  `).join('');
  updateNotifBadge();
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  if (!badge) return;
  const unread = NexusStore.getNotifications().filter(n => n.unread).length;
  badge.textContent = unread || '';
  badge.style.display = unread ? 'flex' : 'none';
}

function renderSharedHeader() {
  updateNotifBadge();
  UI.updateSidebarProgress();
}

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  UI.initSidebar();
  UI.initParticles();
  UI.initScrollReveal();
  UI.initModals();
  UI.initHeader();
  UI.setActiveNav();
  renderSharedHeader();
});
