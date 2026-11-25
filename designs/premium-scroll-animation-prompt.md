# Prompt maestro: webs premium con imagen hiperrealista y animación ligada al scroll

Guía y prompts para construir sitios de gama alta (proyectos de 10.000 EUR o más) cuyo
encabezado es una escena hiperrealista que avanza y retrocede con el scroll.

No es código del sitio: nada de este archivo lo lee el build. Es el método, escrito para
poder repetirlo en hlorenzoz.com y en proyectos de clientes.

## 1. El método en una página

La técnica es la que usa Apple en sus páginas de producto, hoy accesible con IA generativa:

1. **Una imagen fija hiperrealista** que funciona sola como encabezado. Si la composición
   no funciona quieta, el movimiento no la arregla.
2. **Un video corto generado DESDE esa imagen** (es su primer fotograma): un solo plano
   continuo, sin cortes, de 6 a 8 segundos.
3. **El video se despieza en fotogramas** (entre 100 y 200) y se descarta el MP4.
4. **Un `<canvas>` pinta el fotograma que corresponde a la posición del scroll.** Bajar
   avanza, subir retrocede, parar congela. No hay reproductor de video.
5. **El texto vive encima**, en HTML real, y aparece por tramos del recorrido.

Por qué fotogramas y no un `<video>` al que se le mueve `currentTime`: el video solo puede
saltar con precisión a sus fotogramas clave, así que avanza a tirones y al frenar a veces
retrocede. Una secuencia de imágenes es exacta en los dos sentidos.

Cuándo NO usarlo: en páginas cuyo trabajo es informar rápido (legales, blog, fichas de
servicio largas). Es para la portada, un lanzamiento o una página de marca. Una sola
secuencia por página, y en el encabezado.

## 2. Presupuestos que definen "profesional"

Un sitio de este precio no puede ser lento. Estos números son requisitos, no aspiraciones.

| Concepto | Límite |
| :--- | :--- |
| LCP (móvil, 4G) | menos de 2,5 s. El LCP es el PRIMER fotograma, servido como `<img>` |
| CLS | 0. El encabezado reserva su alto desde el primer render |
| INP | menos de 200 ms. Nada de trabajo pesado en el evento de scroll |
| Lighthouse rendimiento (móvil) | 90 o más |
| Peso de la secuencia, escritorio | 6 MB como máximo (unos 120 a 150 fotogramas a 1600 px) |
| Peso de la secuencia, móvil | 2,5 MB como máximo (60 a 75 fotogramas a 800 px) |
| Peso para pintar el primer fotograma | menos de 150 KB |
| JavaScript de la animación | menos de 5 KB sin librerias |
| Formato | AVIF, con WebP de respaldo |

Reglas de comportamiento, igual de obligatorias:

- **Scroll nativo.** Nunca secuestrar la rueda ni alterar la velocidad del scroll.
- **`prefers-reduced-motion: reduce`** muestra el primer fotograma fijo, sin secuencia.
- **Ahorro de datos o conexión lenta** (`navigator.connection.saveData`, `effectiveType`
  2g/3g): imagen fija.
- **El contenido no depende de la animación.** Todo el texto es HTML legible por
  buscadores, lectores de pantalla y por quien no cargue ni un fotograma.
- **Sin texto dentro de la imagen o el video.** Los modelos lo deforman, y un texto pintado
  no se traduce, no se indexa y no es accesible.

## 3. Paso 1: la imagen fija

Plantilla (se escribe en inglés: los modelos de imagen responden mejor):

```text
Photorealistic cinematic photograph, [SHOT TYPE: wide establishing shot / close-up],
of [SUBJECT AND ACTION], [PLACE], [TIME OF DAY AND LIGHT].
Composition: [WHERE THE SUBJECT SITS], leaving [WHICH AREA] as clean, dark, uncluttered
negative space for a headline.
Palette: [BASE COLOURS OF THE BRAND], with a single accent colour: [ACCENT].
Shot on a full-frame camera, [35mm / 50mm / 85mm] lens at [f/1.4 - f/2.8], natural film
grain, true-to-life textures, hyperrealistic, not illustrated, not 3D rendered.
Aspect ratio 16:9.
Absolutely no text anywhere: no signs, no logos, no letters, no numbers, no user interface,
no watermark.
```

Criterios para aceptarla:

- Deja limpio el espacio donde va el titular, con contraste suficiente para texto blanco
  o negro sin recurrir a un recuadro.
- Un solo color de acento. Una imagen con cinco colores vivos compite con el texto.
- Ninguna mano, cara o letra deformada al ampliar al 100%.
- Tiene una dirección de movimiento evidente (un camino, una puerta, una profundidad):
  es lo que el video va a recorrer.
