let controlData = { users: {}, sessions: [], rconLogs: [] };
let currentTab = 'resumen';

async function loadData() {
  try {
    const { data: sessions } = await window.supabaseClient.from('staff_sessions').select('*').order('created_at', { ascending: false }).limit(500);
    const { data: rconLogs } = await window.supabaseClient.from('rcon_logs').select('*').order('created_at', { ascending: false }).limit(500).catch(() => ({ data: [] }));
    
    controlData.sessions = sessions || [];
    controlData.rconLogs = rconLogs || [];
    
    const userMap = {};
    sessions?.forEach(s => {
      if (!userMap[s.discord_id]) {
        userMap[s.discord_id] = { discordId: s.discord_id, username: s.discord_username || 'Unknown', avatar: s.discord_avatar, ip: s.ip_address, userAgent: s.user_agent, sessions: [] };
      }
      userMap[s.discord_id].sessions.push(s);
    });
    
    controlData.users = userMap;
    renderTab(currentTab);
  } catch (err) {
    console.error('Error cargando datos:', err);
  }
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
  document.getElementById(tab)?.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  renderTab(tab);
}

function renderTab(tab) {
  if (tab === 'resumen') renderResumen();
  else if (tab === 'usuarios') renderUsuarios();
  else if (tab === 'actividad') renderActividad();
  else if (tab === 'rcon') renderRconLog();
  else if (tab === 'alertas') renderAlertas();
}

function renderResumen() {
  const stats = document.getElementById('statsGrid');
  const now = new Date();
  const threshold = 10 * 60 * 1000;
  const onlineCount = Object.values(controlData.users).filter(u => u.sessions[0] && (now - new Date(u.sessions[0].created_at)) < threshold).length;
  
  stats.innerHTML = `
    <div class="stat-card"><div class="stat-label">🟢 Online</div><div class="stat-value">${onlineCount}</div></div>
    <div class="stat-card"><div class="stat-label">👥 Usuarios</div><div class="stat-value">${Object.keys(controlData.users).length}</div></div>
    <div class="stat-card"><div class="stat-label">📊 Accesos</div><div class="stat-value">${controlData.sessions.length}</div></div>
    <div class="stat-card"><div class="stat-label">🔴 RCON</div><div class="stat-value">${controlData.rconLogs.length}</div></div>
  `;
  
  const recent = document.querySelector('#recentTable tbody');
  recent.innerHTML = controlData.sessions.slice(0, 15).map(s => `<tr><td><strong>${s.discord_username || s.discord_id}</strong></td><td>${new Date(s.created_at).toLocaleTimeString('es-ES')}</td><td class="ip-cell">${s.ip_address || 'N/A'}</td><td style="font-size: 9px; color: #888;">${(s.user_agent || '').substring(0, 35)}...</td></tr>`).join('') || '<tr><td colspan="4" style="text-align: center; color: #666;">Sin datos</td></tr>';
}

