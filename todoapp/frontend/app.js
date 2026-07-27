// URL del backend (cambiaremos esto después)
const API_URL = '/api';
let allTasks = [];

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
      body: JSON.stringify({ ...task, completed: !completed }),
    });
    if (response.ok) {
      fetchTasks();
    }
  } catch (error) {
    console.error('Error:', error);
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
    li.innerHTML = `
      <input type="checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTask(${task.id}, ${task.completed})">
      <span>${task.title}</span>
      <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️ Eliminar</button>
    `;
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
