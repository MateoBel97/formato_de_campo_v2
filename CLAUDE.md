

# Formato de Mediciones Acústicas

## Descripción General

Aplicación multiplataforma para almacenar, ver y editar información acerca de mediciones acústicas que se realicen bajo diferentes métodos y condiciones.

**Plataformas soportadas:**
- 📱 Android
- 🍎 iOS
- 💻 Windows
- 🌐 Web

## Lineamientos Generales de un Estudio de Ruido

Un estudio de ruido tiene como información principal:

- Nombre de la empresa.
- Orden de trabajo.
- Fecha.
- Encargado de la medición.

En las mediciones puede haber múltiples puntos de medición, es decir, ubicaciones geográficas donde se desea evaluar los niveles de ruido. Cada punto tiene un nombre y unas coordenadas en N y W.

Dependiendo de la necesidad del cliente, estas mediciones pueden hacerse en horario diurno y/o nocturno, en uno o más puntos en una zona específica.

## Tipos de medición

### Emisión de Ruido

Se deben hacer mediciones con fuente encendida y fuente apagada. Puede ser una medición por cada condición o una serie de muestras tomadas y distribuidas uniformemente en un espacio de una hora. Se monitorea el nivel sonoro en dBA, percentil L90, número de archivo, hora inicial y final de cada muestra.

### Ruido Ambiental

Se toman cinco muestras de 3 a 5 minutos cada una, distribuidas uniformemente en una hora. Se monitorea el nivel de cada una, número de archivo y hora tanto inicial como final de todo el set de cinco mediciones (no de cada muestra por separado).

### Inmisión de Ruido

Se toma una medición de 15 minutos al interior de un espacio. Se monitorea nivel sonoro, nivel máximo, nivel mínimo, número de archivo, hora inicial y final de la medición.

### Sonometría

Muestras tomadas individualmente en lugares puntuales. Se monitorea nivel sonoro, número de archivo, hora inicial y final.

## Estructura del formato de medición

Acá se muestran las páginas o pestañas que debe mostrar la aplicación junto con la información que debe almacenar:

### Información General

- Nombre de la empresa: Campo de texto editable
- Fecha: Debe permitir seleccionar desde un widget de calendario.
- Orden de trabajo: Cada orden de trabajo tiene el siguiente OT-XXX-###-AA:
    - XXX: tipo de medición, opciones RUI, ACU, AMB, debe ser un dropdown.
    - ###: Número de la orden de trabajo, campo de texto numérico editable.
    - AA: Año de medición, campo de texto numérico editable.
- Encargado de la medición: campo de texto editable.

### Puntos de medición

- Lista de puntos de medición, inicialmente debe estar vacío al crear un nuevo formato.
- Botón para agregar punto de medición.
- Cada punto de medición debe tener:
    - Nombre: campo de texto editable.
    - Coordenadas N: campo de texto editable.
    - Coordenadas W: campo de texto editable.
- Opción de obtener las coordenadas N y W a partir de la ubicación actual del dispositivo usando GPS.
- Opción de eliminar punto de medición, solicitando la confirmación.

### Condiciones meteorológicas

- Velocidad del viento.
- Dirección del viento.
- Temperatura.
- Humedad.
- Presión Atmosférica.
- Precipitación

Por cada una de estas, se debe guardar valor inicial y final, para cada horario (diurno y/o nocturno).

Todas son campos numéricos con un decimal, a excepción de la dirección del viento que es texto.

### Información técnica

- Tipo de medición: dropdown con los tipos de medición
- Horario: checkboxes para horario diurno y para horario nocturno independientes.
- Sonómetro: dropdown entre diferentes opciones:
    - ACU-11.
    - ACU-22A.
    - ACU-23A.
    - ACU-24A.
    - Otro (debe activar un campo de texto editable para almacenar este valor).
- Calibrador: dropdown entre diferentes opciones:
    - ACU-06.
    - ACU-22B.
    - ACU-25B.
    - ACU-24B.
    - Otro (debe activar un campo de texto editable para almacenar este valor).
- Estación meteorológica: dropdown entre diferentes opciones:
    - ACU-26.
    - ACU-27.
    - ACU-28.
    - Otro (debe activar un campo de texto editable para almacenar este valor).
    - N/A.

### Resultados de medición

