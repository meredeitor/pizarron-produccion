# Pizarron de Produccion

Aplicacion web para capturar y consultar tableros de produccion por planta, proceso y fecha. La informacion se guarda en Firebase Firestore y se sincroniza en tiempo real entre los usuarios que esten viendo el mismo tablero.

## Caracteristicas

- Captura por hora de pares, paros, calidad, mantenimiento, compras, desarrollo, inventario y entregados.
- Metas parametrizadas por planta.
- Procesos dependientes de la planta seleccionada.
- Vista de todos los procesos de una planta en una sola tabla.
- Horarios de comida dependientes de planta y proceso.
- Totales y KPIs calculados automaticamente.
- Guardado automatico en Firestore.
- Sincronizacion en tiempo real con `onSnapshot`.
- Soporte PWA con `manifest.json` y `service-worker.js`.
- Boton de imprimir tablero.

## Estructura

```text
tablero-produccion/
  index.html
  service-worker.js
  css/
    styles.css
  js/
    app.js
  icons/
    icon-192.png
    icon-512.png
  pwa/
    manifest.json
    service-worker.js
```

## Configuracion De Firebase

La app usa Firebase App y Firestore desde CDN:

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
```

El proyecto configurado es:

```text
projectId: pizarron-produccion
```

En Firestore usa la base de datos por defecto:

```text
(default)
```

La app crea automaticamente la coleccion:

```text
tableros-produccion
```

Cada documento se guarda con este formato:

```text
FECHA__PPLANTA__PROCESO
```

Ejemplo:

```text
2026-06-03__P1__Pespunte
```

## Reglas De Firestore Para Pruebas

Para una prueba rapida, puedes usar reglas abiertas temporalmente:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /tableros-produccion/{documento} {
      allow read, write: if true;
    }
  }
}
```

Estas reglas no son recomendadas para produccion porque cualquiera con la configuracion del proyecto podria leer o escribir datos. Para publicar formalmente, conviene agregar autenticacion y reglas por usuario o dominio.

## Parametros Actuales

### Metas

Las metas se configuran como meta semanal y se dividen entre 5 dias productivos. Despues se reparten entre 9 horas productivas, quitando comida.

```text
Planta 1: 4200 / 5 = 840 diarios
Planta 2: 2000 / 5 = 400 diarios
Planta 3: 2000 / 5 = 400 diarios
Planta 4: 8200 / 5 = 1640 diarios
```

Cuando la division por hora deja decimales, el sistema reparte el sobrante en unidades completas para que el total diario cuadre.

### Procesos

Al seleccionar una planta, la app muestra por defecto la opcion `Todos los procesos` para capturar todo el tablero sin entrar proceso por proceso. Tambien se puede seleccionar un proceso individual desde el selector.

```text
P1, P2, P3:
Pespunte, Por montar, Montado, Acabado, Adorno

P4:
Corte, Preliminares, Bordado, Maquilas
```

### Horarios De Comida

```text
P1:
Pespunte: 2:00 A 3:00
Por montar, Montado, Acabado, Adorno: 1:00 A 2:00

P2:
Pespunte: 12:00 A 1:00
Por montar, Montado, Acabado, Adorno: 1:00 A 2:00

P3:
Pespunte: 1:00 A 2:00
Por montar, Montado, Acabado, Adorno: 2:00 A 3:00

P4:
Corte, Preliminares, Bordado, Maquilas: 12:00 A 1:00
```

## Publicacion

Puedes publicar la carpeta completa en Firebase Hosting, Netlify, Vercel o cualquier hosting estatico.

Archivos importantes que deben subirse:

- `index.html`
- `css/styles.css`
- `js/app.js`
- `service-worker.js`
- `pwa/manifest.json`
- `pwa/service-worker.js`
- `icons/icon-192.png`
- `icons/icon-512.png`

## Nota Sobre PWA

El service worker esta en la raiz para controlar toda la aplicacion. Usa estrategia `network-first` para que los usuarios reciban cambios recientes cuando tengan conexion, pero puedan abrir la app con cache si la red falla.

El service worker solo intercepta recursos del mismo origen. Las llamadas a Firebase quedan fuera para no afectar la sincronizacion en tiempo real.

## Mantenimiento

Los parametros principales estan en `js/app.js`:

- `METAS_POR_PLANTA`
- `PROCESOS_POR_PLANTA`
- `HORAS_JORNADA`
- `COMIDA_POR_PLANTA_PROCESO`
- `CAMPOS_CAPTURA`

Si cambian metas, procesos u horarios, normalmente solo hay que editar esas constantes.
