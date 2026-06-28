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
  const onlineThreshold = 10 * 60 * 1000; // 10 minutos

  let html = `
    <div style="padding: 12px; border-bottom: 1px solid var(--panel-edge); display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; color: var(--text);">⚙ CONTROL PANEL</span>
      <button onclick="toggleControlPanel()" style="background: none; border: none; color: var(--text); cursor: pointer; font-size: 16px;">✕</button>
    </div>
    <div style="flex: 1; overflow-y: auto; padding: 8px;">
  `;

  // Estadísticas principales
  const totalUsers = Object.keys(userMap).length;
  const onlineUsers = Object.values(userMap).filter(sessions => {
    const lastAccess = new Date(sessions[0].created_at);
    return (now - lastAccess) < onlineThreshold;
  }).length;
  const totalAccesses = allSessions.length;

  html += `
    <div style="background: rgba(76,175,80,0.15); border: 2px solid var(--green); border-radius: 6px; padding: 12px; margin-bottom: 12px; font-size: 12px;">
      <div style="color: var(--green); font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">📊 ESTADÍSTICAS</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: var(--text);">
        <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: var(--text-dim);">ONLINE AHORA</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--green);">${onlineUsers}</div>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
          <div style="font-size: 10px; color: var(--text-dim);">TOTAL USUARIOS</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--blue);">${totalUsers}</div>
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; grid-column: 1/-1;">
          <div style="font-size: 10px; color: var(--text-dim);">TOTAL ACCESOS</div>
          <div style="font-size: 18px; font-weight: 700; color: var(--amber);">${totalAccesses}</div>
        </div>
      </div>
    </div>

    <div style="font-weight: 600; color: var(--green); font-size: 11px; margin-bottom: 8px; text-transform: uppercase;">👥 DETALLES POR USUARIO</div>
  `;

  // Usuarios y sus accesos
  if (totalUsers === 0) {
    html += `<div style="color: var(--text-dim); font-size: 11px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 4px; text-align: center;">Sin registros de acceso</div>`;
  } else {
    Object.entries(userMap).sort((a, b) => 
      new Date(b[1][0].created_at) - new Date(a[1][0].created_at)
    ).forEach(([discordId, sessions]) => {
      const lastAccess = new Date(sessions[0].created_at);
      const isOnline = (now - lastAccess) < onlineThreshold;
      const status = isOnline ? '🟢' : '🔴';
      const timeSince = formatTime(now - lastAccess);

      html += `
        <div style="background: rgba(11,15,12,0.6); border: 1px solid var(--panel-edge); border-radius: 4px; padding: 10px; margin-bottom: 10px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="color: var(--text); font-weight: 600;">${status} ${discordId}</span>
            <span style="background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 3px; font-size: 10px; color: var(--text-dim);">${timeSince} ago</span>
          </div>
          <div style="color: var(--text-dim); font-size: 10px; margin-bottom: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>📥 ${formatDate(lastAccess)}</div>
            <div>📊 ${sessions.length} acceso${sessions.length !== 1 ? 's' : ''}</div>
          </div>
          <div style="background: rgba(0,0,0,0.4); border-radius: 3px; padding: 6px; max-height: 90px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 9px; color: var(--text-dim); border-left: 2px solid var(--green);">
      `;

      sessions.slice(0, 8).forEach((session, idx) => {
        const accessTime = new Date(session.created_at);
        const authorized = session.authorized ? '✅' : '❌';
        html += `<div style="padding: 2px 0;">${authorized} ${formatDate(accessTime)}</div>`;
      });

      if (sessions.length > 8) {
        html += `<div style="color: var(--amber); font-weight: 600; padding-top: 4px;">⋯ +${sessions.length - 8} más</div>`;
      }

      html += `</div></div>`;
    });
  }

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
