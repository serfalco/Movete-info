from __future__ import annotations

import argparse
import re
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Actualiza la fecha semanal de la portada")
    parser.add_argument("--date", help="Fecha de prueba en formato AAAA-MM-DD")
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
    print(f"Portada actualizada: {jueves.isoformat()}")


if __name__ == "__main__":
    main()
