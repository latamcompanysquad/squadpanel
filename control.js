// Control Panel Avanzado - Monitoreo y Administración
let controlPanelOpen = false;
let controlData = { users: {}, sessions: [] };
let currentControlTab = 'resumen';

async function loadControlPanelData() {
  try {
    const { data: sessions, error } = await window.supabaseClient
      .from('staff_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error cargando sesiones:', error);
      return;
    }

    controlData.sessions = sessions;
    
    // Agrupar por usuario
    const userMap = {};
    sessions.forEach(session => {
      if (!userMap[session.discord_id]) {
        userMap[session.discord_id] = {
          discordId: session.discord_id,
          username: session.discord_username || 'Unknown',
          avatar: session.discord_avatar,
          userId: session.user_id,
          sessions: []
        };
      }
      userMap[session.discord_id].sessions.push(session);
    });

    controlData.users = userMap;
    renderControlPanel();
  } catch (err) {
    console.error('Error en loadControlPanelData:', err);
  }
}

function renderControlPanel() {
  const panel = document.getElementById('controlPanel');
  if (!panel) return;

  let html = `
    <div style="padding: 12px; border-bottom: 2px solid var(--panel-edge); display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 700; color: var(--green); font-size: 14px;">⚙ CONTROL PANEL</span>
      <button onclick="toggleControlPanel()" style="background: none; border: none; color: var(--text); cursor: pointer; font-size: 18px; font-weight: 600;">✕</button>
    </div>

    <div style="display: flex; gap: 4px; padding: 8px; border-bottom: 1px solid var(--panel-edge); background: rgba(0,0,0,0.2); flex-wrap: wrap;">
      <button onclick="switchControlTab('resumen')" style="padding: 6px 12px; background: ${currentControlTab === 'resumen' ? 'var(--green)' : 'rgba(76,175,80,0.2)'}; color: white; border: none; border-radius: 3px; font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 600; cursor: pointer;">📊 RESUMEN</button>
      <button onclick="switchControlTab('usuarios')" style="padding: 6px 12px; background: ${currentControlTab === 'usuarios' ? 'var(--blue)' : 'rgba(33,150,243,0.2)'}; color: white; border: none; border-radius: 3px; font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 600; cursor: pointer;">👥 USUARIOS</button>
      <button onclick="switchControlTab('actividad')" style="padding: 6px 12px; background: ${currentControlTab === 'actividad' ? 'var(--amber)' : 'rgba(255,193,7,0.2)'}; color: white; border: none; border-radius: 3px; font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 600; cursor: pointer;">📈 ACTIVIDAD</button>
      <button onclick="switchControlTab('alertas')" style="padding: 6px 12px; background: ${currentControlTab === 'alertas' ? '#ff6b6b' : 'rgba(255,107,107,0.2)'}; color: white; border: none; border-radius: 3px; font-family: 'Oswald', sans-serif; font-size: 11px; font-weight: 600; cursor: pointer;">⚠️ ALERTAS</button>
    </div>

    <div style="flex: 1; overflow-y: auto; padding: 12px; font-size: 11px;">
  `;

  if (currentControlTab === 'resumen') {
    html += renderResumen();
  } else if (currentControlTab === 'usuarios') {
    html += renderUsuarios();
  } else if (currentControlTab === 'actividad') {
    html += renderActividad();
  } else if (currentControlTab === 'alertas') {
    html += renderAlertas();
  }

  html += `</div>`;
  panel.innerHTML = html;
}

