# Videos API

API REST que renderiza **videos verticales de frases (1080×1920)** a `.mp4` usando **Remotion**. Envías un texto (y opcionalmente un autor) por HTTP y recibes el video renderizado. Pensada para integrarse con **n8n** o cualquier servicio que necesite generar videos automáticamente.

## Cómo funciona

1. Llega un `POST /render` con el texto (y opcionalmente autor).
2. Remotion empaqueta la composición (una sola vez) y renderiza el video con el texto superpuesto sobre un fondo con música y un efecto de "libro".
3. La respuesta es el `.mp4` listo para descargar.

## API

### `POST /render`

**Request:**

```json
{
  "text": "La disciplina es el puente entre las metas y los logros.",
  "author": "Jim Rohn"
}
```

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `text` | string | Sí | Frase que aparece en el video. |
| `author` | string | No | Autor; si va, se muestra abajo en cursiva. |
| `type` | string | No | Etiqueta de log (hoy no cambia la composición; se renderiza siempre `QuoteVideo`). |

**Respuesta:** el archivo `.mp4` (`h264`) para descargar. En caso de error, JSON `{ "error": "..." }` con status 500.

**Ejemplo con `curl`:**

```bash
curl -X POST http://localhost:8000/render \
  -H 'Content-Type: application/json' \
  -d '{"text":"La disciplina es el puente entre las metas y los logros.","author":"Jim Rohn"}' \
  -o video.mp4
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8000` | Puerto del servidor HTTP. |

## Requisitos

- **Node.js 18+** y npm.
- **Chrome/Chromium** disponible para Remotion (el `Dockerfile` ya lo instala).

## Desarrollo local

```bash
npm install --legacy-peer-deps

npm run dev          # Remotion Studio (preview/UI en el navegador)
npx tsx server.ts    # Servidor API en http://localhost:8000
```

Otros scripts:

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre Remotion Studio para previsualizar la composición. |
| `npm run build` | `remotion bundle` (empaqueta la composición). |
| `npm run lint` | `eslint src && tsc`. |

## Docker

```bash
docker build -t videos-api .
docker run -p 8000:8000 videos-api
```

La imagen usa `node:18-bullseye` con Chromium, `tini` como init (para no dejar procesos zombie) y arranca con `npx tsx server.ts`.

## Deploy (EasyPanel)

Conecta el repo como servicio, expone el puerto **8000** y usa el `Dockerfile` incluido. No requiere variables de entorno más allá de `PORT` (opcional).

## Estructura

```
server.ts              Servidor Express: POST /render + estáticos
src/
  index.ts             registerRoot de Remotion
  Root.tsx             Registra la composición QuoteVideo
  QuoteVideo.tsx       Composición: frase + autor sobre fondo con música
  DataVersus.tsx       (componente no registrado en Root)
  HelloWorld/          (componentes de ejemplo, no registrados en Root)
public/
  piano.mp3            Música de fondo de QuoteVideo
  background.jpg       Imagen de fondo
  music/ videos/ asmr/ Assets de audio/video
Dockerfile             Chrome + tini + tsx
remotion.config.ts     Config de Remotion (jpeg, overwrite)
```

## Composición `QuoteVideo`

| Prop | Tipo | Default |
|---|---|---|
| `id` | — | `QuoteVideo` |
| `width` × `height` | — | `1080×1920` (vertical) |
| `durationInFrames` | — | `360` |
| `fps` | — | `30` en `Root.tsx` (el server lo fuerza a `24`) |
| `text` | string | `"El éxito es ir de fracaso en fracaso."` |
| `author` | string (opcional) | `"Winston Churchill"` |

Usa `public/piano.mp3` como audio de fondo y `public/background.jpg` como imagen.

## Notas y limitaciones

- El servidor **siempre** renderiza la composición `QuoteVideo` y **fuerza** `durationInFrames = 360` a **24 fps** (`FPS` en `server.ts`), sin importar el `fps` declarado en `Root.tsx`.
- El campo `type` solo se usa para el log; no selecciona distintas composiciones.
- `DataVersus` y los componentes de `HelloWorld/` están en el repo pero **no están registrados** en `Root.tsx`, así que no se pueden renderizar vía la API.
- La concurrencia de render se limita a **2** (`Math.min(cpus, 2)`) para no agotar recursos/PIDs en el contenedor.
- El servidor monta `express.static(os.tmpdir())` en `/tmp`, lo que **expone el directorio temporal del contenedor** por HTTP. Se usa para que Remotion lea audios temporales; conviene restringirlo o servirlo desde un subdirectorio acotado antes de exponer esto públicamente.
- Un render bloquea recursos por petición; no hay cola ni límite de tasa, así que para uso intensivo conviene añadir una cola/worker aparte.

## Stack

- **Remotion 4** — renderizado de video programático con React.
- **Express 5** — servidor HTTP.
- **TypeScript** · **React 19** · **Zod**.
- **Docker** — Chromium headless + `tini`.

## Licencia

Sin licencia (`UNLICENSED` en `package.json`). Uso privado.
