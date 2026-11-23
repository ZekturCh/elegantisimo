# Abrazo con instructores · Team Elegantísimos

Reemplaza en la experiencia pública el carrusel de efectos por Instructor 1 / Instructor 2. El botón Lado permite invertir la colocación del acompañante. Una persona por fotografía.

El seguimiento usa MediaPipe Pose Landmarker Lite (0.10.35), ambos hombros y una máscara de segmentación. La escala, posición e inclinación se suavizan según el tiempo transcurrido. El acompañante se dibuja detrás del usuario y su mano se repone delante del hombro. Si no hay hombros fiables o máscara, se oculta y se bloquea la captura. La cámara frontal y la máscara comparten la misma transformación de espejo y recorte. Las fotos se procesan localmente.

Los dos PNG transparentes en assets/instructors son adaptaciones con IA de las referencias proporcionadas para el proyecto. La pose y el brazo se sintetizaron; revisar el parecido y la anatomía antes de aprobarlos. La calibración de hombros/mano está en src/companion.js. No se publican los retratos originales ni el chat en el repositorio.

Desarrollo: servir esta carpeta por HTTP en localhost o HTTPS. Abrir index.html. Pruebas: node --test tests/companion.test.js tests/faces.test.js tests/renderer.test.js.

Antes de publicar: probar en Safari/iPhone y Chrome/Android, seleccionar ambos instructores, cambiar de lado, acercarse/alejarse, inclinar los hombros, salir y volver a entrar, girar la cámara y guardar/compartir la foto. La máscara puede fallar con manos cruzadas, pelo fino, poca luz o varias personas; usar encuadre individual frontal. Es un montaje 2D anclado al cuerpo, no un avatar volumétrico ni una simulación física del abrazo.

Los helpers de efectos faciales y sus pruebas se conservan como utilidades heredadas; la interfaz activa ya no los utiliza.

API de referencia: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web
Compatibilidad: requiere aceleración gráfica (GPU/WebGL). La ruta CPU falló al leer las máscaras de segmentación en las versiones verificadas; se evita ese fallback. Verificado con foto estática en Chrome/GPU, pendiente cámara en teléfonos.
