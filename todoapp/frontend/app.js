// URL del backend (cambiaremos esto después)
const API_URL = '/api';
let allTasks = [];
let editingId = null; // Track which task is being edited
 
// Elementos del DOM
const taskInput = document.getElementById('taskInput');
const filterInput = document.getElementById('filterInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
 
// Cargar tareas cuando carga la página
fetchTasks();
 
// Event listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});
 
filterInput.addEventListener('keyup', filterTasks);
 
// ========== FUNCIONES ==========
 
async function fetchTasks() {
  try {
    const response = await fetch(`${API_URL}/tasks`);
    allTasks = await response.json();
    renderTasks(allTasks);
  } catch (error) {
    console.error('Error al cargar tareas:', error);
    taskList.innerHTML = '<li class="task-item" style="color: red;">Error al conectar con el servidor</li>';
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
      body: JSON.stringify({ title: taskInput.value }),
    });
 
    if (response.ok) {
      taskInput.value = '';
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
      body: JSON.stringify({ title: task.title, completed: !completed }),
    });
    if (response.ok) {
      fetchTasks();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
 
// NEW: Edit task function
async function startEditTask(id) {
  const task = allTasks.find(t => t.id === id);
  editingId = id;
  renderTasks(allTasks);
  
  // Focus on the input after render
  setTimeout(() => {
    const input = document.querySelector(`#edit-input-${id}`);
    if (input) {
      input.focus();
      input.select();
    }
  }, 0);
}
 
// NEW: Save edited task
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
      body: JSON.stringify({ title: newTitle, completed: task.completed }),
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
 
// NEW: Cancel edit
function cancelEditTask() {
  editingId = null;
  renderTasks(allTasks);
}
 
// NEW: Handle Enter/Escape in edit input
function handleEditKeypress(e, id) {
  if (e.key === 'Enter') {
    saveEditTask(id);
  } else if (e.key === 'Escape') {
    cancelEditTask();
  }
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
    
    // If this task is being edited, show edit input
    if (editingId === task.id) {
      li.innerHTML = `
        <input type="checkbox" disabled ${task.completed ? 'checked' : ''} 
               style="cursor: not-allowed; opacity: 0.5;">
        <input type="text" id="edit-input-${task.id}" class="edit-input" 
               value="${task.title}" 
               onkeypress="handleEditKeypress(event, ${task.id})">
        <button class="save-btn" onclick="saveEditTask(${task.id})">💾 Guardar</button>
        <button class="cancel-btn" onclick="cancelEditTask()">❌ Cancelar</button>
      `;
    } else {
      // Normal task display
      li.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTask(${task.id}, ${task.completed})">
        <span class="task-title" ondblclick="startEditTask(${task.id})">${task.title}</span>
        <button class="edit-btn" onclick="startEditTask(${task.id})">✏️ Editar</button>
        <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️ Eliminar</button>
      `;
    }
    taskList.appendChild(li);
  });
}
 
function filterTasks() {
  const filter = filterInput.value.toLowerCase();
  const filtered = allTasks.filter(task =>
    task.title.toLowerCase().includes(filter)
  );
  renderTasks(filtered);
}
