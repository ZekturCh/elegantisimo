# TEAM ELEGANTÍSIMOS · MASTER CLASS PAOLO — FILTRO WEBAR (MVP)

Demo técnica lista para alojamiento estático. **No se ha validado aún físicamente en iPhone y Android**: comprueba las cámaras, el tracking y los flujos de guardado en ambos sistemas antes de lanzar el QR en un evento.

## Incluye

- Seguimiento facial con **MediaPipe Face Landmarker** y *blendshapes* (sin backend).
- Sin textos en los pómulos: se retiraron «Zum» / «baa!» a pedido del cliente.
- Selector circular de **3 efectos** al sonreír: Emblema lila (caligrafía y cintas, sin corona de puntas), Neblina elegante y Elegancia tricolor (fucsia/verde/turquesa). El botón cambia **1 → 2 → 3 → 1**, con activación independiente por rostro.
- Marco de curvas lilas. El logotipo oficial se muestra discretamente en la esquina superior derecha del visor como HTML y **no entra en la foto**; al capturar se estampa un sello independiente del logotipo y el lema «Tendencia y elegancia» en el PNG.
- Cámaras frontal (previsualización espejo, con texto NO invertido) y trasera.
- Captura real de foto compuesta (cámara + filtro + marca) a PNG.
- Descarga Android/desktop, share sheet en iOS con alternativa de pulsación prolongada para guardar.
- Galería privada local en **IndexedDB**, máximo 20 fotografías y sin subida a servidor.
- Ayuda «¿Usas iPhone?» para copiar dirección y abrir manualmente en Safari.

## Puesta en marcha

### Pruebas de ordenador

```bash
python -m http.server 8000
```

Abre `http://localhost:8000` en el navegador. **No abras index.html mediante file://** (los módulos ES o getUserMedia pueden fallar).

### Para un teléfono

Sube la carpeta sin cambios a **GitHub Pages**, **Firebase Hosting** o cualquier servidor estático con **HTTPS**. Abre el enlace HTTPS desde el teléfono. Si estás usando un servidor local en otro dispositivo sin HTTPS, la cámara puede estar bloqueada.

La primera carga necesita Internet para descargar MediaPipe, su runtime WASM y el modelo oficial alojado por Google. Las imágenes de la cámara se procesan **en el navegador**, sin subirlas a este proyecto; consulta políticas del proveedor de la librería sobre telemetría. El sitio no dispone de endpoints de envío de fotos.

### Personalización

- `src/renderer.js`: `drawFrame` (marco), `drawFaceEffect` (tres animaciones), `drawPhotoBrand` (solo foto); `src/faces.js` (gestión de 3 rostros y sonrisas independientes).
- `src/faces.js`: `makeSmileGate(.46,.29,170)`: umbrales de activación/desactivación y tiempo de confirmación; ajústalos con personas reales, en distintas luces y teléfonos.
- `style.css`: interfaz y botones.
- `assets/team-logo.png`: marca del anuncio recibido.
- `src/gallery.js`: límite de 20 fotos / IndexedDB.

## Notas de compatibilidad

- Safari iOS **no puede ser abierto forzosamente** desde Chrome o un webview por código web. Se muestra guía para copiar el enlace.
- Ninguna web normal puede escribir directamente en la fototeca iOS en silencio. Se prioriza la hoja de compartir o pulsación prolongada para «Guardar en Fotos».
- IndexedDB puede borrarse al borrar datos del navegador o por gestión de almacenamiento; **no equivale a una galería permanente de Fotos**. El usuario debe exportar la captura.
- La cámara posterior se ofrece con `facingMode: environment`; algunos navegadores pueden denegarla o escoger otro dispositivo. El seguimiento puede incluir hasta 3 rostros en el mismo encuadre; en teléfonos lentos podría ser necesario reducir ese máximo.
- Es importante **no mostrar el rostro de menores sin autorización**. Las fotos quedan en el dispositivo; no se implementó analítica biométrica ni reconocimiento de identidad.
- En dispositivos lentos, FaceLandmarker puede bloquear momentáneamente el hilo principal durante inferencia. Se limita a ~8–9 inferencias por segundo y un máximo de 3 rostros. La detección simultánea puede reducir FPS y requiere validación física antes del evento.

## Testing

```bash
npm test
```

Cobertura de geometría, espejo, carrusel en bucle, marca diferenciada entre visor y foto, tres efectos, sonrisa independiente por persona y reordenamiento de rostros; adicionalmente son **obligatorias las pruebas físicas** de Safari/iPhone y Chrome/Android antes del despliegue público.

## Notas de la revisión v3
- Los cuatro controles móviles quedan agrupados abajo: **Fotos / Efectos / Capturar / Girar**.
- El logo de vista previa es solo UI y no se exporta; el logo en la foto se añade a una copia del canvas en el momento de capturar.
- No se modifica el motor MediaPipe ni se añaden videos, fuentes externas, bibliotecas 3D o archivos adicionales de efectos. Se conserva la carga de modelo de la versión previa.
- El carrusel cambia el mismo efecto para todos los rostros visibles; cada persona activa su aparición independientemente al sonreír.
- Prueba la colocación de los efectos con personas altas, cabezas cerca del borde superior y tres personas a distinta distancia antes de entregar el filtro.
