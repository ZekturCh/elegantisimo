# TEAM ELEGANTÍSIMOS · MASTER CLASS PAOLO — FILTRO WEBAR (MVP)

Demo técnica lista para alojamiento estático. **No se ha validado aún físicamente en iPhone y Android**: comprueba las cámaras, el tracking y los flujos de guardado en ambos sistemas antes de lanzar el QR en un evento.

## Incluye

- Seguimiento facial con **MediaPipe Face Landmarker** y *blendshapes* (sin backend).
- Sin textos en los pómulos: se retiraron «Zum» / «baa!» a pedido del cliente.
- Corona lila «ELEGANTÍSIMOS» al sonreír, con animación ligera de neblina y activación individual por persona.
- Marco de curvas lilas con discretos acentos fucsia, verde y turquesa; logotipo oficial más pequeño y lema «Tendencia y elegancia».
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

- `src/renderer.js`: `drawFrame` (marco), `drawCrown` (corona y neblina); `src/faces.js` (gestión de 3 rostros y sonrisas independientes).
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

Cobertura de geometría, espejo, sonrisa independiente por persona y reordenamiento de rostros; adicionalmente son **obligatorias las pruebas físicas** de Safari/iPhone y Chrome/Android antes del despliegue público.
