// URL del backend (cambiaremos esto después)
const API_URL = '/api';
let allTasks = [];
let editingId = null;
let currentTaskBeingEdited = null;
let showingDetails = false;
 
// ===== ELEMENTOS DEL DOM =====
const taskInput = document.getElementById('taskInput');
const filterInput = document.getElementById('filterInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
 
// Elementos de detalles avanzados
const detailsGroup = document.getElementById('detailsGroup');
const detailsTaskTitle = document.getElementById('detailsTaskTitle');
const descriptionInput = document.getElementById('descriptionInput');
const dueDateInput = document.getElementById('dueDateInput');
const priorityInput = document.getElementById('priorityInput');
const categoryInput = document.getElementById('categoryInput');
const saveDetailsBtn = document.getElementById('saveDetailsBtn');
const cancelDetailsBtn = document.getElementById('cancelDetailsBtn');
 
// ===== CARGAR TAREAS AL INICIAR =====
fetchTasks();
 
// ===== EVENT LISTENERS =====
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});
filterInput.addEventListener('keyup', filterTasks);
saveDetailsBtn.addEventListener('click', saveTaskDetails);
cancelDetailsBtn.addEventListener('click', cancelTaskDetails);
 
// ========== FUNCIONES PRINCIPALES ==========
 
async function fetchTasks() {
  try {
    const response = await fetch(`${API_URL}/tasks`);
    allTasks = await response.json();
    renderTasks(allTasks);
    initSortable();
  } catch (error) {
    console.error('Error al cargar tareas:', error);
    taskList.innerHTML = '<li class="task-item" style="color: red;">Error al conectar</li>';
  }
}
 
async function addTask() {
  if (!taskInput.value.trim()) {
    alert('Por favor ingresa una tarea');
    return;
  }
 
  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: taskInput.value,
        description: descriptionInput.value || null,
        due_date: dueDateInput.value || null,
        priority: priorityInput.value,
        category: categoryInput.value
      }),
    });
 
    if (response.ok) {
      taskInput.value = '';
      resetDetailsFields();
      detailsGroup.style.display = 'none';
      fetchTasks();
    } else {
      alert('Error al agregar tarea');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión');
  }
}
 
async function deleteTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  
  try {
    const response = await fetch(`${API_URL}/tasks/${id}`, { 
      method: 'DELETE' 
    });
    if (response.ok) {
      fetchTasks();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
 
async function toggleTask(id, completed) {
  try {
    const task = allTasks.find(t => t.id === id);
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        category: task.category,
        completed: !completed 
      }),
    });
    if (response.ok) {
      fetchTasks();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
 
// ===== EDITAR TÍTULO (INLINE) =====
function startEditTask(id) {
  editingId = id;
  renderTasks(allTasks);
  setTimeout(() => {
    const input = document.querySelector(`#edit-input-${id}`);
    if (input) {
      input.focus();
      input.select();
    }
  }, 0);
}
 
async function saveEditTask(id) {
  const input = document.querySelector(`#edit-input-${id}`);
  const newTitle = input.value.trim();
  
  if (!newTitle) {
    alert('El título no puede estar vacío');
    return;
  }
  
  try {
    const task = allTasks.find(t => t.id === id);
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title: newTitle,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority,
        category: task.category,
        completed: task.completed
      }),
    });
    
    if (response.ok) {
      editingId = null;
      fetchTasks();
    } else {
      alert('Error al actualizar la tarea');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión');
  }
}
 
function cancelEditTask() {
  editingId = null;
  renderTasks(allTasks);
}
 
function handleEditKeypress(e, id) {
  if (e.key === 'Enter') {
    saveEditTask(id);
  } else if (e.key === 'Escape') {
    cancelEditTask();
  }
}
 
// ===== EDITAR DETALLES (MODAL/PANEL) =====
function resetDetailsFields() {
  descriptionInput.value = '';
  dueDateInput.value = '';
  priorityInput.value = 'medium';
  categoryInput.value = 'personal';
  if (detailsTaskTitle) detailsTaskTitle.textContent = '';
}

function editTaskDetails(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  
  currentTaskBeingEdited = id;
  showingDetails = true;
  
  descriptionInput.value = task.description || '';
  dueDateInput.value = task.due_date || '';
  priorityInput.value = task.priority || 'medium';
  categoryInput.value = task.category || 'personal';
  if (detailsTaskTitle) detailsTaskTitle.textContent = `Editando detalles de: ${task.title}`;
  
  detailsGroup.style.display = 'flex';
  descriptionInput.focus();
}
 
