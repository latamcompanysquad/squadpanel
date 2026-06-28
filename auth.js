// Supabase config
const SUPABASE_URL = 'https://vaddaisbjjtzibihjafj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGRhaXNiamp0emliaWhqYWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI2NTc0NjYsImV4cCI6MjAxODIzMzQ2Nn0.3I-P5bHLPHZlLO3Kj8m9pQkRxK0z3K7X0Y1Z2A3B4C5';
const DISCORD_SERVER_ID = '1496619805250420966';
const AUTHORIZED_ROLES = ['1496620600414699550', '1496620972126638230', '1496620892367749243'];

if (typeof window.supabase !== 'undefined') {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function loginWithDiscord() {
  const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: window.location.origin + '/auth/discord/callback',
      // Evita que Supabase redirija automáticamente
      skipBrowserRedirect: true
    }
  });
  if (error) {
    console.error('❌ OAuth error:', error);
    return;
  }
  console.log('✅ URL de autorización:', data.url);
  
  // Muestra la URL en un alert para copiarla manualmente
  alert('Copia esta URL y pégala en otra pestaña:\n\n' + data.url);
  
  // También la dejamos en un elemento HTML para copiar fácil
  const urlDisplay = document.createElement('div');
  urlDisplay.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#111; color:#0f0; padding:15px 25px; border:1px solid #0f0; border-radius:8px; max-width:90%; word-break:break-all; z-index:9999; font-size:12px; cursor:pointer;';
  urlDisplay.textContent = '📋 Haz clic para copiar la URL de autorización';
  urlDisplay.onclick = () => {
    navigator.clipboard?.writeText(data.url).then(() => {
      alert('¡URL copiada al portapapeles! Pégala en otra pestaña.');
    }).catch(() => {
      prompt('Copia manualmente esta URL:', data.url);
    });
  };
  document.body.appendChild(urlDisplay);
}

async function checkAuthAndRoles() {
  console.log("🔍 Verificando autenticación...");
  const { data: { user }, error } = await window.supabaseClient.auth.getUser();
  if (error) {
    console.error("❌ Error al obtener usuario:", error);
    window.location.href = '/login.html';
    return false;
  }
  console.log("👤 Usuario:", user);
  
  if (!user) {
    console.log("⛔ No hay usuario, redirigiendo a login");
    window.location.href = '/login.html';
    return false;
  }

  // Validar roles Discord
  if (user.user_metadata?.provider_id) {
    console.log("🔐 Validando roles para Discord ID:", user.user_metadata.provider_id);
    const hasRole = await validateUserRoles(user.user_metadata.provider_id);
    console.log("✅ ¿Tiene rol autorizado?", hasRole);
    if (!hasRole) {
      await window.supabaseClient.auth.signOut();
      alert('No tienes permisos. Solo staff puede acceder.');
      window.location.href = '/login.html';
      return false;
    }
  } else {
    console.warn("⚠️ Usuario sin provider_id en metadata");
  }
  
  console.log("✅ Autenticación y roles OK");
  return true;
}

async function validateUserRoles(discordUserId) {
  console.log("📡 Llamando a Edge Function validate-roles para ID:", discordUserId);
  try {
    const response = await fetch('https://vaddaisbjjtzibihjafj.supabase.co/functions/v1/validate-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: discordUserId,
        serverId: DISCORD_SERVER_ID,
        authorizedRoles: AUTHORIZED_ROLES
      })
    });
    const result = await response.json();
    console.log("📦 Respuesta de Edge Function:", result);
    return result.authorized;
  } catch (err) {
    console.error("❌ Error en validación de roles:", err);
    return false;
  }
}

async function logout() {
  await window.supabaseClient.auth.signOut();
  window.location.href = '/login.html';
}