function renderResumen() {
  const now = new Date();
  const onlineThreshold = 10 * 60 * 1000;
  const totalUsers = Object.keys(controlData.users).length;
  const onlineUsers = Object.values(controlData.users).filter(u => {
    const lastSession = u.sessions[0];
    return lastSession && (now - new Date(lastSession.created_at)) < onlineThreshold;
  }).length;
  const totalAccesses = controlData.sessions.length;
  const today = controlData.sessions.filter(s => {
    const sessionDate = new Date(s.created_at);
    const nowDate = new Date();
    return sessionDate.toDateString() === nowDate.toDateString();
  }).length;

  return `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
      <div style="background: linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(76,175,80,0.05) 100%); border: 2px solid var(--green); border-radius: 6px; padding: 14px;">
        <div style="color: var(--text-dim); font-size: 10px; margin-bottom: 6px; text-transform: uppercase;">🟢 Online Ahora</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--green);">${onlineUsers}</div>
        <div style="color: var(--text-dim); font-size: 9px; margin-top: 4px;">de ${totalUsers} usuarios</div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(33,150,243,0.2) 0%, rgba(33,150,243,0.05) 100%); border: 2px solid var(--blue); border-radius: 6px; padding: 14px;">
        <div style="color: var(--text-dim); font-size: 10px; margin-bottom: 6px; text-transform: uppercase;">👥 Total Usuarios</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--blue);">${totalUsers}</div>
        <div style="color: var(--text-dim); font-size: 9px; margin-top: 4px;">registrados</div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(255,193,7,0.2) 0%, rgba(255,193,7,0.05) 100%); border: 2px solid var(--amber); border-radius: 6px; padding: 14px;">
        <div style="color: var(--text-dim); font-size: 10px; margin-bottom: 6px; text-transform: uppercase;">📊 Total Accesos</div>
        <div style="font-size: 28px; font-weight: 700; color: var(--amber);">${totalAccesses}</div>
        <div style="color: var(--text-dim); font-size: 9px; margin-top: 4px;">en la aplicación</div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(156,39,176,0.2) 0%, rgba(156,39,176,0.05) 100%); border: 2px solid #9c27b0; border-radius: 6px; padding: 14px;">
        <div style="color: var(--text-dim); font-size: 10px; margin-bottom: 6px; text-transform: uppercase;">📅 Hoy</div>
        <div style="font-size: 28px; font-weight: 700; color: #9c27b0;">${today}</div>
        <div style="color: var(--text-dim); font-size: 9px; margin-top: 4px;">accesos</div>
      </div>
    </div>

    <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
      <div style="color: var(--green); font-weight: 600; margin-bottom: 8px; font-size: 12px;">📝 ÚLTIMOS ACCESOS</div>
      <div style="max-height: 200px; overflow-y: auto;">
        ${controlData.sessions.slice(0, 10).map(s => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 10px;">
            <span style="color: var(--text);">✅ ${s.discord_username || s.discord_id}</span>
            <span style="color: var(--text-dim);">${formatDate(new Date(s.created_at))}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderUsuarios() {
  const now = new Date();
  const onlineThreshold = 10 * 60 * 1000;
  const sorted = Object.values(controlData.users).sort((a, b) => 
    new Date(b.sessions[0].created_at) - new Date(a.sessions[0].created_at)
  );

  return `
    <input type="text" id="searchUsers" placeholder="🔍 Buscar usuario..." 
      style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--panel-edge); border-radius: 4px; color: var(--text); font-family: 'Oswald', sans-serif; font-size: 11px; margin-bottom: 12px;" 
      oninput="filterUsers(this.value)">

    <div id="usuariosContainer" style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
      ${sorted.map(user => {
        const lastSession = user.sessions[0];
        const isOnline = (now - new Date(lastSession.created_at)) < onlineThreshold;
        const status = isOnline ? '🟢' : '🔴';
        return `
          <div style="background: rgba(11,15,12,0.6); border: 1px solid var(--panel-edge); border-radius: 6px; padding: 10px; cursor: pointer;" onclick="toggleUserDetail('${user.discordId}')">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 14px;">${status}</span>
                <div style="flex: 1;">
                  <div style="color: var(--text); font-weight: 600;">${user.username}</div>
                  <div style="color: var(--text-dim); font-size: 9px;">${user.discordId}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="color: var(--text-dim); font-size: 10px;">${user.sessions.length} accesos</div>
                <div style="color: var(--text-dim); font-size: 9px;">${formatTime(now - new Date(lastSession.created_at))} ago</div>
              </div>
            </div>
            <div id="detail_${user.discordId}" style="display: none; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 9px; color: var(--text-dim);">
              <div>📱 ${lastSession.user_agent ? lastSession.user_agent.substring(0, 50) + '...' : 'N/A'}</div>
              <div>📅 Último: ${formatDate(new Date(lastSession.created_at))}</div>
              <div>🔐 Autorizado: ${lastSession.authorized ? '✅ Sí' : '❌ No'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderActividad() {
  const grouped = {};
  controlData.sessions.forEach(s => {
    const date = new Date(s.created_at).toLocaleDateString('es-ES');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  });

  return `
    <div style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">
      ${Object.entries(grouped).slice(0, 7).map(([date, sessions]) => `
        <div style="background: rgba(0,0,0,0.3); border-left: 3px solid var(--green); border-radius: 4px; padding: 10px;">
          <div style="color: var(--green); font-weight: 600; margin-bottom: 6px; font-size: 12px;">📅 ${date}</div>
          ${sessions.slice(0, 5).map(s => `
            <div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 9px;">
              <span style="color: var(--amber);">⏰ ${formatDate(new Date(s.created_at))}</span> - 
              <span style="color: var(--text);">${s.discord_username || s.discord_id}</span>
              <span style="color: var(--text-dim);"> (${s.authorized ? '✅' : '❌'})</span>
            </div>
          `).join('')}
          ${sessions.length > 5 ? `<div style="color: var(--text-dim); font-size: 9px; margin-top: 4px;">... +${sessions.length - 5} más</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderAlertas() {
  const alerts = [];
  const now = new Date();
  
  // Detectar múltiples logins en corto tiempo
  const userLoginCounts = {};
  controlData.sessions.slice(0, 100).forEach(s => {
    const hour = new Date(s.created_at).toISOString().split('T')[0];
    const key = `${s.discord_id}_${hour}`;
    userLoginCounts[key] = (userLoginCounts[key] || 0) + 1;
  });

  Object.entries(userLoginCounts).forEach(([key, count]) => {
    if (count > 5) {
      const [userId] = key.split('_');
      const user = Object.values(controlData.users).find(u => u.discordId === userId);
      alerts.push({
        type: 'MÚLTIPLES LOGINS',
        severity: 'medium',
        message: `${user?.username || userId} ha accedido ${count} veces hoy`,
        time: new Date()
      });
    }
  });

  // Logins fallidos (no autorizados)
  controlData.sessions.slice(0, 50).forEach(s => {
    if (!s.authorized) {
      alerts.push({
        type: 'LOGIN FALLIDO',
        severity: 'high',
        message: `${s.discord_username || s.discord_id} intentó acceder sin permisos`,
        time: new Date(s.created_at)
      });
    }
  });

  return `
    <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
      ${alerts.length === 0 ? `
        <div style="text-align: center; color: var(--green); padding: 20px; font-weight: 600;">✅ Sin alertas</div>
      ` : alerts.slice(0, 20).map(alert => `
        <div style="background: ${alert.severity === 'high' ? 'rgba(255,107,107,0.15)' : 'rgba(255,193,7,0.15)'}; border-left: 3px solid ${alert.severity === 'high' ? '#ff6b6b' : 'var(--amber)'}; border-radius: 4px; padding: 10px; font-size: 10px;">
          <div style="color: ${alert.severity === 'high' ? '#ff6b6b' : 'var(--amber)'}; font-weight: 600; margin-bottom: 4px;">⚠️ ${alert.type}</div>
          <div style="color: var(--text-dim);">${alert.message}</div>
          <div style="color: var(--text-dim); font-size: 9px; margin-top: 4px;">${formatDate(alert.time)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function switchControlTab(tab) {
  currentControlTab = tab;
  renderControlPanel();
}

function toggleUserDetail(discordId) {
  const detail = document.getElementById(`detail_${discordId}`);
  if (detail) {
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
  }
}

function filterUsers(query) {
  const container = document.getElementById('usuariosContainer');
  if (!container) return;
  
  const users = container.querySelectorAll('[onclick*="toggleUserDetail"]');
  users.forEach(user => {
    const text = user.textContent.toLowerCase();
    user.style.display = text.includes(query.toLowerCase()) ? 'block' : 'none';
  });
}

function toggleControlPanel() {
  const wrapper = document.getElementById('controlWrapper');
  if (!wrapper) return;

  controlPanelOpen = !controlPanelOpen;
  wrapper.style.display = controlPanelOpen ? 'flex' : 'none';
  
  if (controlPanelOpen) {
    loadControlPanelData();
    if (!window.controlPanelInterval) {
      window.controlPanelInterval = setInterval(loadControlPanelData, 8000);
    }
  } else {
    if (window.controlPanelInterval) {
      clearInterval(window.controlPanelInterval);
      window.controlPanelInterval = null;
    }
  }
}

function formatDate(date) {
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}