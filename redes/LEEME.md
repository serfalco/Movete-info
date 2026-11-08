# Redes de MoVeTe (Instagram + Facebook)

Todo está armado y **apagado**. Cada jueves la edición ya dibuja las piezas en
`redes/<jueves>/` (se ven en `movete.info/redes/<jueves>/carrusel-00.jpg`).
Para que se publiquen solas faltan las cuentas y cuatro datos.

## Qué se publica

| Cuándo | Instagram | Facebook |
|---|---|---|
| Jueves | Carrusel "Qué hacer en La Plata este finde" (tapa + hasta 8 funciones + cierre) | El mismo álbum, con link a la página de cada obra |
| Todos los días | Historia "Hoy en La Plata" (4 funciones) | Foto del día con los links |

Los links llevan UTM (`utm_source=facebook|instagram`) para medir en Search
Console / analytics cuánta gente llega desde las redes.

## Activar (lo hace Tres, una sola vez)

1. **Página de Facebook** "MoVeTe La Plata".
2. **Instagram @movete.info** como cuenta *profesional* (Creador o Empresa) y
   vinculada a esa página (Meta Business Suite → Configuración → Cuentas).
   En la bio: link a `https://movete.info`.
3. **App de Meta**: developers.facebook.com → Crear app → tipo *Empresa*,
   asociada al mismo portfolio comercial que la página.
4. **Token que no vence**: business.facebook.com → Configuración → Usuarios del
   sistema → crear uno (Admin) → *Asignar activos*: la página y la cuenta de IG
   con control total → *Generar token* para la app, vencimiento **Nunca**, con
   permisos `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish`, `business_management`.
5. **IDs**: el de la página está en Página → Información. El de Instagram: en
   el Explorador de la API Graph, `GET /<id de la página>?fields=instagram_business_account`.
6. En GitHub, repo **Movete-info → Settings → Secrets and variables → Actions**:
   - Secrets: `META_TOKEN`, `META_PAGE_ID`, `META_IG_ID`
   - Variables: `REDES_ACTIVAS` = `true`
7. Avisarle a Claude: suma las redes al `sameAs` del sitio (para que Google
   las asocie con movete.info) y corre una prueba con "Run workflow".

El token no se pega en el chat: va solo en el secret.

## Apagar

Variable `REDES_ACTIVAS` en `false` (o borrarla). No se borra nada.

## Arrobar salas

`movete-espectaculos/redes_cuentas.json`: slug de la sala → `@cuenta`. Si está
cargada, los posts la arroban.
