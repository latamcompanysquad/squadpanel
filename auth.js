// Supabase config
// Supabase config
const SUPABASE_URL = 'https://vaddajsbjijtzibjhafj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGRhanNiamlqdHppYmpoYWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTYxMzEsImV4cCI6MjA5Nzk3MjEzMX0.Wf6bqF-HuCA3DGu_YGhN-NzbDRTBKIt_YTkyvTRb-Eg';
const DISCORD_SERVER_ID = '1496619805250420966';
const AUTHORIZED_ROLES = ['1496620600414699550', '1496620972126638230', '1496620892367749243'];

if (typeof window.supabase !== 'undefined') {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function loginWithDiscord() {
  const { data, error } = await window.supabaseClient.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: window.location.origin + '/index.html',
      skipBrowserRedirect: false
    }
  });
  if (error) {
    console.error('❌ OAuth error:', error);
    return;
  }
  console.log('✅ URL de autorización:', data.url);
  
  // Redirige automáticamente a la URL de OAuth
  window.location.href = data.url;
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
  
  // Registrar acceso en staff_sessions
  if (user.user_metadata?.provider_id) {
    try {
      await window.supabaseClient.from('staff_sessions').insert({
        user_id: user.id,
        discord_id: user.user_metadata.provider_id,
        authorized: true
      });
      console.log("✅ Acceso registrado en staff_sessions");
    } catch (err) {
      console.error("⚠️ Error registrando acceso:", err);
    }
  }
  
  console.log("✅ Autenticación y roles OK");
  return true;
}

async function validateUserRoles(discordUserId) {
  console.log("📡 Llamando a Edge Function validate-roles para ID:", discordUserId);
  try {
    const response = await fetch(SUPABASE_URL + '/functions/v1/validate-roles', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
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
  try {
    await window.supabaseClient.auth.signOut();
    console.log("✅ Sesión cerrada");
    window.location.href = '/login.html';
  } catch (err) {
    console.error("Error cerrando sesión:", err);
    window.location.href = '/login.html';
  }
}