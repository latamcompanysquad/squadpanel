// Supabase config
const SUPABASE_URL = 'https://vaddaisbjjtzibihjafj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZGRhaXNiamp0emliaWhqYWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDI2NTc0NjYsImV4cCI6MjAxODIzMzQ2Nn0.3I-P5bHLPHZlLO3Kj8m9pQkRxK0z3K7X0Y1Z2A3B4C5';
const DISCORD_SERVER_ID = '1496619805250420966';
const AUTHORIZED_ROLES = ['1496620600414699550', '1496620972126638230', '1496620892367749243'];

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loginWithDiscord() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: window.location.origin + '/auth/discord/callback'
    }
  });
  if (error) console.error('OAuth error:', error);
}

async function checkAuthAndRoles() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = '/login.html';
    return false;
  }

  // Validar roles Discord
  if (user.user_metadata?.provider_id) {
    const hasRole = await validateUserRoles(user.user_metadata.provider_id);
    if (!hasRole) {
      await supabase.auth.signOut();
      alert('No tienes permisos. Solo staff puede acceder.');
      window.location.href = '/login.html';
      return false;
    }
  }
  
  return true;
}

async function validateUserRoles(discordUserId) {
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
    return result.authorized;
  } catch (err) {
    console.error('Role validation error:', err);
    return false;
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}
