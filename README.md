# Abrazo con instructores · Team Elegantísimos

La experiencia tiene tres modos: Abrazo (Instructor 1 / Instructor 2), Coronas y Lentes. El botón Lado permite invertir la colocación del acompañante. El abrazo es para una persona por fotografía.

El seguimiento usa MediaPipe Pose Landmarker Lite (0.10.35), ambos hombros y una máscara de segmentación. La escala, posición e inclinación se suavizan según el tiempo transcurrido. El acompañante se dibuja detrás del usuario y su mano se repone delante del hombro. Si no hay hombros fiables o máscara, se oculta y se bloquea la captura. La cámara frontal y la máscara comparten la misma transformación de espejo y recorte. Las fotos se procesan localmente.

Los dos PNG transparentes en assets/instructors son adaptaciones con IA de las referencias proporcionadas para el proyecto. La pose y el brazo se sintetizaron; revisar el parecido y la anatomía antes de aprobarlos. La calibración de hombros/mano está en src/companion.js. No se publican los retratos originales ni el chat en el repositorio.

Desarrollo: servir esta carpeta por HTTP en localhost o HTTPS. Abrir index.html. Pruebas: node --test tests/companion.test.js tests/faces.test.js tests/renderer.test.js tests/logo-effects.test.js.

Antes de publicar: probar en Safari/iPhone y Chrome/Android, seleccionar ambos instructores, cambiar de lado, acercarse/alejarse, inclinar los hombros, salir y volver a entrar, girar la cámara y guardar/compartir la foto. La máscara puede fallar con manos cruzadas, pelo fino, poca luz o varias personas; usar encuadre individual frontal. Es un montaje 2D anclado al cuerpo, no un avatar volumétrico ni una simulación física del abrazo.

Coronas y Lentes permiten elegir los cuatro logos originales del chat. Se proyectan usando ambos ojos y la frente y se activan por sonrisa independiente para hasta tres rostros. La sonrisa tiene umbrales de entrada/salida distintos y retardo mínimo para evitar parpadeos. Los lentes llevan un logo en cada cristal; las coronas llevan el logo centrado. La composición screen omite el fondo negro de los logos sin redibujar la marca. Solo se ejecuta el seguimiento correspondiente al modo seleccionado; el otro modelo queda en memoria para cambiar rápidamente. Los helpers de ilustraciones faciales antiguas se conservan como utilidades heredadas.

API de referencia: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker?tab=Web
Compatibilidad: requiere aceleración gráfica (GPU/WebGL). La ruta CPU falló al leer las máscaras de segmentación en las versiones verificadas; se evita ese fallback. Verificado con foto estática en Chrome/GPU, pendiente cámara en teléfonos.
Corrección de oclusión: la máscara se compone directamente con DrawingUtils en el mismo contexto WebGL del modelo. Se evita getAsFloat32Array, que devolvía ceros en el equipo probado. Una máscara vacía o completamente opaca ya no habilita el abrazo ni la captura. Se verifican la silueta y la superposición del usuario sobre el brazo, además de las transformaciones de espejo y recorte. Pruebas: node --test tests/*.test.js (16 tests).
Ajuste de muñeca: la capa frontal conserva la mano y el puño completos. La conexión del brazo usa una máscara alfa gradual en vez de un recorte rectangular duro. La geometría es compartida con el cuerpo y se mantiene al cambiar de lado.
