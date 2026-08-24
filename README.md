# SpanishPRReviewClubWebSite

Sitio web estático del **Bitcoin Core PR Review Club en Español**. Publica el histórico de sesiones del club (las charlas del servidor de Discord donde se revisan Pull Requests de Bitcoin Core) como páginas de chat navegables, con una landing con estadísticas del club.

El sitio se genera con [Hugo](https://gohugo.io/) usando un tema propio (`themes/discordish`) que transforma los JSON exportados de Discord con [DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter) en páginas HTML con pinta de chat de Discord.

## Estructura del repo

- `data/discord/` — JSON exportados de Discord, una carpeta por sesión (una PR revisada), más un `metadata.yaml` por carpeta con host y tags.
- `data/next_session.yaml` — anuncio de la próxima sesión que se muestra en la landing.
- `data/pr_template.yml` — plantilla vacía de una sesión nueva; se copia sobre `data/next_session.yaml` al anunciarla.
- `themes/discordish/` — tema Hugo: layouts, CSS y el adaptador de contenido (`content/_content.gotmpl`) que convierte los JSON en páginas.
- `hugo.toml` — configuración del sitio.
- `flake.nix` — entorno de desarrollo reproducible (Hugo + just + git).
- `justfile` — comandos de build/desarrollo.

## Requisitos

Solo hace falta [Nix](https://nixos.org/download/) con *flakes* habilitados (funciona igual en Linux, macOS y WSL). Sigue las instrucciones de instalación para tu plataforma en [nixos.org/download](https://nixos.org/download/).

Tras instalarlo, habilita flakes añadiendo a `~/.config/nix/nix.conf` (o `/etc/nix/nix.conf`):

```
experimental-features = nix-command flakes
```

No necesitas instalar Hugo, Go ni nada más a mano: `nix develop` te deja en un shell con todo lo necesario.

## Desarrollo local

```sh
nix develop
just watch
```

Esto levanta `hugo server -D` (incluye borradores) en `http://localhost:1313/`, con recarga automática al editar contenido, layouts o CSS.

También puedes ejecutar cualquier comando dentro del entorno sin entrar en el shell:

```sh
nix develop --command just watch
```

## Comandos `just`

| Comando      | Qué hace                                                                                     |
|--------------|-----------------------------------------------------------------------------------------------|
| `just build` | Genera el sitio estático minificado en `public/` (el mismo paso que usa CI para desplegar).   |
| `just watch` | Levanta el servidor de desarrollo de Hugo con borradores y *live reload*.                     |

## Despliegue

El despliegue es automático: en cada push a `main`, el workflow `.github/workflows/deploy.yml` instala Nix, ejecuta `just build` y publica el contenido de `public/` en la rama `gh-pages` (GitHub Pages). No hace falta desplegar nada a mano.

## Anunciar la próxima sesión

`data/next_session.yaml` es el único contenido que se escribe a mano. Con `enabled: true` renderiza una tarjeta "Próxima sesión" encima del listado de sesiones pasadas.

Al anunciar la sesión, parte de la plantilla vacía:

```sh
cp data/pr_template.yml data/next_session.yaml
```

y rellena todo menos las preguntas:

```yaml
enabled: true

title: "Nuevo PR Review Club!!"
date_display: "Jueves 30 de Julio a las 7pm CEST"
event_url: "https://discord.com/events/..."   # evento de Discord, opcional

host:
  name: "Pol Espinasa"
  url: "https://x.com/sliv3r__"               # opcional, deja "" si no hay

pr:
  name: "#35501 — wallet: store all witness variants of a transaction"
  url: "https://github.com/bitcoin/bitcoin/pull/35501"

questions: []
questions_note: "Las preguntas se publicarán unos días antes de la sesión."
```

Cuando se publiquen las preguntas (normalmente unos días antes), rellena la lista `questions`; en cuanto tenga elementos sustituye a `questions_note` y se muestra numerada:

```yaml
questions:
  - "¿Qué significa que dos transacciones compartan el mismo txid pero tengan diferentes wtxids?"
  - "¿Por qué el wallet necesita almacenar todas las variantes de witness de una transacción?"
```

Cada cambio es un commit a `main`; el despliegue es automático.

## Cerrar una sesión y archivarla

Cuando la sesión ya ha ocurrido, se exporta de Discord y pasa al histórico. Cada sesión corresponde a un canal de texto de Discord llamado `pr-XXXXX` (el número de la PR revisada), con varios hilos (*threads*) dentro: uno de introducción (`Intro` / `Introducción`) y uno por cada pregunta (`Pregunta 1`, `Pregunta 2`, ...). El sitio necesita el **JSON de cada uno de esos hilos**, exportado con DiscordChatExporter.

### 1. Exportar con DiscordChatExporter

Descarga [DiscordChatExporter](https://github.com/Tyrrrz/DiscordChatExporter) (GUI o CLI, ambas valen).

**Con la GUI:**

1. Inicia sesión con tu token/cuenta de Discord.
2. Selecciona el canal `pr-XXXXX` de la sesión que quieres exportar.
3. En "Include threads" elige **All** (o "Archived" si el canal ya está cerrado) para que exporte también los hilos, no solo el canal padre.
4. Formato de exportación: **JSON**.
5. Exporta a una carpeta temporal.

**Con la CLI**, el equivalente es:

```sh
DiscordChatExporter.Cli export \
  -t "TU_TOKEN" \
  -c "ID_DEL_CANAL_pr-XXXXX" \
  -f Json \
  --include-threads all \
  -o "salida/"
```

Esto genera un fichero `.json` por hilo (Intro, Pregunta 1, Pregunta 2, ...) más uno para el propio canal padre. El del canal padre no se usa (el sitio solo procesa hilos), pero no pasa nada si lo dejas ahí.

### 2. Colocar los ficheros en el repo

Crea una carpeta nueva en `data/discord/` con el nombre de la PR y copia dentro **todos** los `.json` exportados de ese canal:

```
data/discord/pr-XXXXX/
├── ... - Intro [id].json
├── ... - Pregunta 1 [id].json
├── ... - Pregunta 2 [id].json
├── ...
└── metadata.yaml          (paso 3)
```

El nombre de la carpeta es solo organizativo: el adaptador de contenido (`themes/discordish/content/_content.gotmpl`) agrupa las páginas por el campo `channel.category` de cada JSON (que Discord/DiscordChatExporter rellena con el nombre del canal padre, `pr-XXXXX`), no por el nombre de la carpeta ni del fichero. Aun así, usa `pr-XXXXX` como nombre de carpeta para mantener el repo ordenado.

Requisitos para que un hilo se detecte correctamente:

- El hilo de introducción debe empezar por "Intro" (vale `Intro`, `Introduccion`, `Introducción`, no distingue mayúsculas ni tildes).
- Los hilos de pregunta deben contener `Pregunta <número>` en el nombre (p. ej. `Pregunta 5`, `__Pregunta 5__`).
- El primer *embed* del hilo de introducción se usa para sacar el título de la PR y el enlace a GitHub, así que asegúrate de que el mensaje con el embed de la PR está incluido en la exportación.

### 3. Añadir el `metadata.yaml` de la sesión

En esa misma carpeta, junto a los JSON, va el `metadata.yaml` de la sesión (mismo nombre para todas). Es lo que alimenta el filtro por autor, host y tema de la landing, y sale del propio anuncio: mueve ahí el `next_session.yaml` que ya tenías relleno y añádele `author` y `tags`.

```sh
mv data/next_session.yaml data/discord/pr-XXXXX/metadata.yaml
```

De ese fichero solo se leen estas tres claves (el resto —`title`, `pr`, `questions`...— se ignora, así que puedes dejarlo o borrarlo):

```yaml
author: achow101          # usuario de GitHub que abrió la PR

host:                     # mismo formato que en next_session.yaml
  name: "Pol Espinasa"
  url: "https://x.com/sliv3r__"

tags:
  - wallet
  - tx
```

`author` es opcional: si lo omites se usa el autor que devuelva la API de GitHub, pero conviene ponerlo para que el filtro siga funcionando si la API falla. Las `tags` son libres; reutiliza las que ya usan otras sesiones (`wallet`, `mempool`, `p2p`, `fees`, `indices`, ...) para no llenar el desplegable de duplicados.

Si falta el fichero, la sesión se publica igual pero sin datos de filtro, y el build avisa con `WARN Sin metadatos para la sesión pr-XXXXX`.

### 4. Desactivar el anuncio

La sesión ya no es "la próxima". Si moviste el `next_session.yaml` en el paso anterior no hay nada que hacer: sin ese fichero la landing no pinta la tarjeta, y el siguiente anuncio vuelve a partir de `data/pr_template.yml`. Si en vez de moverlo lo dejaste donde estaba, ponle `enabled: false` hasta el siguiente anuncio.

### 5. Comprobar y desplegar

```sh
nix develop --command just watch
```

Verifica que la sesión nueva aparece en la landing, que el filtro la encuentra por autor/host/tema y que las preguntas se navegan bien (con los enlaces "anterior"/"siguiente"). Cuando esté bien, haz commit de la carpeta nueva bajo `data/discord/` y haz push a `main`; el despliegue a GitHub Pages es automático.
