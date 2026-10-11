from __future__ import annotations

import argparse
import html as _html
import re
from itertools import zip_longest
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo


MESES = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)

TIME_RE = re.compile(r'<time data-edition-date\b[^>]*>.*?</time>')


def jueves_de_edicion(hoy: date) -> date:
    return hoy - timedelta(days=(hoy.weekday() - 3) % 7)


def actualizar_portada(index_path: Path, hoy: date) -> date:
    jueves = jueves_de_edicion(hoy)
    etiqueta = jueves.strftime("%d.%m.%Y")
    aria = f"Edición del {jueves.day} de {MESES[jueves.month - 1]} de {jueves.year}"
    reemplazo = (
        f'<time data-edition-date datetime="{jueves.isoformat()}" '
        f'aria-label="{aria}">{etiqueta}</time>'
    )

    contenido = index_path.read_text(encoding="utf-8")
    contenido_nuevo, cantidad = TIME_RE.subn(reemplazo, contenido, count=1)
    if cantidad != 1:
        raise RuntimeError("No se encontró un único marcador data-edition-date en index.html")

    index_path.write_text(contenido_nuevo, encoding="utf-8")
    return jueves


MARCA_SEMANA = re.compile(r'(<!-- PORTADA:SEMANA -->)(.*?)(<!-- /PORTADA:SEMANA -->)', re.S)
MARCA_VIENE = re.compile(r'(<!-- PORTADA:VIENE -->)(.*?)(<!-- /PORTADA:VIENE -->)', re.S)
DAY_RE = re.compile(r'<section class="day-block"[^>]*>\s*<h2>[^<]*?(\d{1,2}) de (\w+)</h2>(.*?)</section>', re.S)
CARD_RE = re.compile(r'<article class="event-card[^"]*" data-category="([^"]+)">.*?</article>', re.S)
FUTURE_RE = re.compile(r'<article class="event-card future"[^>]*>.*?</article>', re.S)
TITLE_RE = re.compile(r'<h3><a [^>]*>([^<]+)</a>')
MAX_SEMANA = 48
MAX_VIENE = 6
MAX_POR_RUBRO = 14


def _cards_semana(envivo: str, anio: int) -> list[tuple[str, str]]:
    """Devuelve (fecha_iso, html) de las tarjetas de la semana, con imagen primero."""
    candidatas = []
    for dia, mes, cuerpo in DAY_RE.findall(envivo):
        if mes not in MESES:
            continue
        iso = date(anio, MESES.index(mes) + 1, int(dia)).isoformat()
        for m in CARD_RE.finditer(cuerpo):
            candidatas.append((iso, m.group(1), m.group(0)))
    # Intercalar días para que todos los días de la semana tengan representación.
    por_dia: dict[str, list] = {}
    for c in candidatas:
        por_dia.setdefault(c[0], []).append(c)
    candidatas = [c for fila in zip_longest(*por_dia.values()) for c in fila if c]
    vistos, por_rubro, elegidas = set(), {}, []
    for tiene_img in (True, False):
        for iso, cat, card in candidatas:
            if ('event-card-media' in card) != tiene_img:
                continue
            t = TITLE_RE.search(card)
            clave = (t.group(1) if t else card).strip().lower()
            if clave in vistos or por_rubro.get(cat, 0) >= MAX_POR_RUBRO or cat == 'cine':
                continue
            vistos.add(clave)
            por_rubro[cat] = por_rubro.get(cat, 0) + 1
            elegidas.append((iso, cat, card))
    elegidas = elegidas[:MAX_SEMANA]
    elegidas.sort(key=lambda x: x[0])
    out = []
    for iso, cat, card in elegidas:
        card = card.replace('<article class="event-card', f'<article data-fecha="{iso}" class="event-card', 1)
        card = re.sub(r'\s*<p class="event-ticket">.*?</p>', '', card, flags=re.S)
        out.append((iso, card))
    return out


def actualizar_bloques(index_path: Path, envivo_path: Path, jueves: date) -> tuple[int, int]:
    if not envivo_path.exists():
        return 0, 0
    envivo = envivo_path.read_text(encoding="utf-8")
    semana = _cards_semana(envivo, jueves.year)
    viene = []
    m = re.search(r'<section id="lo-que-se-viene".*?</section>', envivo, re.S)
    if m:
        viene = FUTURE_RE.findall(m.group(0))[:MAX_VIENE]
    contenido = index_path.read_text(encoding="utf-8")
    if semana and MARCA_SEMANA.search(contenido):
        bloque = "\n" + "\n".join(c for _, c in semana) + "\n"
        contenido = MARCA_SEMANA.sub(lambda mm: mm.group(1) + bloque + mm.group(3), contenido, count=1)
    if viene and MARCA_VIENE.search(contenido):
        bloque = "\n" + "\n".join(viene) + "\n"
        contenido = MARCA_VIENE.sub(lambda mm: mm.group(1) + bloque + mm.group(3), contenido, count=1)
    index_path.write_text(contenido, encoding="utf-8")
    return len(semana), len(viene)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Actualiza la fecha semanal de la portada")
    parser.add_argument("--date", help="Fecha de prueba en formato AAAA-MM-DD")
    parser.add_argument("--envivo", type=Path, default=Path(__file__).resolve().with_name("en-vivo") / "index.html")
    parser.add_argument(
        "--index",
        type=Path,
        default=Path(__file__).resolve().with_name("index.html"),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    hoy = (
        date.fromisoformat(args.date)
        if args.date
        else datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).date()
    )
    jueves = actualizar_portada(args.index, hoy)
    n_sem, n_viene = actualizar_bloques(args.index, args.envivo, jueves)
    print(f"Portada actualizada: {jueves.isoformat()} ({n_sem} de la semana, {n_viene} próximos)")


if __name__ == "__main__":
    main()
