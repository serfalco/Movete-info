# ROADMAP

Actualizado el 12/11/2026. El plan vivo está en dos documentos:

- Plan de posicionamiento: https://claude.ai/artifact/LdC8eqNBqznCLLpekTCihK
- Informe integral y plan de mejoras (noviembre 2026): https://claude.ai/artifact/5jvQABAiuJe3Rh4J2JzPQ1

## Hecho

- [x] Sitio estático en Cloudflare Workers conectado a `Movete-info` (sin WordPress, FTP ni base de datos).
- [x] Portada, Cine en `/cine/` y En Vivo en `/en-vivo/`, con ediciones semanales.
- [x] "Lo que se viene" y eventos futuros de salas grandes.
- [x] Base de salas con nombres normalizados y dirección (`movete-espectaculos/venues.py`).
- [x] Páginas por sala, por obra y por película; rubros con URL propia.
- [x] Formulario `/sumar/` y planilla como fuentes propias.
- [x] Tres pasadas por semana: martes, jueves (edición completa, cine y newsletter) y domingo.
- [x] Newsletter semanal y publicación automática en redes.
- [x] Buscador y filtros en la cartelera.

## En curso (noviembre 2026)

- [ ] Higiene del índice: alias de obra con 301, ediciones viejas en `noindex`, `lastmod` real, `alt` en afiches, `_headers`.
- [ ] Medir el cambio de títulos de salas (~20/11) y de obras (~4/12).

## Después

- [ ] Control automático del HTML en cada pasada.
- [ ] Salas con historial y datos fijos.
- [ ] Obras pasadas: contenido propio y regla de salida del índice.
- [ ] Una tarjeta por show con todas sus fechas.
- [ ] Coordenadas y capacidad de las salas; mapa por sala.
