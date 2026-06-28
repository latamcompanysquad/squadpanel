// Panel de Control - Monitoreo y Administración
let controlPanelOpen = false;

async function loadControlPanel() {
  try {
    const { data: sessions, error } = await window.supabaseClient
      .from('staff_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error cargando sesiones:', error);
      return;
    }

    // Agrupar por usuario
    const userMap = {};
    sessions.forEach(session => {
      if (!userMap[session.discord_id]) {
        userMap[session.discord_id] = [];
      }
      userMap[session.discord_id].push(session);
    });

    renderControlPanel(userMap, sessions);
  } catch (err) {
    console.error('Error en loadControlPanel:', err);
  }
}

function renderControlPanel(userMap, allSessions) {
  const panel = document.getElementById('controlPanel');
  if (!panel) return;

  const now = new Date();
  const onlineThreshold = 5 * 60 * 1000; // 5 minutos

  let html = `
    <div style="padding: 12px; border-bottom: 1px solid var(--panel-edge); display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; color: var(--text);">CONTROL PANEL</span>
      <button onclick="toggleControlPanel()" style="background: none; border: none; color: var(--text); cursor: pointer; font-size: 16px;">✕</button>
    </div>
    <div style="flex: 1; overflow-y: auto; padding: 8px;">
  `;

  // Estadísticas
  const totalUsers = Object.keys(userMap).length;
  const onlineUsers = Object.values(userMap).filter(sessions => {
    const lastAccess = new Date(sessions[0].created_at);
    return (now - lastAccess) < onlineThreshold;
  }).length;

  html += `
    <div style="background: rgba(76,175,80,0.1); border: 1px solid var(--green); border-radius: 4px; padding: 8px; margin-bottom: 12px; font-size: 11px;">
      <div style="color: var(--green); font-weight: 600;">📊 ESTADÍSTICAS</div>
      <div style="margin-top: 4px; color: var(--text-dim);">
        <div>🟢 Online: ${onlineUsers}/${totalUsers}</div>
        <div>📝 Total sesiones: ${allSessions.length}</div>
      </div>
    </div>
  `;

  // Usuarios y sus accesos
  Object.entries(userMap).forEach(([discordId, sessions]) => {
    const lastAccess = new Date(sessions[0].created_at);
    const isOnline = (now - lastAccess) < onlineThreshold;
    const status = isOnline ? '🟢' : '🔴';
    const timeSince = formatTime(now - lastAccess);

    html += `
      <div style="background: rgba(11,15,12,0.6); border: 1px solid var(--panel-edge); border-radius: 4px; padding: 8px; margin-bottom: 8px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="color: var(--text); font-weight: 600;">${status} ${discordId}</span>
          <span style="color: var(--text-dim);">${timeSince}</span>
        </div>
        <div style="color: var(--text-dim); margin-bottom: 4px;">
          <div>📥 Último acceso: ${formatDate(lastAccess)}</div>
          <div>📊 Total accesos: ${sessions.length}</div>
        </div>
        <div style="background: rgba(0,0,0,0.3); border-radius: 3px; padding: 4px; max-height: 80px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-dim);">
    `;

    sessions.slice(0, 5).forEach(session => {
      const accessTime = new Date(session.created_at);
      const authorized = session.authorized ? '✅' : '❌';
      html += `<div>${authorized} ${formatDate(accessTime)}</div>`;
    });

    if (sessions.length > 5) {
      html += `<div style="color: var(--amber);">... +${sessions.length - 5} más</div>`;
    }

    html += `</div></div>`;
  });

  html += `</div>`;
  panel.innerHTML = html;
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

function toggleControlPanel() {
  const wrapper = document.getElementById('controlWrapper');
  if (!wrapper) return;

  controlPanelOpen = !controlPanelOpen;
  wrapper.style.display = controlPanelOpen ? 'flex' : 'none';
  
  if (controlPanelOpen) {
    loadControlPanel();
    // Actualizar cada 10 segundos
    if (!window.controlPanelInterval) {
      window.controlPanelInterval = setInterval(loadControlPanel, 10000);
    }
  } else {
    if (window.controlPanelInterval) {
      clearInterval(window.controlPanelInterval);
      window.controlPanelInterval = null;
    }
  }
}
