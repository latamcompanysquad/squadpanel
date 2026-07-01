# Instrucciones de trabajo — SquadPanel (LATAM COMPANY)

## Rol y contexto
Asistente de desarrollo para **SquadPanel**, mapa táctico en tiempo real para servidores de Squad.
- Repo: `https://github.com/latamcompanysquad/squadpanel`
- Hosting: Cloudflare Pages (`squadpanel.pages.dev`) — auto-deploy vía push a GitHub
- Backend: Cloudflare Worker (`squadpanel-worker.latamcompanysquad.workers.dev`) + Supabase (`vaddajsbjijtzibjhafj.supabase.co`)
- Plugin: `Squadpanelbroadcast.js`, corre en Docker (Pterodactyl), despliegue manual (copiar/pegar en el dashboard)
- SquadJS (`Team-Silver-Sphere/SquadJS`) se usa **solo como referencia** para eventos/parsers/RCON — nunca se generan patches para ese repo.
- Idioma de trabajo: español.

## Flujo de trabajo obligatorio (confirmado y probado)

1. **Clonar el repo fresco ANTES DE CADA PATCH, sin excepción — incluso el segundo patch de la misma conversación:**
   ```
   rm -rf /home/claude/squadpanel && git clone https://github.com/latamcompanysquad/squadpanel.git /home/claude/squadpanel
   ```
   ⚠️ **REGLA CRÍTICA (causa de fallo real ya ocurrido):** nunca reusar un clon/directorio de trabajo de un patch anterior, aunque sea dentro de la misma sesión. `git diff` se calcula contra el HEAD del clon. Si se edita el mismo clon dos veces sin re-clonar, el segundo patch queda acumulado (incluye también los cambios del primer patch) y falla al aplicar sobre un repo que ya tiene el primer patch commiteado (`patch does not apply`). Cada patch debe generarse sobre un clon 100% fresco, para que sea puramente incremental sobre el último commit confirmado.
2. Editar archivos usando herramientas de edición reales (`str_replace` / `create_file`) — **nunca escribir el diff a mano**.
3. Generar el patch real desde git:
   - Archivos modificados: `git diff [archivos] > /mnt/user-data/outputs/[nombre].patch`
   - Archivos nuevos: `git add [archivo]` y luego `git diff --cached > ...patch`
4. Entregar el patch como **archivo descargable** (no como bloque de texto para copiar a mano).
5. El usuario descarga el `.patch` en la raíz del repo local y ejecuta:
   ```
   git apply [nombre].patch && git add [archivo] && git commit -m "mensaje" && git push
   ```
6. Cloudflare Pages auto-despliega desde GitHub. Test directo en `squadpanel.pages.dev`.
7. Confirmación de aplicación: el usuario comparte `git log --oneline`. Ese output es la base autoritativa para el siguiente patch (nunca asumir estado).

## Reglas explícitas que SÍ aplican
- Patches con formato `--- a/archivo` / `+++ b/archivo`, rutas relativas.
- Nombre de patch claro y único por tarea (ej: `fix-fob-circles.patch`, `add-player-died-event.patch`).
- Comandos git en formato estándar (`git apply`, `git add`, `git commit`, `git push`) + comandos de copia a Docker cuando aplique (solo para `Squadpanelbroadcast.js`).
- Sin emojis en contenido de patches (rompe encoding en Windows).
- Diagnóstico corto antes del patch está bien, pero sin límite artificial de caracteres.

## Reglas explícitas que NO aplican (descartadas por conflicto)
- ❌ Límite de 800 caracteres por respuesta.
- ❌ Escribir el diff manualmente en el cuerpo de la respuesta como única fuente (siempre se genera con `git diff` real y se entrega como archivo descargable vía la herramienta de archivos).
- ❌ Sección fija de "📦 Despliegue manual al Docker" en cada respuesta (solo aplica cuando el cambio es en `Squadpanelbroadcast.js`).
- ❌ Preguntar "¿ok para continuar?" cada 5 horas o forzar división artificial de tareas.
- ❌ Ofrecer alternativas para alargar la conversación innecesariamente.

## Aprendizajes clave del proyecto
- Los datos de replay en Supabase usan nombres de blueprint de Unreal Engine; los datos en vivo de SquadJS ya vienen con nombres legibles. Cualquier feature de replay debe contemplar esta capa de traducción.
- RLS de Supabase requiere políticas de INSERT **y** SELECT — falta una de las dos causa fallos silenciosos (ceros o errores 400).
- GitHub Push Protection bloquea claves tipo `eyJhbGc...` aunque sean de ejemplo — usar siempre la clave "Publishable" en el frontend.
- Los patches escritos a mano generan errores de `patch fragment without header`, problemas de encoding y desajustes de contexto — siempre generar con `git diff` sobre un clon fresco.
