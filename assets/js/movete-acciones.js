/* MoVeTe: acciones por evento (agendar, mandar por WhatsApp, guardar en "Mi plan").
   Lee los datos de cada tarjeta (.event-card[data-inicio]) que arma el generador.
   "Mi plan" vive en el navegador (localStorage): sin cuenta, sin servidor. */
(function () {
  var tarjetas = document.querySelectorAll(".event-card[data-inicio]");
  if (!tarjetas.length) return;

  var CLAVE = "movete-plan-v1";
  var esAndroid = /android/i.test(navigator.userAgent);

  var css = document.createElement("style");
  css.textContent =
    ".ev-acciones{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}" +
    ".ev-acciones button{font:inherit;font-size:.82rem;padding:5px 11px;border-radius:999px;border:1px solid var(--line-strong);background:transparent;color:var(--ink);cursor:pointer}" +
    ".ev-acciones button[aria-pressed=true]{background:var(--ink);color:var(--paper);border-color:var(--ink)}" +
    ".plan-boton{position:fixed;right:14px;bottom:14px;z-index:30;font:inherit;font-weight:600;padding:10px 16px;border-radius:999px;border:0;background:var(--ink);color:var(--paper);box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer}" +
    ".plan-panel{position:fixed;inset:auto 0 0 0;max-height:75vh;overflow:auto;z-index:31;background:var(--paper);color:var(--ink);border-top:1px solid var(--line-strong);border-radius:18px 18px 0 0;padding:18px 16px 24px;box-shadow:0 -10px 30px rgba(0,0,0,.25)}" +
    ".plan-panel h2{margin:0 0 4px;font-size:1.25rem}.plan-panel ul{list-style:none;padding:0;margin:12px 0}" +
    ".plan-panel li{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line-strong)}" +
    ".plan-panel li small{display:block;color:var(--muted)}.plan-panel button{font:inherit;cursor:pointer}" +
    ".plan-panel .plan-x{background:none;border:0;font-size:1.1rem;color:var(--muted)}" +
    ".plan-panel .plan-pie{display:flex;gap:8px;flex-wrap:wrap}" +
    ".plan-panel .plan-pie button{padding:8px 14px;border-radius:999px;border:1px solid var(--line-strong);background:transparent;color:var(--ink)}";
  document.head.appendChild(css);

  function leer() { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; } }
  function guardar(lista) { try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (e) {} }
  function ahoraLocal() {
    return new Date().toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 16).replace(" ", "T");
  }
  // Lo que ya pasó (más de 4 horas atrás) se limpia solo.
  var corte = new Date(Date.now() - 4 * 3600e3).toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).slice(0, 16).replace(" ", "T");
  var plan = leer().filter(function (e) { return e.inicio >= corte; });
  guardar(plan);

  function datos(t) {
    return { titulo: t.dataset.titulo || "", inicio: t.dataset.inicio || "", lugar: t.dataset.lugar || "",
             direccion: t.dataset.direccion || "", link: t.dataset.link || location.href };
  }
  function clave(e) { return e.titulo + "|" + e.inicio + "|" + e.lugar; }
  function enPlan(e) { return plan.some(function (p) { return clave(p) === clave(e); }); }
  function cuando(e) {
    var d = new Date(e.inicio + ":00");
    return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "numeric" }) + " " + e.inicio.slice(11) + " h";
  }

  // --- Agendar ---------------------------------------------------------------
  function sumarHoras(inicio, h) {
    var d = new Date(inicio + ":00"); d.setHours(d.getHours() + h);
    var z = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "T" + z(d.getHours()) + z(d.getMinutes()) + "00";
  }
  function agendar(e) {
    var ini = e.inicio.replace(/[-:]/g, "") + "00", fin = sumarHoras(e.inicio, 2);
    var donde = e.lugar + (e.direccion ? ", " + e.direccion : "");
    if (esAndroid) {
      window.open("https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(e.titulo) +
        "&dates=" + ini + "/" + fin + "&ctz=America/Argentina/Buenos_Aires&location=" + encodeURIComponent(donde) +
        "&details=" + encodeURIComponent(e.link + "\nvía movete.info"), "_blank", "noopener");
      return;
    }
    var esc = function (s) { return String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n"); };
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MoVeTe//movete.info//ES", "BEGIN:VEVENT",
      "UID:" + Date.now() + "@movete.info", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
      "DTSTART;TZID=America/Argentina/Buenos_Aires:" + ini, "DTEND;TZID=America/Argentina/Buenos_Aires:" + fin,
      "SUMMARY:" + esc(e.titulo), "LOCATION:" + esc(donde), "DESCRIPTION:" + esc(e.link + "\nvía movete.info"),
      "URL:" + e.link, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = (e.titulo.replace(/[^\wáéíóúñü -]/gi, "").trim().slice(0, 40) || "evento") + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
  }

  // --- WhatsApp --------------------------------------------------------------
  function whatsapp(texto) { window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener"); }
  function textoEvento(e) { return "¿Vamos? 👇\n" + e.titulo + "\n" + cuando(e) + " · " + e.lugar + "\n" + e.link; }

  // --- Mi plan ---------------------------------------------------------------
  var boton = document.createElement("button");
  boton.className = "plan-boton"; boton.type = "button";
  boton.addEventListener("click", abrirPanel);
  document.body.appendChild(boton);
  var panel = null;

  function refrescar() {
    boton.textContent = "★ Mi plan (" + plan.length + ")";
    boton.style.display = plan.length ? "" : "none";
    document.querySelectorAll(".ev-acciones [data-acc=plan]").forEach(function (b) {
      var on = enPlan(datos(b.closest(".event-card")));
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "★ En mi plan" : "☆ Mi plan";
    });
    if (panel) pintarPanel();
  }
  function alternar(e) {
    if (enPlan(e)) plan = plan.filter(function (p) { return clave(p) !== clave(e); });
    else plan.push(e);
    plan.sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; });
    guardar(plan); refrescar();
  }
  function abrirPanel() {
    if (panel) { cerrarPanel(); return; }
    panel = document.createElement("div");
    panel.className = "plan-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Mi plan");
    document.body.appendChild(panel); pintarPanel();
  }
  function cerrarPanel() { if (panel) { panel.remove(); panel = null; } }
  function pintarPanel() {
    if (!plan.length) { cerrarPanel(); return; }
    var h = function (s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
    panel.innerHTML = '<h2>★ Mi plan</h2><small style="color:var(--muted)">Queda guardado en este celu.</small><ul>' +
      plan.map(function (e, i) {
        return '<li><div><a href="' + h(e.link) + '">' + h(e.titulo) + "</a><small>" + h(cuando(e)) + " · " + h(e.lugar) +
          '</small></div><button class="plan-x" data-i="' + i + '" aria-label="Sacar de mi plan">✕</button></li>';
      }).join("") + '</ul><div class="plan-pie"><button data-p="wa">Mandar el plan por WhatsApp</button><button data-p="cerrar">Cerrar</button></div>';
    panel.querySelectorAll(".plan-x").forEach(function (b) {
      b.addEventListener("click", function () { alternar(plan[+b.dataset.i]); });
    });
    panel.querySelector('[data-p=wa]').addEventListener("click", function () {
      whatsapp("Mi plan en La Plata 🎭\n\n" + plan.map(function (e) { return "• " + e.titulo + " — " + cuando(e) + ", " + e.lugar + "\n  " + e.link; }).join("\n") + "\n\nArmado en movete.info");
    });
    panel.querySelector('[data-p=cerrar]').addEventListener("click", cerrarPanel);
  }

  // --- Botones en cada tarjeta ----------------------------------------------
  var ahora = ahoraLocal();
  tarjetas.forEach(function (t) {
    if (t.querySelector(".ev-acciones")) return;
    var e = datos(t);
    var fila = document.createElement("div");
    fila.className = "ev-acciones";
    var futuro = e.inicio >= ahora.slice(0, 10);
    fila.innerHTML = (futuro ? '<button type="button" data-acc="plan" aria-pressed="false">☆ Mi plan</button>' +
      '<button type="button" data-acc="agendar">📅 Agendar</button>' : "") +
      '<button type="button" data-acc="wa">💬 WhatsApp</button>';
    fila.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-acc]"); if (!b) return;
      if (b.dataset.acc === "plan") alternar(e);
      else if (b.dataset.acc === "agendar") agendar(e);
      else whatsapp(textoEvento(e));
    });
    var mapa = t.querySelector(".event-map-link");
    if (mapa) t.insertBefore(fila, mapa); else t.appendChild(fila);
  });
  refrescar();
})();
