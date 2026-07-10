/**
 * Huella Iberá — Worker API
 * ------------------------------------------------------------------
 * Guarda todos los datos del sitio (paquetes, actividades, temporada,
 * findes largos, credenciales del panel y el historial de paquetes a
 * medida) en Cloudflare KV, y los sirve por una API REST simple.
 *
 * RUTAS PÚBLICAS (sin auth):
 *   GET  /data                 → { packages, activities, season, findesLargos, _v }
 *
 * RUTAS DE ADMIN:
 *   POST /login                → { username, password } → { ok, token }
 *   PUT  /data                 → guarda el bloque completo (requiere token + _v)
 *   PUT  /creds                → cambia usuario/contraseña (requiere token)
 *   GET  /custom-pkgs          → historial de paquetes a medida (requiere token)
 *   PUT  /custom-pkgs          → guarda el historial completo (requiere token)
 *
 * Todas las rutas de admin requieren el header:
 *   Authorization: Bearer <token>
 * El token es el mismo API_TOKEN configurado como secret de Wrangler;
 * /login lo devuelve si el usuario/contraseña coinciden con lo guardado
 * en KV (por defecto admin / admin123, cambiable desde el panel).
 * ------------------------------------------------------------------
 */

const DEFAULT_CREDS = { username: "admin", password: "admin123" };

const DEFAULT_DATA = {
  packages: [],
  activities: [],
  findesLargos: [],
  season: "primavera",
  hero: {},
  gallery: [],
  _v: 0
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...corsHeaders(origin)
    }
  });
}

function isAuthed(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!token && token === env.API_TOKEN;
}

async function getJSON(env, key, fallback) {
  const raw = await env.HUELLA_KV.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

async function putJSON(env, key, value) {
  await env.HUELLA_KV.put(key, JSON.stringify(value));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      // ---------------------------------------------------------------
      // GET /data — público
      // ---------------------------------------------------------------
      if (path === "/data" && request.method === "GET") {
        const data = await getJSON(env, "data", DEFAULT_DATA);
        return json(data, 200, origin);
      }

      // ---------------------------------------------------------------
      // POST /login
      // ---------------------------------------------------------------
      if (path === "/login" && request.method === "POST") {
        const body = await request.json().catch(() => ({}));
        const creds = await getJSON(env, "creds", DEFAULT_CREDS);
        if (body.username === creds.username && body.password === creds.password) {
          return json({ ok: true, token: env.API_TOKEN }, 200, origin);
        }
        return json({ ok: false, error: "Usuario o contraseña incorrectos" }, 401, origin);
      }

      // ---------------------------------------------------------------
      // A partir de acá, todo requiere Authorization: Bearer <token>
      // ---------------------------------------------------------------
      if (!isAuthed(request, env)) {
        return json({ ok: false, error: "No autorizado" }, 401, origin);
      }

      // PUT /data — guarda paquetes/actividades/temporada/findes largos
      if (path === "/data" && request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body) return json({ ok: false, error: "Body inválido" }, 400, origin);

        const current = await getJSON(env, "data", DEFAULT_DATA);
        if (typeof body._v === "number" && body._v !== current._v) {
          return json(
            { ok: false, error: "conflict", message: "Los datos cambiaron en otro dispositivo. Recargá antes de guardar.", current: current },
            409,
            origin
          );
        }
        const next = {
          packages: body.packages || current.packages,
          activities: body.activities || current.activities,
          findesLargos: body.findesLargos || current.findesLargos,
          season: body.season || current.season,
          hero: body.hero || current.hero,
          gallery: body.gallery || current.gallery,
          _v: (current._v || 0) + 1
        };
        await putJSON(env, "data", next);
        return json({ ok: true, data: next }, 200, origin);
      }

      // PUT /creds — cambia usuario/contraseña
      if (path === "/creds" && request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!body || !body.username || !body.password) {
          return json({ ok: false, error: "Faltan datos" }, 400, origin);
        }
        await putJSON(env, "creds", { username: body.username, password: body.password });
        return json({ ok: true }, 200, origin);
      }

      // GET /custom-pkgs — historial
      if (path === "/custom-pkgs" && request.method === "GET") {
        const history = await getJSON(env, "custom_pkgs", []);
        return json(history, 200, origin);
      }

      // PUT /custom-pkgs — guarda historial completo
      if (path === "/custom-pkgs" && request.method === "PUT") {
        const body = await request.json().catch(() => null);
        if (!Array.isArray(body)) return json({ ok: false, error: "Body inválido" }, 400, origin);
        await putJSON(env, "custom_pkgs", body);
        return json({ ok: true }, 200, origin);
      }

      return json({ ok: false, error: "Ruta no encontrada" }, 404, origin);
    } catch (err) {
      return json({ ok: false, error: "Error del servidor", detail: String(err) }, 500, origin);
    }
  }
};
