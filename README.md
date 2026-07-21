# Videos API

Renderiza videos automáticos con frases mediante Remotion. Expone una API REST para que **n8n** (o cualquier servicio) envíe texto y reciba el video renderizado.

## Cómo funciona

1. Llega un `POST /render` con el texto y autor
2. Remotion compila el video con el texto superpuesto
3. Descargas el `.mp4` desde la respuesta

## API

### `POST /render`

```json
{
  "text": "Frase del video",
  "author": "Autor de la frase"
}
```

**Respuesta:** archivo `.mp4` listo para descargar.

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `8000` | Puerto del servidor |

## Docker

```bash
docker build -t videos-api .
docker run -p 8000:8000 videos-api
```

O desde Easypanel: clona el repo y haz deploy.

## Desarrollo local

```bash
npm install --legacy-peer-deps
npm run dev        # Remotion Studio (UI de preview)
npx tsx server.ts  # Servidor API
```

## Stack

- **Remotion 4** — renderizado de video programático con React
- **Express** — servidor HTTP
- **TypeScript**
- **Docker** — contenedor con Chrome headless y tini para manejo de procesos
