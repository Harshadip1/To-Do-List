/**
 * NexusTask — Tasks Module
 */
const TaskManager = (() => {
  let selectedIds = new Set();
  let dragId = null;
  let modalAttachments = [];

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  function init() {
    NexusStore.load();
    populateCategoryFilters();
    bindEvents();
    applySearchFromSession();
    showSkeletonThenRender();
  }

  function showSkeletonThenRender() {
    const skeleton = document.getElementById('taskListSkeleton');
    const list = document.getElementById('taskList');
    if (skeleton && list) {
      skeleton.style.display = 'flex';
      list.style.opacity = '0.3';
      setTimeout(() => {
        skeleton.style.display = 'none';
        list.style.opacity = '1';
        renderTasks();
        renderCategories();
      }, 400);
    } else {
      renderTasks();
      renderCategories();
    }
  }

  function applySearchFromSession() {
    const q = sessionStorage.getItem('nexustask_search');
    if (q) {
      const input = document.getElementById('taskSearch');
      if (input) input.value = q;
      sessionStorage.removeItem('nexustask_search');
    }
  }

  function populateCategoryFilters() {
    const select = document.getElementById('filterCategory');
    const taskCat = document.getElementById('taskCategory');
    const cats = NexusStore.getCategories();
    const opts = cats.map(c => `<option value="${c.id}">${UI.escapeHtml(c.name)}</option>`).join('');
    if (select) select.innerHTML = '<option value="">All Categories</option>' + opts;
    if (taskCat) taskCat.innerHTML = opts;
  }

  function getFilteredTasks() {
    let tasks = [...NexusStore.getTasks()];
    const search = document.getElementById('taskSearch')?.value.toLowerCase() || '';
    const priority = document.getElementById('filterPriority')?.value;
    const category = document.getElementById('filterCategory')?.value;
    const status = document.getElementById('filterStatus')?.value;
    const sort = document.getElementById('sortBy')?.value || 'date-desc';

    if (search) {
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(search) ||
        (t.description || '').toLowerCase().includes(search) ||
        (t.labels || []).some(l => l.toLowerCase().includes(search))
      );
    }
    if (priority) tasks = tasks.filter(t => t.priority === priority);
    if (category) tasks = tasks.filter(t => t.category === category);
    if (status) tasks = tasks.filter(t => t.status === status);

    tasks.sort((a, b) => {
      switch (sort) {
        case 'date-asc': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'due-asc': return (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1;
        case 'due-desc': return (b.dueDate || '') > (a.dueDate || '') ? 1 : -1;
        case 'completion': return (b.progress || 0) - (a.progress || 0);
        case 'priority': return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        default: return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    return tasks;
  }

  function renderTasks() {
    const list = document.getElementById('taskList');
    const empty = document.getElementById('emptyTasks');
    if (!list) return;

    const tasks = getFilteredTasks();
    if (!tasks.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    list.innerHTML = tasks.map((t, i) => renderTaskCard(t, i)).join('');
    bindTaskEvents();
    updateBulkBar();
  }

  function renderTaskCard(task, index) {
    const cat = UI.getCategory(task.category);
    const isSelected = selectedIds.has(task.id);
    const labels = (task.labels || []).map(l =>
      `<span class="label-tag">${UI.escapeHtml(l)}</span>`
    ).join('');

    return `
      <article class="task-card ${task.completed ? 'completed' : ''} ${isSelected ? 'selected' : ''} reveal"
        draggable="true" data-id="${task.id}" role="listitem"
        style="animation-delay:${index * 0.05}s">
        <div class="task-card-header">
          <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}" role="checkbox" aria-checked="${task.completed}">
            ${task.completed ? '✓' : ''}
          </div>
          <h3 class="task-title">${UI.escapeHtml(task.title)}</h3>
          <input type="checkbox" class="task-select" data-id="${task.id}" ${isSelected ? 'checked' : ''} style="margin-left:auto" aria-label="Select task">
        </div>
        ${task.description ? `<p class="task-desc">${UI.escapeHtml(task.description)}</p>` : ''}
        <div class="task-meta">
          <span class="badge-tag badge-priority ${task.priority}">${task.priority}</span>
          <span class="badge-tag badge-category" style="background:${cat.color}22;color:${cat.color}">${cat.icon} ${UI.escapeHtml(cat.name)}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">📅 ${UI.formatDate(task.dueDate)}</span>
          <span class="status-dot ${task.status}"></span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${task.status}</span>
        </div>
        ${labels ? `<div class="labels-wrap">${labels}</div>` : ''}
        <div class="task-progress" style="margin-top:0.5rem">
          <div class="task-progress-bar" style="width:${task.progress || 0}%"></div>
        </div>
        ${task.notes ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem">📝 ${UI.escapeHtml(task.notes)}</p>` : ''}
        ${task.attachments?.length ? `<div class="attachment-preview">${task.attachments.map(a => `<span class="attachment-chip">📎 ${UI.escapeHtml(a)}</span>`).join('')}</div>` : ''}
        <div class="task-actions">
          <button data-action="edit" data-id="${task.id}">Edit</button>
          <button data-action="delete" data-id="${task.id}">Delete</button>
        </div>
      </article>
    `;
  }

  function bindTaskEvents() {
    document.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        dragId = card.dataset.id;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetId = card.dataset.id;
        if (dragId && dragId !== targetId) reorderTasks(dragId, targetId);
      });
    });

    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.action;
        const id = el.dataset.id;
        if (action === 'toggle') toggleComplete(id);
        if (action === 'edit') openEditModal(id);
        if (action === 'delete') deleteTask(id);
      });
    });

    document.querySelectorAll('.task-select').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        e.target.closest('.task-card')?.classList.toggle('selected', e.target.checked);
        updateBulkBar();
      });
    });
  }

  function reorderTasks(fromId, toId) {
    const tasks = NexusStore.getTasks();
    const fromIdx = tasks.findIndex(t => t.id === fromId);
    const toIdx = tasks.findIndex(t => t.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [item] = tasks.splice(fromIdx, 1);
    tasks.splice(toIdx, 0, item);
    NexusStore.save();
    renderTasks();
    UI.toast('Task reordered', 'success');
  }

  function toggleComplete(id) {
    const task = NexusStore.getTask(id);
    if (!task) return;
    NexusStore.updateTask(id, { completed: !task.completed, progress: task.completed ? 0 : 100 });
    renderTasks();
    UI.updateSidebarProgress();
    UI.toast(task.completed ? 'Task reopened' : 'Task completed!', 'success');
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    NexusStore.deleteTask(id);
    selectedIds.delete(id);
    renderTasks();
    renderCategories();
    UI.updateSidebarProgress();
    UI.toast('Task deleted', 'info');
  }

  function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Add Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskProgress').value = 0;
    modalAttachments = [];
    renderAttachmentPreview();
    UI.openModal('taskModal');
  }

  function openEditModal(id) {
    const task = NexusStore.getTask(id);
    if (!task) return;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description || '';
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskDue').value = task.dueDate || '';
    document.getElementById('taskProgress').value = task.progress || 0;
    document.getElementById('taskNotes').value = task.notes || '';
    document.getElementById('taskLabels').value = (task.labels || []).join(', ');
    modalAttachments = [...(task.attachments || [])];
    renderAttachmentPreview();
    UI.openModal('taskModal');
  }

  function saveTask(e) {
    e.preventDefault();
    const id = document.getElementById('taskId').value;
    const progress = parseInt(document.getElementById('taskProgress').value, 10) || 0;
    const payload = {
      title: document.getElementById('taskTitle').value.trim(),
      description: document.getElementById('taskDesc').value.trim(),
      category: document.getElementById('taskCategory').value,
      priority: document.getElementById('taskPriority').value,
      dueDate: document.getElementById('taskDue').value || null,
      progress,
      completed: progress >= 100,
      notes: document.getElementById('taskNotes').value.trim(),
      labels: document.getElementById('taskLabels').value.split(',').map(s => s.trim()).filter(Boolean),
      attachments: modalAttachments
    };

    if (id) NexusStore.updateTask(id, payload);
    else NexusStore.addTask(payload);

    UI.closeModal('taskModal');
    renderTasks();
    renderCategories();
    UI.updateSidebarProgress();
    UI.toast(id ? 'Task updated' : 'Task created', 'success');
  }

  function renderAttachmentPreview() {
    const preview = document.getElementById('attachmentPreview');
    if (!preview) return;
    preview.innerHTML = modalAttachments.map((name, i) => `
      <span class="attachment-chip">📎 ${UI.escapeHtml(name)}
        <button type="button" data-remove-attach="${i}" style="background:none;border:none;cursor:pointer;color:var(--danger)">×</button>
      </span>
    `).join('');
    preview.querySelectorAll('[data-remove-attach]').forEach(btn => {
      btn.addEventListener('click', () => {
        modalAttachments.splice(parseInt(btn.dataset.removeAttach), 1);
        renderAttachmentPreview();
      });
    });
  }

  function renderCategories() {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    const stats = NexusStore.getCategoryStats();
    grid.innerHTML = stats.map(cat => `
      <div class="category-card" data-category="${cat.id}">
        <div class="category-color" style="background:${cat.color}33;color:${cat.color}">${cat.icon || '📁'}</div>
        <h4>${UI.escapeHtml(cat.name)}</h4>
        <div class="category-count" data-count="${cat.count}">0</div>
        <p style="font-size:0.8rem;color:var(--text-muted)">${cat.completed} completed</p>
        <div style="margin-top:0.75rem;display:flex;gap:0.35rem;justify-content:center">
          <button class="btn btn-secondary btn-sm" data-cat-edit="${cat.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-cat-delete="${cat.id}">Delete</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.category-count').forEach(el => {
      const target = parseInt(el.dataset.count, 10);
      animateCounter(el, target);
    });

    grid.querySelectorAll('[data-cat-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCategoryModal(btn.dataset.catEdit);
      });
    });
    grid.querySelectorAll('[data-cat-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete category? Tasks will move to Personal.')) {
          NexusStore.deleteCategory(btn.dataset.catDelete);
          populateCategoryFilters();
          renderCategories();
          renderTasks();
        }
      });
    });

    grid.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        document.getElementById('filterCategory').value = card.dataset.category;
        document.querySelector('[data-tab="tasks"]')?.click();
        renderTasks();
      });
    });
  }

  function animateCounter(el, target) {
    let current = 0;
    const step = () => {
      current += Math.ceil((target - current) / 8) || 1;
      if (current >= target) { el.textContent = target; return; }
      el.textContent = current;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function openCategoryModal(id) {
    if (id) {
      const cat = NexusStore.getCategories().find(c => c.id === id);
      if (!cat) return;
      document.getElementById('categoryModalTitle').textContent = 'Edit Category';
      document.getElementById('categoryId').value = cat.id;
      document.getElementById('categoryName').value = cat.name;
      document.getElementById('categoryColor').value = cat.color;
      document.getElementById('categoryIcon').value = cat.icon || '';
    } else {
      document.getElementById('categoryForm').reset();
      document.getElementById('categoryId').value = '';
      document.getElementById('categoryModalTitle').textContent = 'Add Category';
    }
    UI.openModal('categoryModal');
  }

  function saveCategory(e) {
    e.preventDefault();
    const id = document.getElementById('categoryId').value;
    const payload = {
      name: document.getElementById('categoryName').value.trim(),
      color: document.getElementById('categoryColor').value,
      icon: document.getElementById('categoryIcon').value || '📁'
    };
    if (id) NexusStore.updateCategory(id, payload);
    else NexusStore.addCategory(payload);
    UI.closeModal('categoryModal');
    populateCategoryFilters();
    renderCategories();
    UI.toast('Category saved', 'success');
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    const count = document.getElementById('bulkCount');
    if (!bar) return;
    bar.classList.toggle('visible', selectedIds.size > 0);
    if (count) count.textContent = `${selectedIds.size} selected`;
  }

  function bindEvents() {
    document.getElementById('taskForm')?.addEventListener('submit', saveTask);
    document.getElementById('categoryForm')?.addEventListener('submit', saveCategory);

    ['taskSearch', 'filterPriority', 'filterCategory', 'filterStatus', 'sortBy'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderTasks);
      document.getElementById(id)?.addEventListener('change', renderTasks);
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
      });
    });

    document.getElementById('fabAdd')?.addEventListener('click', (e) => {
      if (e.detail === 1) {
        setTimeout(() => {
          if (e.detail === 1) document.getElementById('quickAdd')?.classList.toggle('open');
        }, 250);
      }
    });

    document.getElementById('quickAddSubmit')?.addEventListener('click', () => {
      const input = document.getElementById('quickAddInput');
      const title = input?.value.trim();
      if (!title) return;
      NexusStore.addTask({ title, category: 'personal', priority: 'medium' });
      input.value = '';
      document.getElementById('quickAdd')?.classList.remove('open');
      renderTasks();
      UI.toast('Task added', 'success');
    });

    document.getElementById('emptyAddBtn')?.addEventListener('click', openAddModal);
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => openCategoryModal(null));

    document.getElementById('fabAdd')?.addEventListener('dblclick', openAddModal);

    document.getElementById('selectAllBtn')?.addEventListener('click', () => {
      const tasks = getFilteredTasks();
      const allSelected = tasks.every(t => selectedIds.has(t.id));
      tasks.forEach(t => allSelected ? selectedIds.delete(t.id) : selectedIds.add(t.id));
      renderTasks();
    });

    document.getElementById('bulkComplete')?.addEventListener('click', () => {
      selectedIds.forEach(id => NexusStore.updateTask(id, { completed: true, progress: 100 }));
      selectedIds.clear();
      renderTasks();
      UI.updateSidebarProgress();
    });

    document.getElementById('bulkDelete')?.addEventListener('click', () => {
      if (!confirm(`Delete ${selectedIds.size} tasks?`)) return;
      NexusStore.deleteTasks([...selectedIds]);
      selectedIds.clear();
      renderTasks();
      renderCategories();
    });

    document.getElementById('bulkCancel')?.addEventListener('click', () => {
      selectedIds.clear();
      renderTasks();
    });

    const drop = document.getElementById('attachmentDrop');
    const fileInput = document.getElementById('attachmentInput');
    drop?.addEventListener('click', () => fileInput?.click());
    drop?.addEventListener('dragover', (e) => { e.preventDefault(); drop.style.borderColor = 'var(--primary)'; });
    drop?.addEventListener('dragleave', () => { drop.style.borderColor = ''; });
    drop?.addEventListener('drop', (e) => {
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    });
    fileInput?.addEventListener('change', () => addFiles(fileInput.files));
  }

  function addFiles(fileList) {
    [...fileList].forEach(f => modalAttachments.push(f.name));
    renderAttachmentPreview();
  }

  return { init, renderTasks, openAddModal };
})();

document.addEventListener('DOMContentLoaded', () => TaskManager.init());
