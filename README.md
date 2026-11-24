# Team Elegantísimos · Coronas y lentes

Experiencia de cámara web con ocho filtros: los cuatro logos en versión corona y lentes. Todos se activan al sonreír. La detección y las fotos se procesan en el dispositivo; la galería usa almacenamiento local del navegador.

El selector inferior es un carrusel circular: deslizar, tocar una miniatura, usar flechas del teclado o desplazar horizontalmente con trackpad. No tiene extremos. El botón central muestra el filtro seleccionado y captura cuando hay una sonrisa activa. Hay acceso a galería y cambio de cámara a los lados de la barra inferior.

La opción de instructores ya no se ofrece y no se cargan sus imágenes ni el modelo de seguimiento corporal. Los módulos y recursos de versiones anteriores se conservan en el repositorio, sin uso desde la interfaz actual.

Motor: MediaPipe FaceLandmarker 0.10.35, hasta tres rostros con sonrisa independiente. Hay fallback de GPU a CPU y dos CDN. Captura y exportación mantienen el sello de la marca.

Desarrollo: servir esta carpeta por HTTP en localhost o HTTPS. Pruebas: node --test tests/*.test.js.

Antes de entregar en un evento: comprobar cámara, sonrisa, deslizado circular, ambos extremos del recorrido, giro de cámara, descarga y compartir en Safari/iPhone y Chrome/Android.
