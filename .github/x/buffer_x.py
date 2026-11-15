"""Publicar en X a traves de la API de Buffer (plan gratis).

Comun a Movete-info, Claude_Pincha y webtres: el mismo archivo en los tres repos.
Sin dependencias: solo la libreria estandar de Python.

- BUFFER_API_KEY: secret del repo. Sin clave, o con DRY_RUN=1, no publica:
  muestra el texto y listo.
- Si algo falla, avisa y sigue. Un dia sin post no rompe nada.
"""
import json
import os
import re
import sys
import unicodedata
import urllib.request
from datetime import datetime, timedelta, timezone

API = "https://api.buffer.com"
AR = timezone(timedelta(hours=-3))  # Argentina no tiene horario de verano

MUTACION = """
mutation CrearPost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id dueAt } }
    ... on MutationError { message }
  }
}
"""

URL_RE = re.compile(r"https?://\S+")


def ahora_ar():
    return datetime.now(AR)


def largo_x(texto):
    """Largo aproximado como lo cuenta X: links = 23, emojis/CJK = 2."""
    t = URL_RE.sub("x" * 23, texto)
    n = 0
    for c in t:
        if unicodedata.category(c) in ("Mn", "Me") or c in "️‍":
            continue
        n += 2 if ord(c) > 0x10FF else 1
    return n


def ajustar(cabeza, items, pie, limite=280):
    """Arma cabeza + items + pie sacando items del final hasta que entre."""
    items = list(items)
    while True:
        partes = [cabeza]
        if items:
            partes.append("\n".join(items))
        partes.append(pie)
        texto = "\n\n".join(p for p in partes if p)
        if largo_x(texto) <= limite or not items:
            return texto
        items.pop()


def publicar(canal, texto, cuando=None):
    """Programa `texto` en el canal de Buffer para `cuando` (datetime con zona).

    Si `cuando` es None o ya paso, sale ahora. Devuelve True si salio bien.
    """
    clave = os.environ.get("BUFFER_API_KEY", "").strip()
    seco = os.environ.get("DRY_RUN", "") not in ("", "0", "false")
    momento = "ahora"
    entrada = {"channelId": canal, "text": texto, "schedulingType": "automatic"}
    if cuando and cuando > datetime.now(timezone.utc) + timedelta(minutes=2):
        entrada["mode"] = "customScheduled"
        entrada["dueAt"] = cuando.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        momento = cuando.astimezone(AR).strftime("%d/%m %H:%M ART")
    else:
        entrada["mode"] = "shareNow"

    print(f"--- X ({momento}, {largo_x(texto)} caracteres) ---\n{texto}\n---")
    if seco or not clave:
        print("Sin publicar (prueba en seco o sin BUFFER_API_KEY).")
        return True

    cuerpo = json.dumps({"query": MUTACION, "variables": {"input": entrada}}).encode()
    pedido = urllib.request.Request(
        API,
        data=cuerpo,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {clave}",
            "User-Agent": "movete-redes/1.0",
        },
    )
    try:
        with urllib.request.urlopen(pedido, timeout=30) as r:
            resp = json.load(r)
    except Exception as e:  # red, 401, 429...
        print(f"::warning::Buffer no respondio bien: {e}")
        return False
    datos = (resp.get("data") or {}).get("createPost") or {}
    if datos.get("post"):
        print(f"Programado en Buffer: {datos['post'].get('id')} para {datos['post'].get('dueAt')}")
        return True
    print(f"::warning::Buffer rechazo el post: {datos.get('message') or resp.get('errors')}")
    return False


def verificar(canal):
    """Prueba la clave leyendo la cuenta de Buffer (no publica nada)."""
    clave = os.environ.get("BUFFER_API_KEY", "").strip()
    if not clave:
        print("Falta BUFFER_API_KEY.")
        return False
    q = {"query": "query { account { organizations { id name } } }"}
    pedido = urllib.request.Request(
        API,
        data=json.dumps(q).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {clave}",
                 "User-Agent": "movete-redes/1.0"},
    )
    try:
        with urllib.request.urlopen(pedido, timeout=30) as r:
            print("Buffer:", json.dumps(json.load(r), ensure_ascii=False))
        return True
    except Exception as e:
        print(f"::warning::No pude leer la cuenta: {e}")
        return False


if __name__ == "__main__":
    print(largo_x(sys.argv[1] if len(sys.argv) > 1 else ""))