async function saveTaskDetails() {
  if (!currentTaskBeingEdited) return;
  
  try {
    const task = allTasks.find(t => t.id === currentTaskBeingEdited);

    if (!task) {
      alert('Esta tarea ya no existe (pudo ser eliminada). Se cerrará el panel.');
      currentTaskBeingEdited = null;
      showingDetails = false;
      detailsGroup.style.display = 'none';
      resetDetailsFields();
      fetchTasks();
      return;
    }
    
    const response = await fetch(`${API_URL}/tasks/${currentTaskBeingEdited}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        description: descriptionInput.value || null,
        due_date: dueDateInput.value || null,
        priority: priorityInput.value,
        category: categoryInput.value,
        completed: task.completed
      })
    });
    
    if (response.ok) {
      currentTaskBeingEdited = null;
      showingDetails = false;
      detailsGroup.style.display = 'none';
      resetDetailsFields();
      fetchTasks();
      alert('Detalles guardados');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al guardar');
  }
}
 
function cancelTaskDetails() {
  currentTaskBeingEdited = null;
  showingDetails = false;
  detailsGroup.style.display = 'none';
  resetDetailsFields();
}
 
// ===== DRAG & DROP =====
function initSortable() {
  if (typeof Sortable === 'undefined') {
    console.warn('SortableJS no está cargado');
    return;
  }
  
  Sortable.create(taskList, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    onEnd: async function(evt) {
      const taskIds = Array.from(taskList.querySelectorAll('.task-item'))
        .map(li => parseInt(li.dataset.taskId));
      
      await updateTaskOrder(taskIds);
    }
  });
}
 
async function updateTaskOrder(taskIds) {
  try {
    const response = await fetch(`${API_URL}/tasks/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIds: taskIds })
    });
    
    if (!response.ok) {
      console.error('Error actualizando orden');
      fetchTasks();
    }
  } catch (error) {
    console.error('Error:', error);
    fetchTasks();
  }
}
 
// ===== RENDERIZAR TAREAS =====
// Escapa HTML para evitar XSS al insertar datos del usuario en el DOM
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<li class="task-item" style="text-align: center; color: #999;">No hay tareas. ¡Crea una! 🎯</li>';
    return;
  }
 
  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.taskId = task.id;
    
    // Colores de prioridad
    const priorityColors = {
      'high': '#ff4444',
      'medium': '#ffaa00',
      'low': '#44aa44'
    };
    const priorityColor = priorityColors[task.priority] || '#666';
    
    // Formatear fecha
    const dueDate = task.due_date 
      ? new Date(task.due_date).toLocaleDateString('es-ES')
      : '';
    
    if (editingId === task.id) {
      // MODO EDICIÓN DE TÍTULO
      li.innerHTML = `
        <input type="checkbox" disabled ${task.completed ? 'checked' : ''} 
               style="cursor: not-allowed; opacity: 0.5;">
        <input type="text" id="edit-input-${task.id}" class="edit-input" 
               value="${escapeHtml(task.title)}" 
               onkeypress="handleEditKeypress(event, ${task.id})">
        <button class="save-btn" onclick="saveEditTask(${task.id})">💾 Guardar</button>
        <button class="cancel-btn" onclick="cancelEditTask()">❌ Cancelar</button>
      `;
    } else {
      // MODO NORMAL
      li.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTask(${task.id}, ${task.completed})">
        
        <div class="task-content">
          <span class="task-title" ondblclick="startEditTask(${task.id})">${escapeHtml(task.title)}</span>
          ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
          ${dueDate ? `<small class="task-date">📅 ${dueDate}</small>` : ''}
        </div>
        
        <span class="task-priority" style="background-color: ${priorityColor}">
          ${escapeHtml(task.priority.toUpperCase())}
        </span>
        <span class="task-category">${escapeHtml(task.category)}</span>
        
        <button class="edit-details-btn" onclick="editTaskDetails(${task.id})">⚙️ Detalles</button>
        <button class="edit-btn" onclick="startEditTask(${task.id})">✏️ Editar</button>
        <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️ Eliminar</button>
      `;
    }
    
    taskList.appendChild(li);
  });
  
  // Reinicializar Sortable después de render
  initSortable();
}
 
// ===== FILTRO =====
function filterTasks() {
  const filter = filterInput.value.toLowerCase();
  const filtered = allTasks.filter(task =>
    task.title.toLowerCase().includes(filter) ||
    (task.description && task.description.toLowerCase().includes(filter)) ||
    task.category.toLowerCase().includes(filter)
  );
  renderTasks(filtered);
  initSortable();
}
 
// ========== FIN DEL CÓDIGO ==========
 
console.log('App cargada. API URL:', API_URL);
