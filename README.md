# Team Elegantísimos · Coronas y lentes

Experiencia de cámara web con ocho filtros: los cuatro logos en versión corona y lentes. Todos se activan al sonreír. La detección y las fotos se procesan en el dispositivo; la galería usa almacenamiento local del navegador.

El selector inferior es un carrusel circular: deslizar, tocar una miniatura, usar flechas del teclado o desplazar horizontalmente con trackpad. No tiene extremos. El botón central muestra el filtro seleccionado y captura cuando hay una sonrisa activa. Hay acceso a galería y cambio de cámara a los lados de la barra inferior.

La opción de instructores ya no se ofrece y no se cargan sus imágenes ni el modelo de seguimiento corporal. Los módulos y recursos de versiones anteriores se conservan en el repositorio, sin uso desde la interfaz actual.

Motor: MediaPipe FaceLandmarker 0.10.35, hasta tres rostros con sonrisa independiente. Hay fallback de GPU a CPU y dos CDN. Captura y exportación mantienen el sello de la marca.

Desarrollo: servir esta carpeta por HTTP en localhost o HTTPS. Pruebas: node --test tests/*.test.js.

Antes de entregar en un evento: comprobar cámara, sonrisa, deslizado circular, ambos extremos del recorrido, giro de cámara, descarga y compartir en Safari/iPhone y Chrome/Android.
Carga inicial: indicador animado por etapas (logos, permiso de cámara, descarga de filtros y detección de sonrisa). Muestra ayuda si una etapa tarda más de 12 segundos. No presenta porcentajes de descarga ficticios; en errores se detiene la animación y se habilita el reintento.

## Publicación en Firebase Hosting

Aplicación publicada: https://team-paolo.web.app · Proyecto: `DBdosparaX` (`dbdosparax`) · Sitio: `team-paolo`.

La aplicación es estática y no requiere compilación. `firebase.json` publica los archivos de la aplicación desde esta carpeta y excluye pruebas, documentación y archivos de configuración. `.firebaserc` selecciona el proyecto y el sitio del destino `paolo`.

Para actualizar únicamente este sitio, desde una copia actualizada del repositorio:

```sh
npx firebase-tools login
npm test
npx firebase-tools deploy --only hosting:paolo --project dbdosparax
```

El despliegue se ejecuta manualmente; subir un commit a GitHub no actualiza Firebase automáticamente. Las fotos continúan guardándose en el dispositivo. Las fotos de la galería local del dominio anterior no se transfieren al nuevo dominio.
