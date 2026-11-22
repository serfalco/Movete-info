/* Mapa cultural de MoVeTe (/mapa/).
 *
 * Todo corre en el teléfono del visitante: la ubicación nunca sale de acá.
 * La lista de eventos ya viene en el HTML (es lo que indexa Google); este
 * script la filtra, la ordena y dibuja los pines.
 */
(function () {
  'use strict';

  var datosEl = document.getElementById('mapa-datos');
  if (!datosEl) return;
  var DATOS = JSON.parse(datosEl.textContent);

  var HORA = 3600 * 1000;
  var DURACION = 2 * HORA;          // sin hora de fin: se da por terminado a las 2 h
  var PRONTO = 2 * HORA;            // el pin late si algo empieza en las próximas 2 h
  var VENTANA_CERCA = 3 * HORA;     // "Cerca tuyo ahora": lo que empieza en 3 h
  var METROS_CUADRA = 120;          // una cuadra de La Plata, de esquina a esquina
  var DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Iconos de trazo, mismo estilo que Lucide (24x24, trazo 2, puntas redondas).
  var ICONOS = {
    'teatro': '<path d="M4 5c5 2 11 2 16 0v6a8 8 0 0 1-16 0Z"/><path d="M9 10h.01M15 10h.01"/><path d="M9.5 14.5a3.5 3.5 0 0 0 5 0"/>',
    'musica': '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    'stand-up': '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
    'cine': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
    'danza': '<circle cx="12" cy="4" r="2"/><path d="M12 8v6l-4 7M12 14l4 7M6 10l6-2 6 2"/>',
    'infantil': '<path d="M12 16c3.5 0 6-3.2 6-7A6 6 0 0 0 6 9c0 3.8 2.5 7 6 7Z"/><path d="M12 16v2c0 2-2 2-2 4"/>',
    'taller': '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    'a-plasticas': '<path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7H16a6 6 0 0 0 6-6C22 6 17.5 2 12 2Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="6.5" r="1"/>',
    'ferias': '<path d="M3 20h18"/><path d="M12 4 4 20M12 4l8 16"/><path d="m10 20 2-5 2 5"/>',
    'charlas': '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z"/>',
    'impro': '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    'humor': '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
    'otros': '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z"/>'
  };

  function icono(cat) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + (ICONOS[cat] || ICONOS.otros) + '</svg>';
  }

  // Lugares fijos: mismo estilo de trazo, pin gris.
  var ICONOS_LUGAR = {
    'museo': '<path d="M3 22h18"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="m12 2 8 5H4Z"/>',
    'biblioteca': '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    'centro-cultural': '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    'sala': '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
  };
  function iconoLugar(k) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + (ICONOS_LUGAR[k] || ICONOS_LUGAR.sala) + '</svg>';
  }

  function escapar(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // --- Tiempo: los eventos vienen en hora de La Plata (UTC-3, sin horario de verano).
  function aHora(iso) { return new Date(iso + ':00-03:00'); }
  function relojAR(d) {                         // campos "de pared" en La Plata
    var x = new Date(d.getTime() - 3 * HORA);
    return { y: x.getUTCFullYear(), m: x.getUTCMonth(), d: x.getUTCDate(), h: x.getUTCHours(), wd: x.getUTCDay() };
  }
  function diaClave(r) { return r.y * 10000 + (r.m + 1) * 100 + r.d; }
  function sumarDias(d, n) { return new Date(d.getTime() + n * 24 * HORA); }

  var ahora = new Date();
  var hoyAR = relojAR(ahora);
  var claveHoy = diaClave(hoyAR);
  var claveManana = diaClave(relojAR(sumarDias(ahora, 1)));
  var finde = (function () {              // viernes a domingo de este finde (o del que viene)
    var desde = hoyAR.wd >= 5 || hoyAR.wd === 0 ? 0 : 5 - hoyAR.wd;
    var hasta = hoyAR.wd === 0 ? 0 : 7 - hoyAR.wd;
    var claves = {};
    for (var i = desde; i <= hasta; i++) claves[diaClave(relojAR(sumarDias(ahora, i)))] = true;
    return claves;
  })();

  var eventos = DATOS.eventos.map(function (e) {
    var inicio = aHora(e.i);
    var r = relojAR(inicio);
    var fin = e.sh ? aHora(e.i.slice(0, 10) + 'T23:59') : new Date(inicio.getTime() + DURACION);
    return {
      id: e.id, titulo: e.t, cat: e.c, sala: e.s, url: e.u, sinHora: e.sh, gratis: e.g || '', lugar: e.l || '',
      inicio: inicio, fin: fin, dia: diaClave(r), hora: r.h, wd: r.wd, hhmm: e.i.slice(11, 16),
      li: document.getElementById(e.id)
    };
  }).filter(function (e) { return e.li; });

  var estado = { cuando: 'semana', franja: '', rubro: '', gratis: false, lugares: false, orden: 'hora', origen: null };

  function vigente(e) { return e.fin > ahora; }
  function pasaCuando(e) {
    switch (estado.cuando) {
      case 'hoy': return e.dia === claveHoy;
      case 'noche': return (e.dia === claveHoy && (e.hora >= 19 || e.sinHora)) || (e.dia === claveManana && e.hora < 6 && !e.sinHora);
      case 'finde': return !!finde[e.dia];
      default: return true;
    }
  }
  function pasaFranja(e) {
    if (!estado.franja) return true;
    if (e.sinHora) return false;
    return estado.franja === 'tarde' ? e.hora < 19 : e.hora >= 19;
  }
  function pasaRubro(e) { return !estado.rubro || e.cat === estado.rubro; }
  // "Gratis (confirmados)": solo los que lo dicen (gratis, entrada libre, a la gorra).
  function pasaGratis(e) { return !estado.gratis || !!e.gratis; }
  function visibles() {
    return eventos.filter(function (e) {
      return vigente(e) && pasaCuando(e) && pasaFranja(e) && pasaRubro(e) && pasaGratis(e);
    });
  }

  // Por default, "Hoy" si queda algo hoy; si no, la semana.
  if (eventos.some(function (e) { return vigente(e) && e.dia === claveHoy; })) estado.cuando = 'hoy';

  // --- Distancias (en el teléfono) -------------------------------------
  function metros(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function textoDistancia(m) {
    var c = Math.round(m / METROS_CUADRA);
    if (c < 1) return 'acá nomás';
    if (c === 1) return 'a 1 cuadra';
    if (c <= 40) return 'a ' + c + ' cuadras';
    return 'a ' + (m / 1000).toFixed(1).replace('.', ',') + ' km';
  }
  function distanciaSala(slug) {
    var s = DATOS.salas[slug];
    if (!s || !estado.origen) return null;
    return metros(estado.origen, s);
  }
  function linkLlegar(s) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
  }
  function cuandoCorto(e) {
    var dia = e.dia === claveHoy ? 'hoy' : e.dia === claveManana ? 'mañana' : DIAS[e.wd];
    // A una semana o más, el día solo confunde ("sáb" puede ser hoy): va con el número.
    if (e.inicio - Date.now() > 6 * 864e5) dia += ' ' + (e.dia % 100);
    return e.sinHora ? dia : dia + ' ' + e.hhmm;
  }

  // --- Mapa -------------------------------------------------------------
  var mapa = null, capaPines = null, capaLugares = null, marcadorOrigen = null, marcadores = {}, primerEncuadre = true;
  var centro = DATOS.centro || DATOS.puntos[0];   // en una zona, su centro

  function nocheAhora() {
    var oscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return oscuro || hoyAR.h >= 20 || hoyAR.h < 7;
  }

  function iniciarMapa() {
    var cont = document.getElementById('mapa');
    if (!window.L || !cont) { if (cont) cont.classList.add('mapa-caido'); return; }
    mapa = L.map(cont, { zoomControl: true, scrollWheelZoom: true, minZoom: 10, maxZoom: 18 })
      .setView([centro.lat, centro.lng], 14);
    var atribucion = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> ' +
      '© <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' +
      'Datos de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
    if (L.maplibreGL) {
      L.maplibreGL({
        style: 'https://tiles.openfreemap.org/styles/' + (nocheAhora() ? 'dark' : 'positron'),
        attribution: atribucion
      }).addTo(mapa);
    } else {
      cont.classList.add('mapa-sin-fondo');
    }
    capaLugares = L.layerGroup().addTo(mapa);   // debajo de los eventos
    capaPines = L.layerGroup().addTo(mapa);
  }

  function popupSala(slug, lista) {
    var s = DATOS.salas[slug];
    var filas = lista.slice(0, 5).map(function (e) {
      var t = e.url ? '<a href="' + escapar(e.url) + '"' + (/^http/.test(e.url) ? ' target="_blank" rel="noopener"' : '') + '>' +
        escapar(e.titulo) + '</a>' : escapar(e.titulo);
      var extra = (e.lugar ? ' <span class="mapa-pop-lugar">en ' + escapar(e.lugar) + '</span>' : '') +
        (e.gratis ? ' <span class="mapa-pop-gratis">' + (e.gratis === 'gorra' ? 'a la gorra' : 'gratis') + '</span>' : '');
      return '<li><span class="mapa-pop-hora">' + escapar(cuandoCorto(e)) + '</span> ' + t + extra + '</li>';
    }).join('');
    var mas = lista.length > 5 ? '<p class="mapa-pop-mas">y ' + (lista.length - 5) + ' más en la lista</p>' : '';
    var d = distanciaSala(slug);
    return '<div class="mapa-pop">' +
      '<p class="mapa-pop-sala"><a href="' + escapar(s.url) + '">' + escapar(s.nombre) + '</a></p>' +
      (d != null ? '<p class="mapa-pop-dist">' + escapar(textoDistancia(d)) + '</p>' : '') +
      '<ul>' + filas + '</ul>' + mas +
      '<a class="mapa-llegar" href="' + linkLlegar(s) + '" target="_blank" rel="noopener">Cómo llegar</a>' +
      '</div>';
  }

  function dibujarPines(lista) {
    if (!mapa) return;
    capaPines.clearLayers();
    marcadores = {};
    var porSala = {};
    lista.forEach(function (e) {
      if (!e.sala || !DATOS.salas[e.sala]) return;
      (porSala[e.sala] = porSala[e.sala] || []).push(e);
    });
    var limites = [];
    Object.keys(porSala).forEach(function (slug) {
      var evs = porSala[slug].slice().sort(function (a, b) { return a.inicio - b.inicio; });
      var proximo = evs[0];
      var pronto = evs.some(function (e) { return !e.sinHora && e.inicio > ahora && e.inicio - ahora <= PRONTO; });
      var s = DATOS.salas[slug];
      var html = '<span class="mapa-pin' + (pronto ? ' mapa-pin--pronto' : '') + (s.casa ? ' mapa-pin--casa' : '') + '" ' +
        'style="--cat: var(--c-' + escapar(proximo.cat) + ', var(--c-otros))">' + icono(proximo.cat) +
        (evs.length > 1 ? '<b class="mapa-pin-n">' + evs.length + '</b>' : '') +
        (s.casa ? '<i class="mapa-pin-casa" aria-hidden="true">★</i>' : '') + '</span>';
      var m = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: 'mapa-pin-wrap', html: html, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -18] }),
        title: s.nombre + ' · ' + evs.length + (evs.length === 1 ? ' evento' : ' eventos'),
        alt: s.nombre,
        riseOnHover: true
      });
      m.bindPopup(function () { return popupSala(slug, evs); }, { maxWidth: 280 });
      m.addTo(capaPines);
      marcadores[slug] = m;
      limites.push([s.lat, s.lng]);
    });
    if (primerEncuadre && limites.length && !estado.origen) {
      primerEncuadre = false;
      // Encuadra los pines del casco: los de City Bell o Berisso no deben alejar todo.
      var cerca = limites.filter(function (p) { return metros(centro, { lat: p[0], lng: p[1] }) < 4000; });
      if (cerca.length >= 3) mapa.fitBounds(cerca, { padding: [30, 30], maxZoom: 15 });
    }
  }

  // --- Lugares fijos ("Ver también lugares") ------------------------------------
  // Una sala con un evento a la vista ya tiene su pin de color: el gris no
  // se dibuja, así nunca sale dos veces.
  var LUGARES = DATOS.lugares || [];

  function popupLugar(l) {
    var nombre = l.u ? '<a href="' + escapar(l.u) + '">' + escapar(l.n) + '</a>' : escapar(l.n);
    var d = estado.origen ? metros(estado.origen, l) : null;
    return '<div class="mapa-pop mapa-pop--lugar">' +
      '<p class="mapa-pop-sala">' + nombre + '</p>' +
      (l.t ? '<p class="mapa-pop-tipo">' + escapar(l.t) + '</p>' : '') +
      (d != null ? '<p class="mapa-pop-dist">' + escapar(textoDistancia(d)) + '</p>' : '') +
      (l.s ? '<p class="mapa-pop-nada">Nada en la cartelera con estos filtros.</p>' : '') +
      (l.h ? '<p class="mapa-pop-horario">Horario: ' + escapar(l.h) + ' <span>(según OpenStreetMap)</span></p>' : '') +
      (l.d ? '<p class="mapa-pop-dir">' + escapar(l.d) + '</p>' : '') +
      '<a class="mapa-llegar" href="' + linkLlegar(l) + '" target="_blank" rel="noopener">Cómo llegar</a>' +
      '</div>';
  }

  function dibujarLugares() {
    if (!mapa) return;
    capaLugares.clearLayers();
    if (!estado.lugares) return;
    LUGARES.forEach(function (l) {
      if (l.s && marcadores[l.s]) return;
      var m = L.marker([l.lat, l.lng], {
        icon: L.divIcon({ className: 'mapa-pin-wrap', html: '<span class="mapa-pin mapa-pin--lugar">' + iconoLugar(l.k) + '</span>',
          iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] }),
        title: l.n + (l.t ? ' · ' + l.t : ''),
        alt: l.n,
        zIndexOffset: -1000
      });
      m.bindPopup(function () { return popupLugar(l); }, { maxWidth: 260 });
      m.addTo(capaLugares);
    });
  }

  // --- Lista --------------------------------------------------------------
  var listaEl = document.querySelector('.mapa-lista');
  var cuentaEl = document.querySelector('.mapa-cuenta');
  var vacioEl = document.querySelector('.mapa-sin-resultados');

  function actualizarLista(lista) {
    var visiblesIds = {};
    lista.forEach(function (e) { visiblesIds[e.id] = true; });
    eventos.forEach(function (e) {
      e.li.hidden = !visiblesIds[e.id];
      var distEl = e.li.querySelector('.mapa-dist');
      var d = e.sala ? distanciaSala(e.sala) : null;
      e.dist = d;
      if (distEl) {
        distEl.hidden = d == null;
        distEl.textContent = d == null ? '' : textoDistancia(d);
      }
    });
    var orden = eventos.slice();
    if (estado.orden === 'cerca' && estado.origen) {
      orden.sort(function (a, b) {
        var da = a.dist == null ? Infinity : a.dist, db = b.dist == null ? Infinity : b.dist;
        return da - db || a.inicio - b.inicio;
      });
    } else {
      orden.sort(function (a, b) { return a.inicio - b.inicio; });
    }
    orden.forEach(function (e) { listaEl.appendChild(e.li); });
    var n = lista.length;
    cuentaEl.textContent = n === 1 ? '1 evento' : n + ' eventos';
    vacioEl.hidden = n > 0;
  }

  var cercaEl = document.querySelector('.mapa-cerca');
  var cercaLista = document.querySelector('.mapa-cerca-lista');

  function actualizarCerca() {
    if (!estado.origen) { cercaEl.hidden = true; return; }
    var lista = eventos.filter(function (e) {
      return e.sala && DATOS.salas[e.sala] && !e.sinHora && pasaRubro(e) && vigente(e) &&
        e.inicio - ahora <= VENTANA_CERCA;
    }).sort(function (a, b) { return distanciaSala(a.sala) - distanciaSala(b.sala); }).slice(0, 6);
    cercaEl.hidden = false;
    if (!lista.length) {
      cercaLista.innerHTML = '<li class="mapa-cerca-vacio">No hay nada empezando en las próximas 3 horas. Mirá el resto abajo.</li>';
      return;
    }
    cercaLista.innerHTML = lista.map(function (e) {
      var s = DATOS.salas[e.sala];
      var t = e.url ? '<a href="' + escapar(e.url) + '"' + (/^http/.test(e.url) ? ' target="_blank" rel="noopener"' : '') + '>' +
        escapar(e.titulo) + '</a>' : escapar(e.titulo);
      var empezo = e.inicio <= ahora ? 'empezó ' : '';
      return '<li style="--cat: var(--c-' + escapar(e.cat) + ', var(--c-otros))">' +
        '<span class="mapa-cerca-icono">' + icono(e.cat) + '</span>' +
        '<span class="mapa-cerca-texto"><strong>' + t + '</strong>' +
        '<span>' + escapar(empezo + cuandoCorto(e)) + ' · ' + escapar(s.nombre) + ' · ' + escapar(textoDistancia(distanciaSala(e.sala))) + '</span></span>' +
        '<a class="mapa-llegar" href="' + linkLlegar(s) + '" target="_blank" rel="noopener" aria-label="Cómo llegar a ' + escapar(s.nombre) + '">Cómo llegar</a>' +
        '</li>';
    }).join('');
  }

  function aplicar() {
    var lista = visibles();
    actualizarLista(lista);
    dibujarPines(lista);
    dibujarLugares();
    actualizarCerca();
    actualizarAviso();
    document.querySelector('.mapa-orden').hidden = !estado.origen;
  }

  // --- Aviso de Tres Empanadas ("De la casa") ----------------------------------
  // Próxima fecha real y, si hay ubicación, a cuántas cuadras. Sin fecha
  // próxima: "Ver próximas fechas". Un solo link, el de la marca.
  function actualizarAviso() {
    var casa = DATOS.casa;
    var cuandoEl = document.querySelector('.mapa-casa-cuando');
    var distEl = document.querySelector('.mapa-casa-dist');
    if (!casa || !cuandoEl) return;
    var proxima = casa.proximas.map(function (p) {
      var inicio = aHora(p.i);
      var r = relojAR(inicio);
      return {
        inicio: inicio, sinHora: p.sh, dia: diaClave(r), wd: r.wd, hhmm: p.i.slice(11, 16),
        fin: p.sh ? aHora(p.i.slice(0, 10) + 'T23:59') : new Date(inicio.getTime() + DURACION)
      };
    }).filter(vigente).sort(function (a, b) { return a.inicio - b.inicio; })[0];
    cuandoEl.textContent = proxima ? cuandoCorto(proxima) : 'Ver próximas fechas';
    var d = estado.origen ? metros(estado.origen, casa) : null;
    distEl.textContent = d == null ? '' : ' · ' + textoDistancia(d);
  }

  // --- Sorprendeme ------------------------------------------------------------
  // Un show al azar que empieza pronto y queda cerca. Respeta rubro y gratis,
  // no el día: la idea es salir ahora.
  var sorpresaEl = document.querySelector('.mapa-sorpresa');
  var sorpresaCuerpo = document.querySelector('.mapa-sorpresa-cuerpo');
  var ultimaSorpresa = null;
  var CUADRAS_CERCA = 25;

  function candidatosSorpresa() {
    var base = eventos.filter(function (e) {
      return e.sala && DATOS.salas[e.sala] && !e.sinHora && e.inicio > ahora && pasaRubro(e) && pasaGratis(e);
    });
    var ventanas = [VENTANA_CERCA, 8 * HORA, 48 * HORA];   // pronto; si no, esta noche; si no, mañana
    for (var i = 0; i < ventanas.length; i++) {
      var pronto = base.filter(function (e) { return e.inicio - ahora <= ventanas[i]; });
      if (estado.origen) {
        var cerca = pronto.filter(function (e) { return distanciaSala(e.sala) <= CUADRAS_CERCA * METROS_CUADRA; });
        if (cerca.length) return cerca;
      }
      if (pronto.length) return pronto;
    }
    return [];
  }

  function sorprender() {
    var lista = candidatosSorpresa();
    if (lista.length > 1 && ultimaSorpresa) {
      lista = lista.filter(function (e) { return e.id !== ultimaSorpresa; });
    }
    sorpresaEl.hidden = false;
    if (!lista.length) {
      ultimaSorpresa = null;
      sorpresaCuerpo.innerHTML = '<p class="mapa-sorpresa-vacio">No encontramos nada que empiece pronto. Probá con el finde.</p>';
      sorpresaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    var e = lista[Math.floor(Math.random() * lista.length)];
    ultimaSorpresa = e.id;
    var s = DATOS.salas[e.sala];
    var d = distanciaSala(e.sala);
    var t = e.url ? '<a href="' + escapar(e.url) + '"' + (/^http/.test(e.url) ? ' target="_blank" rel="noopener"' : '') + '>' +
      escapar(e.titulo) + '</a>' : escapar(e.titulo);
    sorpresaCuerpo.innerHTML =
      '<p class="mapa-sorpresa-titulo" style="--cat: var(--c-' + escapar(e.cat) + ', var(--c-otros))">' +
      '<span class="mapa-cerca-icono">' + icono(e.cat) + '</span><strong>' + t + '</strong></p>' +
      '<p class="mapa-sorpresa-meta">' + escapar(cuandoCorto(e)) + ' · ' + escapar(e.lugar || s.nombre) +
      (d != null ? ' · ' + escapar(textoDistancia(d)) : '') + '</p>' +
      '<a class="mapa-llegar" href="' + linkLlegar(s) + '" target="_blank" rel="noopener">Cómo llegar</a>';
    verSala(e.sala, false);
    sorpresaEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function verSala(slug, desplazar) {
    var m = marcadores[slug];
    if (!m || !mapa) return;
    if (desplazar) document.getElementById('mapa').scrollIntoView({ behavior: 'smooth', block: 'center' });
    mapa.setView(m.getLatLng(), Math.max(mapa.getZoom(), 16));
    m.openPopup();
  }

  // --- Controles ------------------------------------------------------------
  function marcarGrupo(attr, valor) {
    document.querySelectorAll('[data-' + attr + ']').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-' + attr) === valor ? 'true' : 'false');
    });
  }
  ['cuando', 'franja', 'rubro', 'orden'].forEach(function (attr) {
    document.querySelectorAll('[data-' + attr + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        estado[attr] = b.getAttribute('data-' + attr);
        marcarGrupo(attr, estado[attr]);
        aplicar();
      });
    });
  });

  var estadoGeo = document.querySelector('.mapa-geo-estado');
  var selectPunto = document.querySelector('.mapa-punto');

  function ponerOrigen(lat, lng, etiqueta) {
    estado.origen = { lat: lat, lng: lng };
    estado.orden = 'cerca';
    marcarGrupo('orden', 'cerca');
    if (mapa) {
      if (marcadorOrigen) marcadorOrigen.remove();
      marcadorOrigen = L.circleMarker([lat, lng], { radius: 8, className: 'mapa-origen', weight: 3 })
        .bindTooltip(etiqueta).addTo(mapa);
      mapa.setView([lat, lng], 15);
    }
    aplicar();
  }

  document.querySelector('.mapa-geo').addEventListener('click', function () {
    if (!navigator.geolocation) {
      estadoGeo.textContent = 'Tu navegador no comparte la ubicación. Elegí un punto de partida.';
      selectPunto.focus();
      return;
    }
    estadoGeo.textContent = 'Buscando dónde estás…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      estadoGeo.textContent = '';
      selectPunto.value = '';
      ponerOrigen(pos.coords.latitude, pos.coords.longitude, 'Vos');
    }, function () {
      estadoGeo.textContent = 'No pudimos usar tu ubicación. Elegí un punto de partida.';
      selectPunto.focus();
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 });
  });

  selectPunto.addEventListener('change', function () {
    var p = DATOS.puntos.filter(function (x) { return x.id === selectPunto.value; })[0];
    if (!p) return;
    estadoGeo.textContent = '';
    ponerOrigen(p.lat, p.lng, p.nombre);
  });

  listaEl.addEventListener('click', function (ev) {
    var b = ev.target.closest('.mapa-ver');
    if (b) verSala(b.getAttribute('data-ver'), true);
  });

  var chipGratis = document.querySelector('[data-gratis-filtro]');
  if (chipGratis) {
    chipGratis.addEventListener('click', function () {
      estado.gratis = !estado.gratis;
      chipGratis.setAttribute('aria-pressed', estado.gratis ? 'true' : 'false');
      aplicar();
    });
  }

  var chipLugares = document.querySelector('[data-lugares]');
  if (chipLugares) {
    chipLugares.addEventListener('click', function () {
      estado.lugares = !estado.lugares;
      chipLugares.setAttribute('aria-pressed', estado.lugares ? 'true' : 'false');
      dibujarLugares();
    });
  }

  document.querySelector('.mapa-sorprendeme').addEventListener('click', sorprender);
  document.querySelector('.mapa-sorpresa-otra').addEventListener('click', sorprender);

  marcarGrupo('cuando', estado.cuando);
  iniciarMapa();
  aplicar();
})();
