"""MoVeTe -> X: un post por dia, 11:00 ART, con los planes del dia.

Toma la "historia del dia" que ya arma la edicion en redes/<jueves>/manifest.json
(la misma que va a Facebook) y la achica para X. Si ese dia no hay historia,
sale un post generico con el link a la agenda. Miercoles y domingos suma la
invitacion al newsletter.

Uso: python3 movete_x.py --redes ../redes [--fecha AAAA-MM-DD]
"""
import argparse
import glob
import json
import os
import re
from datetime import datetime, time, timedelta

from buffer_x import AR, ahora_ar, ajustar, marcar, proxima, publicar, ya_hecho

CANAL = "6af9df56ece6dfde5fd48569"  # @MoVeTeLaPlata en Buffer
HORA = time(11, 0)
NEWSLETTER = "https://buttondown.com/MoVeTe"

EVENTO_RE = re.compile(r"^\S+ \d{1,2}(:\d\d)? h · ")
ARROBA_RE = re.compile(r"\s+@[\w.]+")  # cuentas de Instagram: en X no sirven


def historia_del_dia(redes, fecha):
    for m in sorted(glob.glob(os.path.join(redes, "*", "manifest.json")), reverse=True):
        try:
            h = (json.load(open(m, encoding="utf-8")).get("historias") or {}).get(fecha)
        except Exception:
            continue
        if h and h.get("facebook"):
            return h["facebook"]
    return None


ROTAN = ["#AgendaCultural", "#Teatro", "#MusicaEnVivo", "#StandUp", "#Cultura"]


def corto(linea, maximo=48):
    linea = ARROBA_RE.sub("", linea).strip()
    return linea if len(linea) <= maximo else linea[: maximo - 1].rstrip() + "…"


def armar(texto_fb, fecha, dia_semana):
    link = (f"https://movete.info/en-vivo/hoy/?utm_source=x&utm_medium=social"
            f"&utm_campaign=hoy-{fecha}")
    pie = f"Todos los planes de hoy 👉 {link}"
    if dia_semana in (2, 6):  # miercoles y domingo
        pie += f"\n📬 La agenda, cada jueves en tu mail: {NEWSLETTER}"
    # 3 hashtags (X castiga los posts con muchos), sin tildes; el tercero rota por dia.
    pie += f"\n#LaPlata #QueHacerEnLaPlata {ROTAN[dia_semana % len(ROTAN)]}"

    if not texto_fb:
        cabeza = "¿Qué hacer hoy en La Plata? Teatro, música, stand up, cine y más 👇"
        return ajustar(cabeza, [], pie)

    lineas = texto_fb.splitlines()
    cabeza = lineas[0].strip()
    eventos = [corto(l) for l in lineas if EVENTO_RE.match(l.strip())][:5]
    return ajustar(cabeza, eventos, pie)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--redes", required=True)
    ap.add_argument("--fecha")
    a = ap.parse_args()
    # Programa el proximo post de las 11:00 (hoy o mañana) para que Buffer lo saque en hora.
    hoy = datetime.strptime(a.fecha, "%Y-%m-%d").date() if a.fecha else proxima(HORA)
    fecha = hoy.isoformat()
    cuando = datetime.combine(hoy, HORA, tzinfo=AR)
    clave = f"movete-{fecha}"
    if ya_hecho(clave):
        print(f"{clave}: ya programado.")
        return
    historia = historia_del_dia(a.redes, fecha)
    if not historia and not a.fecha and cuando - ahora_ar() > timedelta(hours=6):
        print(f"Todavía no hay agenda del {fecha}; espero la próxima corrida.")
        return
    if publicar(CANAL, armar(historia, fecha, hoy.weekday()), cuando):
        marcar(clave)


if __name__ == "__main__":
    main()
