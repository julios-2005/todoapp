// =====================================================
// BACKEND COMPLETO - SERVIDOR NODE.JS CON FEATURES AVANZADAS
// Incluye: CRUD básico + Campos adicionales + Reordenar (Drag & Drop)
// =====================================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== CONFIGURACIÓN DE BASE DE DATOS =====
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'todo_db'
});

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('Error en pool de conexión:', err.message);
});

// ===== CREAR TABLA (si no existe) =====
pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    priority VARCHAR(10) DEFAULT 'medium',
    category VARCHAR(20) DEFAULT 'personal',
    "order" INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(err => {
  console.error('Error creando tabla:', err.message);
});

console.log('✅ Tabla tasks verificada/creada');

// ========== ENDPOINTS API ==========

// ===== GET: Obtener todas las tareas =====
/**
 * GET /api/tasks
 * Retorna: Array de tareas ordenadas por "order"
 */
app.get('/api/tasks', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY "order" ASC, id ASC'
    );
    res.json(result.rows);
    console.log(`✅ GET /api/tasks - ${result.rows.length} tareas retornadas`);
  } catch (err) {
    console.error('❌ Error en GET /api/tasks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST: Crear nueva tarea =====
/**
 * POST /api/tasks
 * Body: { title, description?, due_date?, priority?, category? }
 * Retorna: Tarea creada con todos los campos
 */
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, due_date, priority, category } = req.body;
    
    // Validación básica
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Título es requerido' });
    }
    
    // Obtener máximo orden actual
    const orderResult = await pool.query(
      'SELECT MAX("order") as max_order FROM tasks'
    );
    const nextOrder = (orderResult.rows[0].max_order || -1) + 1;
    
    // Insertar nueva tarea
    const result = await pool.query(
      `INSERT INTO tasks (title, description, due_date, priority, category, "order", completed) 
       VALUES ($1, $2, $3, $4, $5, $6, false) 
       RETURNING *`,
      [
        title.trim(),
        description && description.trim() ? description.trim() : null,
        due_date || null,
        priority || 'medium',
        category || 'personal',
        nextOrder
      ]
    );
    
    res.status(201).json(result.rows[0]);
    console.log(`✅ POST /api/tasks - Tarea creada: "${title}"`);
  } catch (err) {
    console.error('❌ Error en POST /api/tasks:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET: Obtener tarea por ID =====
/**
 * GET /api/tasks/:id
 * Retorna: Tarea específica
 */
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    res.json(result.rows[0]);
    console.log(`✅ GET /api/tasks/${id} - Tarea retornada`);
  } catch (err) {
    console.error(`❌ Error en GET /api/tasks/${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== PUT: Actualizar tarea =====
/**
 * PUT /api/tasks/:id
 * Body: { title, description?, due_date?, priority?, category?, completed? }
 * Retorna: Tarea actualizada
 */
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, priority, category, completed } = req.body;
    
    // Validación
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Título es requerido' });
    }
    
    // Verificar que tarea existe
    const checkResult = await pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    // Actualizar tarea
    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, 
           description = $2, 
           due_date = $3, 
           priority = $4, 
           category = $5, 
           completed = $6
       WHERE id = $7 
       RETURNING *`,
      [
        title.trim(),
        description && description.trim() ? description.trim() : null,
        due_date || null,
        priority || 'medium',
        category || 'personal',
        completed ?? false,
        id
      ]
    );
    
    res.json(result.rows[0]);
    console.log(`✅ PUT /api/tasks/${id} - Tarea actualizada`);
  } catch (err) {
    console.error(`❌ Error en PUT /api/tasks/${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== DELETE: Eliminar tarea =====
/**
 * DELETE /api/tasks/:id
 * Retorna: Mensaje de confirmación
 */
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validación
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    // Verificar que existe
    const checkResult = await pool.query(
      'SELECT title FROM tasks WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    const taskTitle = checkResult.rows[0].title;
    
    // Eliminar
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    
    res.json({ message: 'Tarea eliminada', deleted_id: id });
    console.log(`✅ DELETE /api/tasks/${id} - Tarea eliminada: "${taskTitle}"`);
  } catch (err) {
    console.error(`❌ Error en DELETE /api/tasks/${req.params.id}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST: Reordenar tareas (Drag & Drop) =====
/**
 * POST /api/tasks/reorder
 * Body: { taskIds: [id1, id2, id3, ...] }
 * Actualiza el campo "order" según el nuevo orden
 * Retorna: Mensaje de éxito
 */
app.post('/api/tasks/reorder', async (req, res) => {
  try {
    const { taskIds } = req.body;
    
    // Validación
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'taskIds debe ser un array no vacío' });
    }
    
    // Validar que todos son números
    if (!taskIds.every(id => !isNaN(id))) {
      return res.status(400).json({ error: 'Todos los IDs deben ser números' });
    }
    
    // Usar transacción para consistencia
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Actualizar orden de cada tarea
      for (let i = 0; i < taskIds.length; i++) {
        const updateResult = await client.query(
          'UPDATE tasks SET "order" = $1 WHERE id = $2 RETURNING id',
          [i, taskIds[i]]
        );
        
        if (updateResult.rows.length === 0) {
          throw new Error(`Tarea con ID ${taskIds[i]} no encontrada`);
        }
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        message: 'Orden actualizado exitosamente',
        reordered_count: taskIds.length 
      });
      console.log(`✅ POST /api/tasks/reorder - ${taskIds.length} tareas reordenadas`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('❌ Error en POST /api/tasks/reorder:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET: Obtener estadísticas =====
/**
 * GET /api/tasks/stats
 * Retorna: Estadísticas útiles
 */
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN completed = false THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority
      FROM tasks
    `);
    
    const stats = result.rows[0];
    res.json({
      total: parseInt(stats.total),
      completed: parseInt(stats.completed) || 0,
      pending: parseInt(stats.pending) || 0,
      high_priority: parseInt(stats.high_priority) || 0,
      medium_priority: parseInt(stats.medium_priority) || 0,
      low_priority: parseInt(stats.low_priority) || 0,
      completion_rate: stats.total > 0 ? 
        ((parseInt(stats.completed) / parseInt(stats.total)) * 100).toFixed(1) + '%' : 
        '0%'
    });
    console.log('✅ GET /api/stats - Estadísticas retornadas');
  } catch (err) {
    console.error('❌ Error en GET /api/stats:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET: Obtener tareas por categoría =====
/**
 * GET /api/tasks/category/:category
 * Retorna: Tareas filtradas por categoría
 */
app.get('/api/tasks/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE category = $1 ORDER BY "order" ASC',
      [category]
    );
    
    res.json(result.rows);
    console.log(`✅ GET /api/tasks/category/${category} - ${result.rows.length} tareas`);
  } catch (err) {
    console.error(`❌ Error en GET /api/tasks/category/${req.params.category}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET: Obtener tareas por prioridad =====
/**
 * GET /api/tasks/priority/:priority
 * Retorna: Tareas filtradas por prioridad
 */
app.get('/api/tasks/priority/:priority', async (req, res) => {
  try {
    const { priority } = req.params;
    
    // Validar prioridad
    if (!['low', 'medium', 'high'].includes(priority)) {
      return res.status(400).json({ error: 'Prioridad inválida: low, medium o high' });
    }
    
    const result = await pool.query(
      'SELECT * FROM tasks WHERE priority = $1 ORDER BY "order" ASC',
      [priority]
    );
    
    res.json(result.rows);
    console.log(`✅ GET /api/tasks/priority/${priority} - ${result.rows.length} tareas`);
  } catch (err) {
    console.error(`❌ Error en GET /api/tasks/priority/${req.params.priority}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET: Obtener tareas próximas a vencer =====
/**
 * GET /api/tasks/upcoming/:days
 * Retorna: Tareas que vencen en los próximos N días
 */
app.get('/api/tasks/upcoming/:days', async (req, res) => {
  try {
    const { days } = req.params;
    
    if (isNaN(days) || days < 0) {
      return res.status(400).json({ error: 'days debe ser un número positivo' });
    }
    
    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE due_date IS NOT NULL 
       AND due_date <= CURRENT_DATE + INTERVAL '1 day' * $1
       AND due_date >= CURRENT_DATE
       AND completed = false
       ORDER BY due_date ASC`,
      [days]
    );
    
    res.json(result.rows);
    console.log(`✅ GET /api/tasks/upcoming/${days} - ${result.rows.length} tareas`);
  } catch (err) {
    console.error(`❌ Error en GET /api/tasks/upcoming/${req.params.days}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== GET: Health check =====
/**
 * GET /api/health
 * Verifica que el servidor está funcionando
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ===== Manejo de rutas no encontradas =====
app.use((req, res) => {
  console.warn(`⚠️ Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    method: req.method,
    path: req.path
  });
});

// ===== Manejo global de errores =====
app.use((err, req, res, next) => {
  console.error('❌ Error global:', err.message);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  });
});

// ===== INICIAR SERVIDOR =====
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   TODO APP BACKEND - AVANZADO ✅       ║
╠════════════════════════════════════════╣
║ Puerto: ${PORT}                            ║
║ DB: ${process.env.DB_NAME || 'todo_db'}                       ║
║ CORS: Enabled                          ║
║ Endpoints: 11                          ║
╚════════════════════════════════════════╝

📚 Endpoints disponibles:

GET    /api/tasks                    - Obtener todas
POST   /api/tasks                    - Crear nueva
GET    /api/tasks/:id                - Obtener por ID
PUT    /api/tasks/:id                - Actualizar
DELETE /api/tasks/:id                - Eliminar

POST   /api/tasks/reorder            - Reordenar (Drag & Drop)

GET    /api/tasks/category/:cat      - Filtrar por categoría
GET    /api/tasks/priority/:prio     - Filtrar por prioridad
GET    /api/tasks/upcoming/:days     - Próximas a vencer

GET    /api/stats                    - Estadísticas
GET    /api/health                   - Health check
  `);
  
  // Verificar conexión a BD
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ Error conectando a BD:', err.message);
    } else {
      console.log('✅ Conectado a PostgreSQL exitosamente');
    }
  });
});

// ===== Manejo de shutdown gracioso =====
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando graciosamente...');
  pool.end(() => {
    console.log('Pool de conexiones cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT recibido, cerrando graciosamente...');
  pool.end(() => {
    console.log('Pool de conexiones cerrado');
    process.exit(0);
  });
});

module.exports = app;
