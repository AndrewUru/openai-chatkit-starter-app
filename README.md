# Laboratorio IA · ChatKit + WordPress

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![NextJS](https://img.shields.io/badge/Built_with-NextJS-blue)
![OpenAI API](https://img.shields.io/badge/Powered_by-OpenAI_API-orange)

Experimento en Next.js 15 que genera y publica artículos en WordPress usando la API de OpenAI. La UI (en español) está orientada al equipo de El Salto Web y mantiene en el repositorio los endpoints de ChatKit para embebidos opcionales.

## Estado actual
- Generador y publicador en `/` y `/publish` que pide un tema, llama a `/api/workflow?key=<PUBLIC_EXPERIMENT_KEY>` y muestra la vista previa HTML, la barra de progreso y el enlace final.
- `/api/workflow` valida la clave pública, usa `gpt-4o-mini` para producir HTML estilizado (clase `.ia-generated` + `IA_GENERATED_INLINE_STYLES`), pide una imagen a `gpt-image-1` y publica en WordPress si hay credenciales (categoría 20, estado `publish`); si faltan credenciales responde igual pero con `wordpressUrl: null`.
- `/api/publish` convierte texto plano/markdown corto en HTML, crea un post en WordPress y deja el estado en `draft` por defecto.
- Infraestructura ChatKit lista para usar el web component: `/api/create-session` genera el `client_secret`, `/api/chatkit-script` proxya `chatkit.js`, con el componente `components/ChatKitPanel.tsx` y la configuración base en `lib/config.ts`.
- Páginas `/docs` y `/flujo` explican el uso y el pipeline dentro de la propia app.

## Requisitos rápidos
- Node.js 18 o superior.
- Clave de OpenAI con acceso a `gpt-4o-mini` y `gpt-image-1`.
- WordPress con REST API, usuario/app password y categoría (ID 20 por defecto en la demo).
- (Opcional) Workflow publicado de ChatKit si vas a embebir el widget.

## Variables de entorno
Crea un `.env.local` con algo parecido:

```bash
OPENAI_API_KEY=sk-...
PUBLIC_EXPERIMENT_KEY=demo2025
NEXT_PUBLIC_PUBLIC_EXPERIMENT_KEY=demo2025
WORDPRESS_BASE_URL=https://tu-sitio.com
WORDPRESS_USERNAME=editor
WORDPRESS_APP_PASSWORD=app-password
NEXT_PUBLIC_CHATKIT_WORKFLOW_ID=wrk_...
# Opcionales
OPENAI_API_BASE=https://api.openai.com
CHATKIT_API_BASE=https://api.openai.com
CHATKIT_SCRIPT_SOURCE=http://localhost:3000/chatkit.js
NEXT_PUBLIC_CHATKIT_SCRIPT_URL=/api/chatkit-script
```

Notas rápidas:
- `PUBLIC_EXPERIMENT_KEY` es la llave que valida `/api/workflow`; debe coincidir con `NEXT_PUBLIC_PUBLIC_EXPERIMENT_KEY` que envía el cliente (el UI usa `demo2025` como valor de fallback).
- Si faltan variables de WordPress se omite la publicación y `wordpressUrl` será `null`.
- `OPENAI_API_BASE` y `CHATKIT_API_BASE` permiten apuntar a endpoints propios si los necesitas.
- `CHATKIT_SCRIPT_SOURCE`/`NEXT_PUBLIC_CHATKIT_SCRIPT_URL` controlan de dónde se descarga `chatkit.js` para el componente web.
- `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` se usa al crear sesiones de ChatKit.

## Puesta en marcha
1) Instala dependencias: `npm install`.
2) Arranca en local: `npm run dev` y abre `http://localhost:3000`; ingresa un tema y sigue el progreso mientras se genera el HTML y se publica en WordPress (si hay credenciales).
3) Build de producción: `npm run build`. Añade tu dominio al allowlist de OpenAI si vas a usar ChatKit en producción.

## Flujo de generación y publicación
- La UI envía `{ "input_as_text": "<tema>" }` a `/api/workflow?key=<PUBLIC_EXPERIMENT_KEY>`.
- `generateStyledArticle` compone el HTML con `gpt-4o-mini` y lo envuelve con `IA_GENERATED_INLINE_STYLES` y la clase `.ia-generated`.
- `generateImage` solicita una imagen a `gpt-image-1`; `publishToWordPress` sube la imagen, crea el post (estado `publish`, categoría 20) y devuelve el enlace.
- La respuesta JSON incluye `article` (HTML), `imageUrl` y `wordpressUrl`; la UI muestra la vista previa y el botón para abrir el artículo publicado.

## Personalización
- Ajusta el prompt `STYLED_ARTICLE_PROMPT` y los estilos inline en `app/api/workflow/route.ts` (mantén en sync con `.ia-generated` en `app/globals.css`).
- Cambia categoría/estado de WordPress en `publishToWordPress` y en `app/api/publish/route.ts`.
- Modifica el copy/estados del formulario en `components/ArticleGenerator.tsx`.
- Si usas el widget de ChatKit, personaliza tema y prompts en `lib/config.ts` y los handlers en `components/ChatKitPanel.tsx`.

## Rutas y archivos clave
- UI: `app/App.tsx`, `app/page.tsx`, `app/publish/page.tsx`, `components/ArticleGenerator.tsx`, `components/Navbar.tsx`.
- API: `app/api/workflow/route.ts`, `app/api/publish/route.ts`, `app/api/create-session/route.ts`, `app/api/chatkit-script/route.ts`.
- Contenido de apoyo: `app/docs/page.tsx`, `app/flujo/page.tsx`, estilos `app/globals.css`.

## Licencia
[MIT](LICENSE)