- Se piden tres versiones y se elige; se corrige con instrucciones concretas ("mueve el
  sujeto a la derecha", "plano más distante"), no regenerando a ciegas.

Para móvil se genera una variante vertical (9:16) de la misma escena. Recortar la
horizontal casi siempre deja al sujeto fuera.

## 4. Paso 2: el video

Se genera con un modelo de imagen a video (Veo, Kling, Runway) usando la imagen del paso 1
como PRIMER fotograma. Plantilla:

```text
Start exactly on the provided image as the first frame.
One single continuous shot, no cuts, no transitions, no fades.
Camera: [slow push-in / descent / forward dolly] at a constant, smooth speed from start to
finish, no shake, no sudden acceleration.
Action: [WHAT CHANGES DURING THE SHOT, IN ORDER].
At the midpoint, [WHAT MUST BE VISIBLE THEN: it will line up with a content section].
End on [FINAL COMPOSITION], holding still for the last half second.
Keep the subject's appearance, the lighting and the colour palette identical throughout.
Photorealistic, cinematic, natural motion blur.
No text, no captions, no logos, no user interface. No audio.
16:9, 8 seconds.
```

Lo que distingue un resultado profesional:

- **Velocidad de cámara constante.** El usuario controla el tiempo con el scroll: una
  aceleración dentro del video se siente como un tirón que no provoco.
- **Un tramo por generación.** Para recorridos largos se genera un tramo, se extrae su
  ÚLTIMO fotograma y se usa como primer fotograma del siguiente. Si un tramo sale mal se
  rehace solo ese.
- **El punto medio se planifica.** Se decide antes que debe verse cuando aparece cada
  bloque de texto, y se escribe en el prompt.
- **El final se queda quieto.** El último fotograma es el que queda en pantalla al terminar
  el recorrido.
- **Para un fondo en bucle** (sin scroll): se usa la misma imagen como primer y último
  fotograma, cámara fija y solo movimiento ambiental (viento, agua, luz). Nada que cruce
  el encuadre, porque al reiniciar el bucle se nota.

## 5. Paso 3: de video a fotogramas

```bash
# Escritorio: 150 fotogramas a 1600 px de ancho
ffmpeg -i hero.mp4 -vf "fps=150/8,scale=1600:-2" -q:v 2 frames/desktop/%04d.png

# Móvil: 75 fotogramas a 800 px, desde la variante vertical
ffmpeg -i hero-mobile.mp4 -vf "fps=75/8,scale=800:-2" -q:v 2 frames/mobile/%04d.png
```

Después cada PNG se convierte a AVIF (calidad cercana a 50) y a WebP (calidad cercana a
70), y se sube al CDN con cache inmutable (`Cache-Control: public, max-age=31536000,
immutable`). Los nombres llevan numeración fija (`0001.avif`) para que el script los calcule
sin un listado.

Si el peso total supera el presupuesto se baja primero el NÚMERO de fotogramas, después la
calidad y por último el ancho. Menos de 60 fotogramas en escritorio ya se ve a saltos.

## 6. Paso 4: el prompt de implementación

Este es el prompt que se entrega al agente de código. Los corchetes se rellenan por proyecto.

```text
Implementa el encabezado animado de [PROYECTO] como una secuencia de imágenes ligada al
scroll. Es un sitio de gama alta: el rendimiento y la accesibilidad son requisitos, no
mejoras posteriores.

ACTIVOS
- Secuencia de escritorio: [N] fotogramas en [URL_BASE]/desktop/0001.avif ... (y .webp)
- Secuencia móvil: [M] fotogramas en [URL_BASE]/mobile/0001.avif ... (y .webp)
- Relación de aspecto: 16:9 en escritorio, 9:16 en móvil.

ESTRUCTURA
- Una sección contenedora con un alto de [300]vh. Dentro, un bloque `position: sticky;
  top: 0` de `100svh` que contiene el canvas y las capas de texto.
- El PRIMER fotograma es un `<img>` real dentro de un `<picture>` (AVIF, WebP), con
  `fetchpriority="high"`, ancho y alto declarados y `alt` descriptivo. Es el LCP. El canvas
  se superpone y toma el relevo cuando está listo; si el JavaScript falla, queda la imagen.
- El titular, el párrafo y el botón son HTML real encima del canvas, nunca pintados en el.

MOTOR DE LA ANIMACIÓN
- JavaScript propio, sin librerias, por debajo de 5 KB.
- Progreso = posición del scroll dentro del contenedor, de 0 a 1, acotado. Fotograma =
  redondeo de progreso por (total - 1). Al llegar al final se queda en el último fotograma.
- Un único listener de scroll pasivo que solo guarda el progreso objetivo. El dibujo ocurre
  en `requestAnimationFrame`, con interpolación suave (lerp) hacia el objetivo, y SOLO
  cuando cambia el índice del fotograma.
- El canvas se dimensiona con `devicePixelRatio` limitado a 2 y se pinta en modo "cover",
  con un punto focal configurable para que el sujeto no se recorte.
- Un IntersectionObserver detiene el bucle cuando el encabezado sale de pantalla.

CARGA
- No bloquear nada: la página es usable con solo el primer fotograma.
- Carga progresiva en dos pasadas: primero 1 de cada 8 fotogramas, después el resto. Si el
  fotograma pedido no ha llegado, se pinta el más cercano ya cargado.
- Decodificar fuera del hilo principal (`createImageBitmap` o `img.decode()`).
- Elegir la secuencia móvil con `matchMedia`, y AVIF o WebP con detección de soporte.
- Empezar a cargar la secuencia cuando el navegador esta libre (`requestIdleCallback`),
  nunca antes del LCP.

TEXTO SOBRE LA ESCENA
- Cada bloque de texto tiene un tramo de progreso en el que es visible (por ejemplo 0 a
  0,15 para el titular). Entra y sale con opacidad y un desplazamiento vertical corto.
- Legibilidad con un degradado oscuro sutil detras del texto. `backdrop-filter` solo en
  superficies pequeñas: sobre un canvas a pantalla completa es caro.
- Tamaños de letra con `clamp()`.

ACCESIBILIDAD Y RESPALDO
- `prefers-reduced-motion: reduce`: no se carga la secuencia; imagen fija y todo el texto
  visible sin animación.
- `saveData` o conexión 2g/3g: imagen fija.
- El canvas lleva `aria-hidden="true"`; el significado esta en el HTML.
- No se toca el scroll nativo: sin secuestro de rueda ni scroll suavizado por JavaScript.
- Navegable con teclado: el botón del encabezado es alcanzable y visible al recibir foco.

CRITERIOS DE ACEPTACIÓN
- Lighthouse móvil: rendimiento 90 o más, accesibilidad 100.
- LCP menor de 2,5 s, CLS 0, INP menor de 200 ms.
- Sin tirones al hacer scroll rápido en un móvil de gama media.
- Subir vuelve exactamente por los mismos fotogramas.
- Con JavaScript desactivado el encabezado se ve completo y correcto.
- Una prueba automatizada comprueba el respaldo de movimiento reducido y que el primer
  fotograma es una imagen real con `alt`.
```

## 7. Lista de control antes de entregar

- [ ] La imagen fija funciona sola como encabezado.
- [ ] Ningun texto, logo ni cifra dentro de imágenes o video.
- [ ] La velocidad de cámara es constante y el final queda quieto.
- [ ] Hay variante vertical para móvil, no un recorte.
- [ ] La secuencia cumple el presupuesto de peso en escritorio y en móvil.
- [ ] El primer fotograma es un `<img>` con prioridad alta y dimensiones declaradas.
- [ ] Probado con movimiento reducido, con ahorro de datos y sin JavaScript.
- [ ] Probado en Safari de iOS, Chrome de Android y un móvil de gama media.
- [ ] Lighthouse móvil en 90 o más.
- [ ] Las personas generadas por IA no se presentan como clientes ni como equipo reales.

Sobre el último punto: una foto generada es ilustración. Ponerle un nombre, un cargo o una
cita la convierte en un testimonio falso, y eso destruye justo la confianza que un sitio de
este precio vende.

## 8. Aplicación a hlorenzoz.com

Idea del encabezado: una calle de comercios locales al anochecer, todos apagados menos
uno. Al hacer scroll, la cámara avanza hacia ese comercio iluminado y la gente camina hacia
él. Es el mensaje del sitio sin una sola palabra: que te encuentren a ti.

La paleta coincide con el encabezado actual (negro y azul profundo), y el único acento
cálido es la luz del comercio.

### Imagen del encabezado de la home (16:9)

```text
Photorealistic cinematic photograph, wide establishing shot at blue hour just after
sunset, of a quiet high street of small independent local businesses in a European town:
a bakery, a barber shop, a cafe, a flower shop, side by side, seen straight down the street
from eye level in one-point perspective. Every shopfront is dark and closed, EXCEPT ONE
shop in the exact centre of the frame, at the far end of the perspective, whose windows and
open door glow with warm golden light that spills onto wet cobblestones. Three or four
people, seen from behind as small silhouettes, are walking toward that lit shop. The rest
of the image is deep navy blue and near-black: cool ambient light, a dark clear sky filling
the upper half of the frame as clean negative space, subtle mist, realistic reflections on
the wet ground. Only one warm accent colour in the whole image. Shot on a full-frame
camera, 35mm lens, f/2, natural film grain, true-to-life textures, hyperrealistic, not
illustrated, not 3D rendered. Absolutely no text anywhere: shop signs are blank or too dark
to read. No logos, no letters, no numbers, no user interface, no watermark.
```

### Video del encabezado (desde la imagen anterior)

```text
Start exactly on the provided image as the first frame.
One single continuous shot, no cuts, no transitions, no fades.
Camera: a slow, perfectly steady forward dolly straight down the middle of the street
toward the one lit shop, at a constant speed from start to finish, at eye level, no shake.
Action: the dark shopfronts slide past on both sides; the people keep walking calmly toward
the lit shop; the warm light grows and its reflection on the wet cobblestones lengthens.
At the midpoint the lit shop fills about one third of the frame.
End with the glowing doorway and windows filling most of the frame, warm light dominant,
people stepping inside, holding still for the last half second.
Keep the street, the lighting and the colour palette identical throughout: deep navy blue
and near-black with a single warm golden accent.
Photorealistic, cinematic, natural motion blur.
No text, no captions, no readable signs, no logos, no user interface. No audio.
16:9, 8 seconds.
```

### Imagen de la sección de beneficios (4:5). Sustituye a `ai-benefits.webp`

```text
Photorealistic editorial photograph inside a small independent neighbourhood shop in
daylight. The owner, a woman in her forties wearing a simple linen apron, smiles warmly and
naturally while handing a paper bag across a wooden counter to a customer seen from behind
in soft focus. Two more customers wait behind, out of focus. Soft natural window light from
the left, shallow depth of field, 50mm lens at f/1.8, natural skin texture with pores and
fine lines, candid unposed moment, muted warm tones with a hint of cool blue in the
shadows. Hyperrealistic documentary style, not illustrated, not 3D rendered, no plastic
skin. Absolutely no text anywhere: no signs, no labels, no price tags with writing, no
logos, no letters, no numbers, no watermark.
```

### Imagen del encabezado de la página SEO Local (16:9, texto a la izquierda)

```text
Photorealistic cinematic photograph at night on a city street. On the RIGHT third of the
frame, a close over-the-shoulder view of a person's hand holding a smartphone; the screen
is turned away so its content is not visible, only its cool blue-white glow lighting the
fingers and the sleeve of a dark coat. Beyond the phone, far out of focus, the warm golden
lights of a row of small local shopfronts form large soft bokeh circles. The LEFT two
thirds of the frame is deep navy and near-black empty space, clean and uncluttered,
suitable for placing a headline. Cool blue ambient light with a single warm accent from the
shop lights. Full-frame camera, 85mm lens at f/1.4, natural film grain, hyperrealistic, not
illustrated, not 3D rendered. Absolutely no text anywhere: no readable screen, no signs, no
logos, no letters, no numbers, no user interface, no watermark.
```

### Destino en el CDN

Las imágenes fijas siguen el flujo actual: el original va a `assets/hlorenzoz.com/` y
`just images-sync` genera WebP y AVIF y los sube a `cdn.hlorenzoz.com/hlorenzoz.com/`.

La secuencia de fotogramas NO cabe en ese flujo: `scripts/convert-and-map.mjs` convierte
imágenes sueltas, no despieza un video. Hace falta un script propio (tarea #T0030) que
extraiga los fotogramas, los convierta y los suba a
`cdn.hlorenzoz.com/hlorenzoz.com/hero-sequence/{desktop,mobile}/`.

## 9. Referencias

Método tomado de cuatro videos de Rodrigo Olivares (canal "Crea con IA"), revisados el
2026-10-08 a partir de su transcripción y de los documentos de prompts que enlazan:

- Así Creo Webs Animadas Premium con Antigravity: https://www.youtube.com/watch?v=-8j4kYvZha0
- Así Creo Webs Animadas en Minutos con IA: https://www.youtube.com/watch?v=2TMIi2AmmyI
- Así Creo Increíbles Webs Animadas con Gemini + Google Antigravity: https://www.youtube.com/watch?v=i5cCiDREi2M
- Copia mi Método para Crear Increíbles Webs Animadas con IA: https://www.youtube.com/watch?v=n8PT80bHJEM

Lo que esta guía agrega a los videos: los presupuestos de rendimiento, la carga progresiva,
el primer fotograma como imagen real para el LCP, los respaldos de accesibilidad y la
variante móvil. Los videos publican la carpeta de fotogramas tal cual; en un sitio de este
precio eso no alcanza.
