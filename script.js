// Tasks are stored on this device using the browser's local storage.
const storageKey = 'daylist-tasks-v1';
const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#title');
const notesInput = document.querySelector('#notes');
const priorityInput = document.querySelector('#priority');
const list = document.querySelector('#task-list');
const status = document.querySelector('#status');
let tasks = [];
let editingId = null;
let filter = 'all';
let storageReadable = true;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (!Array.isArray(saved) || !saved.every(task => task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.notes === 'string' && typeof task.completed === 'boolean' && ['Low', 'Medium', 'High'].includes(task.priority))) throw new Error('Invalid saved tasks');
  tasks = saved;
} catch {
  storageReadable = false;
  status.textContent = 'Saved tasks could not be loaded. You can use the app, but changes will not be saved in this session.';
}

function save(message) {
  try {
    if (!storageReadable) throw new Error('Storage unavailable');
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    status.textContent = message;
  } catch {
    status.textContent = 'Your changes are visible, but could not be saved. Keep this page open to avoid losing them.';
  }
  render();
}

function resetForm() {
  editingId = null;
  form.reset();
  titleInput.setCustomValidity('');
  document.querySelector('#form-heading').textContent = 'Add a new task';
  document.querySelector('#save-button').textContent = '+ Add task';
  document.querySelector('#cancel-edit').hidden = true;
}

function render() {
  list.replaceChildren();
  const completed = tasks.filter(task => task.completed).length;
  document.querySelector('#task-count').textContent = tasks.length;
  document.querySelector('#progress').textContent = tasks.length ? `${completed} of ${tasks.length} completed` : 'A fresh start';
  const visibleTasks = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  const empty = document.querySelector('#empty-state');
  empty.hidden = visibleTasks.length > 0;
  empty.querySelector('h3').textContent = tasks.length ? 'All clear here' : 'A little space for a fresh start';
  empty.querySelector('p').textContent = tasks.length ? `No ${filter === 'completed' ? 'completed' : 'active'} tasks to show. Try another filter.` : 'Add your first task and take it from there.';

  for (const task of visibleTasks) {
    const article = document.createElement('article');
    article.className = `task${task.completed ? ' completed' : ''}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark ${task.title} as ${task.completed ? 'active' : 'completed'}`);
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      save(task.completed ? 'Task completed. Nice work!' : 'Task marked active.');
    });
    const content = document.createElement('div');
    content.className = 'task-content';
    const heading = document.createElement('h3');
    heading.textContent = task.title;
    const notes = document.createElement('p');
    notes.className = 'task-notes';
    notes.textContent = task.notes;
    notes.hidden = !task.notes;
    const bottom = document.createElement('div');
    bottom.className = 'task-bottom';
    const badge = document.createElement('span');
    badge.className = `badge ${task.priority.toLowerCase()}`;
    badge.textContent = `${task.priority} priority`;
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${task.title}`);
    edit.addEventListener('click', () => {
      editingId = task.id;
      titleInput.value = task.title;
      titleInput.setCustomValidity('');
      notesInput.value = task.notes;
      priorityInput.value = task.priority;
      document.querySelector('#form-heading').textContent = 'Edit your task';
      document.querySelector('#save-button').textContent = 'Save changes';
      document.querySelector('#cancel-edit').hidden = false;
      titleInput.focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${task.title}`);
    remove.addEventListener('click', () => {
      if (!confirm(`Delete “${task.title}”?`)) return;
      tasks = tasks.filter(item => item.id !== task.id);
      if (editingId === task.id) resetForm();
      save('Task deleted.');
    });
    actions.append(edit, remove);
    bottom.append(badge, actions);
    content.append(heading, notes, bottom);
    article.append(checkbox, content);
    list.append(article);
  }
}

titleInput.addEventListener('input', () => titleInput.setCustomValidity(''));
form.addEventListener('submit', event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.setCustomValidity('Please enter a task name.');
    titleInput.reportValidity();
    return;
  }
  const details = { title, notes: notesInput.value.trim(), priority: priorityInput.value };
  const wasEditing = editingId !== null;
  if (wasEditing) Object.assign(tasks.find(task => task.id === editingId), details);
  else tasks.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...details, completed: false });
  resetForm();
  // Return to the full list so a newly added or edited task is visible.
  setFilter('all');
  save(wasEditing ? 'Task updated.' : 'Task added. One step closer!');
  titleInput.focus();
});

function setFilter(value) {
  filter = value;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  render();
}
document.querySelector('#cancel-edit').addEventListener('click', resetForm);
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
render();