function renderUsuarios() {
  const table = document.querySelector('#usersTable tbody');
  const now = new Date();
  const sorted = Object.values(controlData.users).sort((a, b) => new Date(b.sessions[0]?.created_at) - new Date(a.sessions[0]?.created_at));
  
  table.innerHTML = sorted.map(u => {
    const last = u.sessions[0];
    const isOnline = last && (now - new Date(last.created_at)) < 600000;
    return `<tr><td><strong>${u.username}</strong></td><td style="font-size: 10px; color: #888;">${u.discordId}</td><td class="ip-cell">${u.ip || 'N/A'}</td><td style="font-size: 9px; color: #888;">${(u.userAgent || '').substring(0, 30)}...</td><td style="font-size: 10px;">${last ? new Date(last.created_at).toLocaleTimeString('es-ES') : 'N/A'}</td><td><strong>${u.sessions.length}</strong></td><td><span class="badge ${isOnline ? 'badge-online' : 'badge-offline'}">${isOnline ? '🟢' : '🔴'}</span></td></tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align: center; color: #666;">Sin usuarios</td></tr>';
}

function renderActividad() {
  const log = document.getElementById('activityLog');
  const grouped = {};
  
  controlData.sessions.forEach(s => {
    const date = new Date(s.created_at).toLocaleDateString('es-ES');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(s);
  });
  
  if (Object.keys(grouped).length === 0) {
    log.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No hay actividad</div>';
    return;
  }
  
  log.innerHTML = Object.entries(grouped).slice(0, 10).map(([date, logs]) => `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #4caf50; margin-bottom: 10px; font-size: 12px;">📅 ${date}</h3>
      ${logs.slice(0, 20).map(l => `<div class="log-item"><span style="color: #ff9800; font-weight: 600;">${new Date(l.created_at).toLocaleTimeString('es-ES')}</span> - <span style="color: #4caf50;">${l.discord_username || l.discord_id}</span> <span style="color: #666;">desde</span> <span class="ip-cell">${l.ip_address || 'N/A'}</span></div>`).join('')}
    </div>
  `).join('');
}

function renderRconLog() {
  const table = document.querySelector('#rconTable tbody');
  
  if (!controlData.rconLogs || controlData.rconLogs.length === 0) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666; padding: 20px;">No hay registros RCON</td></tr>';
    return;
  }
  
  table.innerHTML = controlData.rconLogs.slice(0, 100).map(log => `
    <tr>
      <td style="font-size: 10px;">${new Date(log.created_at).toLocaleTimeString('es-ES')}</td>
      <td><strong>${log.user_discord_name || 'Unknown'}</strong></td>
      <td style="color: #ff9800; font-family: monospace; font-size: 10px;">${log.command}</td>
      <td><span class="badge" style="background: ${log.success ? '#2196f3' : '#f44336'}; color: white;">${log.success ? '✅' : '❌'}</span></td>
      <td class="ip-cell">${log.ip_address || 'N/A'}</td>
    </tr>
  `).join('');
}

function renderAlertas() {
  const alerts = document.getElementById('alertsContainer');
  const alertList = [];
  
  const counts = {};
  controlData.sessions.slice(0, 100).forEach(s => {
    const hour = new Date(s.created_at).toISOString().split('T')[0];
    const key = `${s.discord_id}_${hour}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  
  Object.entries(counts).forEach(([key, count]) => {
    if (count > 5) {
      const [userId] = key.split('_');
      const user = Object.values(controlData.users).find(u => u.discordId === userId);
      alertList.push({ type: 'MÚLTIPLES LOGINS', msg: `${user?.username || userId} → ${count} accesos hoy` });
    }
  });
  
  alerts.innerHTML = alertList.length ? alertList.map(a => `<div class="log-item log-rcon"><span style="color: #f44336; font-weight: 600;">⚠️ ${a.type}</span><br><span>${a.msg}</span></div>`).join('') : '<div style="text-align: center; padding: 60px 20px; color: #4caf50;">✅ Sistema sin alertas</div>';
}

function filterTable(tab) {
  const searchId = tab === 'usuarios' ? 'searchUsers' : 'searchRcon';
  const query = document.getElementById(searchId).value.toLowerCase();
  const tableId = tab === 'usuarios' ? 'usersTable' : 'rconTable';
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
  });
}

// Función global para registrar comandos RCON
window.logRconCommand = async function(command, success, response, ipAddr, discordId, discordName) {
  try {
    const result = await window.supabaseClient.from('rcon_logs').insert({
      user_discord_id: discordId,
      user_discord_name: discordName,
      ip_address: ipAddr,
      command: command,
      success: success,
      response: response || null
    });
    console.log('✅ RCON logging:', command);
    loadData();
    return result;
  } catch (err) {
    console.error('❌ Error RCON:', err);
  }
};

// Auto-load
checkAuthAndRoles().then(() => {
  loadData();
  setInterval(loadData, 20000);
});
