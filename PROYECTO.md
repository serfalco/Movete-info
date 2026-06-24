# MOVETE.INFO - DOCUMENTO MAESTRO

## Visión

MoVeTe es una plataforma cultural automatizada de La Plata.

Su objetivo es utilizar el tráfico generado por eventos, artistas y venues masivos para descubrir y dar visibilidad a propuestas culturales más pequeñas.

No es una ticketera. No vende entradas. No es un diario. No es una agenda tradicional. Es una edición cultural semanal automatizada.

## Dominio

`movete.info`

## Secciones principales

- `/cine/` — cartelera de cine de La Plata.
- `/en-vivo/` — agenda de espectáculos y eventos en vivo de La Plata.

## Frecuencia editorial

MoVeTe funciona por ediciones semanales.

Cada edición cubre jueves → miércoles.

Ejemplo: edición `2026-06-25`, desde jueves 25 de junio hasta miércoles 1 de julio.

## Infraestructura

- `movete-scraper`: obtiene y normaliza eventos. Salida: `eventos.json`.
- `movete-cine`: genera HTML estático de cine.
- `movete-espectaculos`: genera HTML estático de En Vivo.
- `Movete-info`: sitio final publicado por Cloudflare Pages.

## Tecnologías descartadas

- WordPress
- FTP
- Hostinger
- PHP
- Base de datos

## SEO

Las ediciones se conservan. Nunca se eliminan.

Ejemplos:

- `/cine/2026-06-25/`
- `/en-vivo/2026-06-25/`

`index.html` siempre apunta a la edición vigente.

## Lo que se viene

Forma parte de cada edición semanal. No es una sección independiente.

Objetivo: mostrar eventos futuros importantes, especialmente en venues masivos.

## Venues

Los venues son entidades permanentes. Los eventos son temporales.

Versión futura:

- `/venue/teatro-opera/`
- `/venue/coliseo-podesta/`
- `/venue/estadio-uno/`

## Publicidad

Editorial y publicidad están separadas.

La publicidad siempre se identifica como “Espacio promocional”.

Inicialmente se usa para Tres Empanadas Comedia.

## Regla principal

Cada decisión técnica debe responder a esta pregunta:

> ¿Ayuda a que MoVeTe sea una plataforma cultural simple, automática, rápida y sostenible a largo plazo?

Si la respuesta es no, no se implementa.
