"""Avisa a Bing (y a los otros buscadores de IndexNow) qué páginas cambiaron.

Lee data/sitemap-lastmod.json, que escribe generar_edicion.py con la fecha en
que cambió cada URL, y manda las que cambiaron desde ayer. Google no usa
IndexNow; Bing, DuckDuckGo y Yandex sí. Si falla, no pasa nada: el sitemap
sigue estando y lo leen igual, solo que más tarde.

La clave es pública a propósito: IndexNow la verifica leyendo
https://movete.info/<clave>.txt.
"""
import json
import sys
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

CLAVE = "641c8cdc6ff29acc10608bf9695e1e71"
SITIO = "https://movete.info"
TOPE = 10000  # máximo que acepta IndexNow por pedido


def urls_cambiadas(lastmod: dict, desde: date) -> list[str]:
    salida = []
    for ruta, dato in lastmod.items():
        fecha = (dato or {}).get("fecha", "") if isinstance(dato, dict) else str(dato)
        if fecha >= desde.isoformat():
            salida.append(SITIO + ruta)
    return sorted(salida)[:TOPE]


def main() -> int:
    raiz = Path(__file__).resolve().parent
    try:
        lastmod = json.loads((raiz / "data" / "sitemap-lastmod.json").read_text("utf-8"))
    except (OSError, ValueError) as e:
        print(f"indexnow: no se pudo leer sitemap-lastmod.json ({e})")
        return 0
    urls = urls_cambiadas(lastmod, date.today() - timedelta(days=1))
    if not urls:
        print("indexnow: no hay páginas nuevas para avisar")
        return 0
    cuerpo = json.dumps({"host": "movete.info", "key": CLAVE,
                         "keyLocation": f"{SITIO}/{CLAVE}.txt", "urlList": urls}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=cuerpo, method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"indexnow: {len(urls)} URLs avisadas (HTTP {r.status})")
    except urllib.error.HTTPError as e:
        print(f"indexnow: respondió HTTP {e.code} {e.read(200).decode('utf-8', 'replace')}")
    except Exception as e:  # noqa: BLE001
        print(f"indexnow: error {e}")
    return 0  # nunca corta la publicación


if __name__ == "__main__":
    sys.exit(main())