- Selección de punto de medición, horario de medición.
- Campos de resultados:
    - Emisión de Ruido:
        - Emisión (fuente encendida):
            - Número de intervalos de medición: dropdown desde 1 hasta 5.
            - Por cada intervalo:
                - Nivel sonoro: campo numérico editable.
                - Percentil 90: campo numérico editable.
                - Número de archivo: campo numérico editable.
                - Hora inicial: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
                - Hora final: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
        - Residual (fuente apagada):
            - Número de intervalos de medición: dropdown desde 0 hasta 5. Puede quedar en 0, y de ser así no mostrar ningún otro campo para residual.
            - Por cada intervalo (si el número de intervalos es mayor a 0):
                - Nivel sonoro: campo numérico editable.
                - Percentil 90: campo numérico editable.
                - Número de archivo: campo numérico editable.
                - Hora inicial: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
                - Hora final: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
    - Ruido ambiental:
        - Nivel N: campo de texto editable.
        - Número de archivo N: campo de texto editable.
        - Nivel S: campo de texto editable.
        - Número de archivo S: campo de texto editable.
        - Nivel E: campo de texto editable.
        - Número de archivo E: campo de texto editable.
        - Nivel W: campo de texto editable.
        - Número de archivo W: campo de texto editable.
        - Nivel V: campo de texto editable.
        - Número de archivo V: campo de texto editable.
        - Hora inicial: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
        - Hora final: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
    - Inmisión de Ruido:
        - Nivel Leq: campo de texto editable.
        - Nivel Lmax: campo de texto editable.
        - Nivel Lmin: campo de texto editable.
        - Hora inicial: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
        - Hora final: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
    - Sonometría:
        - Nivel Leq: campo de texto editable.
        - Nivel Lmax: campo de texto editable.
        - Nivel Lmin: campo de texto editable.
        - Hora inicial: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
        - Hora final: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
- Comentarios (para cada muestra o intervalor).

### Datos cualitativos:

- Descripción de las condiciones de medición: Campo de texto editable, debe abarcar bastante de la pantalla porque el texto suele ser largo en esta etapa.
- Información de la fuente de ruido: Campo de texto editable, debe abarcar bastante de la pantalla porque el texto suele ser largo en esta etapa.

### Eventos externos:

- Lista de eventos externos almacenados (por defecto debe estar vacía al iniciar un nuevo formato).
- Botón para agregar evento externo.
- Cada evento externo tiene:
    - Nombre: campo de texto editable.
    - Nivel: campo numérico editable.
    - Hora: Debe mostrar un reloj que permite seleccionar hora y minuto ya sea AM o PM.
    - Duración: campo numérico editable.

### Final:

- Botón para exportar resultados.
- Botón para volver a la página principal

## Almacenamiento de información

La aplicación debe exportar los resultados, para que el usuario pueda compartir el archivo exportado por cualquier medio tradicional (WhatsApp, correo, drive, etc.) Puede ser en formato JSON. Deben guardarse varias tablas. La estructura de los datos debería ser la siguiente: 

- Tabla con información general del estudio
    - Nombre de la empresa.
    - Fecha
    - Orden de trabajo.
    - Encargado de la medición.
    - Número de puntos (conteo del número de puntos guardado).
    - Horario diurno (false, true).
    - Horario nocturno (false, true).
    - Descripción del entorno.
    - Observaciones fuente - receptor.
- Tabla de resultados de medición
    - Por cada punto, por cada horario y por cada intervalo de medición:
        - Punto.
        - Horario.
        - Intervalo.
        - nivel sonoro.
        - nivel L90.
        - Emisión/Residual (puede ser N/A si es otro tipo de medición aparte de Emisión de Ruido).
        - Hora inicial.
        - Hora final.
- Condiciones meteorológicas:
- Eventos externos.

## Requerimientos de funcionamiento

- Compatible con Android, iOS, Windows y Web.
- La pantalla principal debe mostrar al inicio dos opciones:
    - Crear nuevo formato.
    - Ver lista de formatos guardados.
- Para cada nuevo formato se debe crear el correspondiente archivo JSON con el nombre de la empresa, la fecha y la orden de trabajo.
- La aplicación debe almacenar internamente el archivo JSON de cada medición.
- En la visualización de los formatos guardados se debe mostrar una lista con cada uno de los archivos JSON guardados internamente. Debe permitir la selección de cualquier archivo y abrir la vista de edición del formato con la información previamente guardada.
- Permitir la exportación del archivo JSON.

## Características Específicas de Windows

### Almacenamiento
- **Ubicación**: Los datos se guardan en `Documents/Formato_Campo_V2/Data/`
- **Estructura**:
  - `Formatos/`: Archivos JSON de mediciones
  - `Fotos/`: Imágenes de mediciones y croquis
  - `Exportaciones/`: Archivos exportados
- **Migración**: Automática desde AsyncStorage al iniciar en Windows

### Manejo de Fotos
- **Webcam**: Soporte para cámara web del equipo
- **Explorador de Archivos**: Selección desde cualquier carpeta del sistema
- **Formatos Soportados**: JPG, PNG, JPEG, GIF, BMP
- **Etiquetas Adaptativas**:
  - "Archivos" en lugar de "Galería"
  - "Webcam" en lugar de "Cámara"

### Ejecutable
- **Desarrollo**: `npm run windows`
- **Producción**: `npm run build:windows`
- **Instalación**: Ver `WINDOWS_SETUP.md`

## Interfaz gráfica

- Para cada página o pestaña agrega un ícono apropiado.
- Usa una tonalidad verde.
- Debe tener un menú lateral comprimible donde se vean cada una de las pestañas del formato actual en forma de íconos. Cuando está comprimido debe mostrar solamente los íconos. Cuando está desplegado debe mostrar íconos y texto.
- **Adaptación de Plataforma**: Los controles se adaptan automáticamente según la plataforma (Windows/Web vs Móvil).