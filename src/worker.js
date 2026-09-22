// Worker de movete.info.
// Todo el sitio son archivos estáticos (los sirve Cloudflare sin pasar por acá).
// Este código solo atiende lo que no es un archivo:
//   POST /api/sumar           -> guarda un evento cargado desde /sumar/
//   GET  /api/comunidad.csv   -> lista los eventos futuros; la lee movete-scraper
// Los eventos se guardan en la base D1 "movete-comunidad" (binding DB).

const CATEGORIAS = new Set([
  "teatro", "musica", "stand-up", "danza", "infantil",
  "humor", "impro", "taller", "a-plasticas", "otros",
]);
const LOCALIDADES = new Set([
  "La Plata", "City Bell", "Gonnet", "Villa Elisa", "Tolosa", "Ringuelet",
  "Los Hornos", "Berisso", "Ensenada",
]);
const MAX_POR_DIA = 8;        // cargas por persona (IP) cada 24 h
const DIAS_ADELANTE = 180;    // no se aceptan fechas más lejanas

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/sumar") {
      if (request.method !== "POST") return new Response("Método no permitido", { status: 405 });
      return sumar(request, env);
    }
    if (url.pathname === "/api/comunidad.csv") return listarCsv(env);
    return env.ASSETS.fetch(request);
  },
};

function limpiar(v, max) {
  return String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function volver(request, error) {
  const destino = new URL(error ? `/sumar/?error=${encodeURIComponent(error)}` : "/sumar/gracias/", request.url);
  return Response.redirect(destino.toString(), 303);
}

async function hashIp(ip) {
  const data = new TextEncoder().encode("movete|" + ip);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hoyAR() {
  // Fecha de hoy en Argentina (UTC-3), como YYYY-MM-DD.
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

async function sumar(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return volver(request, "formulario");
  }

  // Campo trampa: las personas no lo ven; si viene lleno es un bot. Se le
  // responde "gracias" para que no insista, pero no se guarda nada.
  if (limpiar(form.get("no_completar"), 50)) return volver(request);

  const ev = {
    titulo: limpiar(form.get("titulo"), 120),
    fecha: limpiar(form.get("fecha"), 10),
    hora: limpiar(form.get("hora"), 5),
    lugar: limpiar(form.get("lugar"), 80),
    direccion: limpiar(form.get("direccion"), 100),
    localidad: limpiar(form.get("localidad"), 30),
    categoria: limpiar(form.get("categoria"), 20),
    url: limpiar(form.get("url"), 300),
    contacto: limpiar(form.get("contacto"), 100),
  };

  if (ev.titulo.length < 3 || !ev.lugar) return volver(request, "faltan");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.fecha)) return volver(request, "fecha");
  const hoy = hoyAR();
  const tope = new Date(Date.now() + DIAS_ADELANTE * 86400 * 1000).toISOString().slice(0, 10);
  if (ev.fecha < hoy || ev.fecha > tope) return volver(request, "fecha");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(ev.hora)) return volver(request, "hora");
  if (!LOCALIDADES.has(ev.localidad)) ev.localidad = "La Plata";
  if (!CATEGORIAS.has(ev.categoria)) ev.categoria = "";
  if (ev.url) {
    if (!/^https?:\/\//i.test(ev.url)) ev.url = "https://" + ev.url;
    try { new URL(ev.url); } catch { return volver(request, "link"); }
  }
  if (/https?:\/\/|www\./i.test(ev.titulo + " " + ev.lugar)) return volver(request, "faltan");

  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ipHash = await hashIp(ip);
  const { n } = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM eventos WHERE ip_hash = ? AND creado > datetime('now', '-1 day')"
  ).bind(ipHash).first();
  if (n >= MAX_POR_DIA) return volver(request, "limite");

  // Mismo título, fecha y lugar ya cargado: no se duplica.
  const dup = await env.DB.prepare(
    "SELECT id FROM eventos WHERE lower(titulo) = lower(?) AND fecha = ? AND lower(lugar) = lower(?)"
  ).bind(ev.titulo, ev.fecha, ev.lugar).first();
  if (dup) return volver(request);

  await env.DB.prepare(
    `INSERT INTO eventos (titulo, fecha, hora, lugar, direccion, localidad, categoria, url, contacto, ip_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ev.titulo, ev.fecha, ev.hora, ev.lugar, ev.direccion, ev.localidad,
         ev.categoria, ev.url, ev.contacto, ipHash).run();

  return volver(request);
}

function celda(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function listarCsv(env) {
  const { results } = await env.DB.prepare(
    `SELECT titulo, fecha, hora, lugar, direccion, localidad, categoria, url
     FROM eventos WHERE oculto = 0 AND fecha >= ? ORDER BY fecha, hora`
  ).bind(hoyAR()).all();

  const filas = [["titulo", "fecha", "hora", "lugar", "direccion", "categoria", "url"]];
  for (const r of results) {
    // La localidad va pegada a la dirección: el scraper la usa para
    // confirmar que el evento es del Gran La Plata.
    const dir = [r.direccion, r.localidad].filter(Boolean).join(", ");
    filas.push([r.titulo, r.fecha, r.hora, r.lugar, dir, r.categoria, r.url]);
  }
  const csv = filas.map((f) => f.map(celda).join(",")).join("\n") + "\n";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}
