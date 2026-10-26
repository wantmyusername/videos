# Videos API

Renderiza videos verticales 1080x1920 con Remotion. Expone una API REST para que **n8n** (o cualquier servicio) envíe los datos y reciba el `.mp4` renderizado.

## Composiciones

| ID | Descripción |
|----|-------------|
| `FlightVideo` | Documental de vuelo con globo 3D o mapa regional |

`FlightVideo` elige globo 3D o mapa regional según `mapMode`:

- `auto`: mapa regional si la ruta mide menos de 2500 km.
- `globe`: siempre globo 3D.
- `regional`: siempre mapa regional.

El mapa regional puede usar una imagen estática de Mapbox (`mapImageUrl` + `mapBbox`) y Remotion solo dibuja la ruta y el avión encima. Si no se envía imagen, usa el mapa SVG offline de respaldo con Natural Earth (fronteras, estados, lagos, ríos y etiquetas).

## Mapa estático

`POST /map` genera la imagen de la ruta con Mapbox, la guarda en `SHARED_DIR/maps` y devuelve la URL local junto con el `bbox` para que Remotion alinee la ruta.

```json
{
  "origin": { "lat": 20.6801, "lng": -105.2544 },
  "destination": { "lat": 20.5218, "lng": -103.3112 },
  "style": "mapbox/navigation-night-v1"
}
```

```json
{
  "mapImageUrl": "http://localhost:8000/shared/maps/map-abc123.png",
  "mapBbox": [-106.32, 17.17, -102.24, 23.96],
  "mapAttribution": "© Mapbox © OpenStreetMap contributors",
  "mapStyle": "mapbox/navigation-night-v1",
  "mapWidth": 1440,
  "mapHeight": 2560,
  "cached": true
}
```

La imagen se pide en `720x1280@2x` y se cachea por ruta/estilo. n8n solo recibe el JSON y lo mezcla con los datos del vuelo.

## API

### `POST /render`

**Vuelo (FlightVideo):**

```json
{
  "type": "flight",
  "compositionId": "FlightVideo",
  "flight_number": "Y4 821",
  "airline": "Volaris",
  "origin": {
    "city": "Puerto Vallarta",
    "country": "México",
    "iata": "PVR",
    "lat": 20.6801,
    "lng": -105.2544
  },
  "destination": {
    "city": "Guadalajara",
    "country": "México",
    "iata": "GDL",
    "lat": 20.5218,
    "lng": -103.3112
  },
  "distance_km": 202,
  "flight_time_formatted": "0h 55m",
  "title_overlay": "VALLARTA - GUADALAJARA",
  "subtitle_overlay": "La ruta entre la costa y la Perla de Occidente",
  "script": "Texto de la narración...",
  "audioUrl": "https://tu-servidor/shared/narracion.mp3",
  "words": [
    { "word": "Hola", "start": 0.0, "end": 0.4 }
  ],
  "totalFrames": 900,
  "mapStyle": "night",
  "mapMode": "auto",
  "mapImageUrl": "http://localhost:8000/shared/maps/map-abc123.png",
  "mapBbox": [-106.32, 17.17, -102.24, 23.96],
  "mapAttribution": "© Mapbox © OpenStreetMap contributors"
}
```

`type: "flight"` es equivalente a `compositionId: "FlightVideo"`. Para preview en Studio usa `FlightVideoPreview`.

**Campos opcionales:**

- `audioUrl`: narración TTS. Debe ser una URL pública o servida desde `/shared`.
- `words`: timestamps de Whisper para subtítulos karaoke. Si se omite, no se muestran subtítulos.
- `totalFrames`: duración base en frames (30 FPS). El video final añade 2 s para el end card.
- `mapStyle`: `day` o `night`. Default `day`.
- `mapMode`: `auto`, `globe` o `regional`. Default `auto`.
- `mapImageUrl`: imagen estática para el mapa regional. Se genera con `POST /map`.
- `mapBbox`: `[minLng, minLat, maxLng, maxLat]` de la imagen. Necesario para alinear ruta y avión.
- `mapAttribution`: atribución que se muestra en el video.
- `whiteNoiseStartSeconds`: segundo en que entra `Sonido_Blanco`. Default `1`.

**Respuesta:** archivo `.mp4` listo para descargar.

### `GET /health`

Devuelve las composiciones disponibles y sirve para verificar que el motor está vivo.

```json
{
  "ok": true,
  "compositionIds": ["FlightVideo"],
  "mapboxConfigured": true
}
```

### Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `8000` | Puerto del servidor |
| `REMOTION_GL` | `angle` | Backend WebGL (`swangle` en servidores sin GPU) |
| `SHARED_DIR` | `/shared` | Carpeta montada y servida en `/shared` para audios y mapas |
| `PUBLIC_BASE_URL` | URL de la petición | Base para convertir `audioUrl` y `mapImageUrl` relativas en absolutas |
| `MAPBOX_ACCESS_TOKEN` | — | Token de Mapbox para `POST /map` |
| `MAPBOX_STYLE` | `mapbox/navigation-night-v1` | Estilo de Mapbox para el mapa regional |
| `MAPBOX_PADDING` | `0.55` | Margen alrededor de la ruta para la cámara del mapa |

## Flujo con n8n

Workflow listo para importar: [`n8n/flight-video-remotion.json`](n8n/flight-video-remotion.json). Incluye selección aleatoria de vuelo, generación del guion con OpenAI, mapa estático para rutas regionales y render en Remotion.

1. Elegir un vuelo (número, aerolínea, origen, destino y coordenadas).
2. Generar `title_overlay`, `subtitle_overlay` y `script` con el LLM.
3. Generar el audio TTS y subirlo a un volumen compartido o a S3/R2.
4. Si `distance_km < 2500`, llamar `POST /map` y mezclar `mapImageUrl`, `mapBbox` y `mapAttribution` con el payload.
5. Enviar `POST /render` con `type: "flight"`.
6. Configurar el nodo HTTP Request con timeout de `900000` ms. El primer render empaqueta el proyecto y tarda más.

El workflow ya incluye el nodo `¿Es regional?`, `Obtener mapa` y `Unir mapa`. Ajusta la URL base `https://videos.appsengine.us` a tu dominio o a `http://localhost:8000` en local.

Para subtítulos, transcribir el audio con Whisper y enviar `words` (`start`/`end` en segundos) y `totalFrames` (`duración_segundos * 30`).

## Docker

```bash
docker build -t videos-api .
docker run -p 8000:8000 \
  -e MAPBOX_ACCESS_TOKEN=tu_token \
  -e PUBLIC_BASE_URL=https://tu-dominio \
  -v /ruta/compartida:/shared \
  videos-api
```

O desde Easypanel: clona el repo y haz deploy. El contenedor incluye `libgl`, `xvfb` y usa `REMOTION_GL=swangle` para renderizar WebGL sin GPU.

## Desarrollo local

```bash
npm install --legacy-peer-deps
npm run dev        # Remotion Studio (UI de preview)
npx tsx server.ts  # Servidor API
npm run lint       # ESLint + TypeScript
```

## Stack

- **Remotion 4** — renderizado de video programático con React
- **Three.js** — globo 3D de los vuelos
- **Express** — servidor HTTP
- **TypeScript**
- **Docker** — contenedor con Chrome headless y tini para manejo de procesos
