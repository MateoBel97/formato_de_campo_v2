# Instalación y Configuración para Windows

Esta guía te ayudará a instalar, configurar y ejecutar la aplicación **Formato de Campo Eprodesa** en Windows.

## Requisitos del Sistema

### Requisitos Mínimos
- **Sistema Operativo**: Windows 10 versión 1903 (build 18362) o superior
- **Memoria RAM**: 4 GB mínimo, 8 GB recomendado
- **Espacio en Disco**: 2 GB de espacio libre
- **Procesador**: Procesador de 64 bits con soporte para x64

### Software Requerido
- **Node.js**: versión 18 LTS o superior
- **Git**: para clonar el repositorio (opcional)
- **Visual Studio Code**: editor recomendado (opcional)

## Instalación de Dependencias

### 1. Instalar Node.js
1. Descarga Node.js desde [nodejs.org](https://nodejs.org/)
2. Ejecuta el instalador descargado
3. Sigue las instrucciones del asistente de instalación
4. Verifica la instalación ejecutando en Command Prompt:
   ```cmd
   node --version
   npm --version
   ```

### 2. Instalar Herramientas de Desarrollo (Opcional)
```cmd
npm install -g @expo/cli
npm install -g yarn
```

## Configuración del Proyecto

### 1. Clonar o Extraer el Proyecto
Si tienes el proyecto en un ZIP:
```cmd
# Extrae el contenido a C:\Users\[TuUsuario]\Documents\Formato_Campo_V2\
```

Si usas Git:
```cmd
git clone [URL_del_repositorio] C:\Users\[TuUsuario]\Documents\Formato_Campo_V2
```

### 2. Instalar Dependencias del Proyecto
```cmd
cd "C:\Users\[TuUsuario]\Documents\Formato_Campo_V2"
npm install

# Instalar dependencias específicas para web/Windows
npx expo install react-dom react-native-web
```

### 3. Configurar Variables de Entorno
El proyecto se configurará automáticamente para usar la carpeta `Documents` del usuario.

## Ejecución de la Aplicación

### Desarrollo
Para ejecutar la aplicación en modo desarrollo:
```cmd
npm run windows
```

### Construir para Windows

Hay dos opciones para usar la aplicación en Windows:

#### Opción 1: Aplicación Web (Recomendado)
```cmd
# Para desarrollo (se abre automáticamente en el navegador)
npm run windows

# Para generar archivos de producción
npm run build:windows
```
La primera vez puede tomar varios minutos compilar. Una vez completado, se abrirá automáticamente en tu navegador predeterminado.

#### Opción 2: Aplicación Nativa con EAS Build
Para crear un ejecutable nativo de Windows, necesitas usar EAS Build:

1. Instala EAS CLI:
```cmd
npm install -g @expo/eas-cli
```

2. Configura EAS:
```cmd
eas login
eas build:configure
```

3. Construye para Windows:
```cmd
eas build --platform windows
```

#### Opción 3: Modo Desarrollo (Para Pruebas)
```cmd
npm run windows
```
Ejecuta la aplicación en modo desarrollo como aplicación web.

## Características Específicas de Windows

### 📁 Almacenamiento de Datos
La aplicación guardará todos los datos en:
```
C:\Users\[TuUsuario]\Documents\Formato_Campo_V2\Data\
```

Esta carpeta incluirá:
- **Formatos/**: Archivos JSON con los formatos de medición
- **Fotos/**: Imágenes de las mediciones y croquis
- **Exportaciones/**: Archivos exportados (.json, .zip)

### 📸 Manejo de Fotos
En Windows, la aplicación ofrece las siguientes opciones:

1. **Webcam**: Usa la cámara web del equipo (si está disponible)
2. **Explorador de Archivos**: Selecciona imágenes desde cualquier carpeta

### 🔐 Permisos
La aplicación solicitará permisos para:
- Acceso a la cámara web (si está disponible)
- Lectura y escritura en la carpeta Documents
- Acceso a archivos del sistema

## Resolución de Problemas

### Error: "Command not found" o "unknown option: --platform"
```cmd
# Verifica que Node.js esté instalado correctamente
node --version

# Si no funciona, agrega Node.js al PATH del sistema

# Si aparece "unknown option: --platform", usa estos comandos en su lugar:
npm run windows         # Para desarrollo web
npm run build:windows   # Para construir aplicación web
```

### Error: "Module not found" o "don't have the required dependencies"
```cmd
# Instala las dependencias de web si no están instaladas
npx expo install react-dom react-native-web

# Si persiste, elimina node_modules e instala nuevamente
rmdir /s node_modules
npm install
npx expo install react-dom react-native-web
```

### Error: "Permission denied"
- Ejecuta Command Prompt como Administrador
- Verifica que tengas permisos de escritura en la carpeta Documents

### Error: "Camera not available"
- Verifica que tu equipo tenga una cámara web conectada
- Asegúrate de que los drivers de la cámara estén instalados
- Usa la opción "Explorador de Archivos" como alternativa

### Problemas de Scroll en la Aplicación Web
Si no puedes hacer scroll en la aplicación:

1. **Refresca la página** (F5 o Ctrl+R)
2. **Verifica el navegador**:
   - Chrome: Recomendado
   - Firefox: Compatible
   - Edge: Compatible
   - Safari: Puede tener limitaciones

3. **Limpia el caché del navegador**:
   ```
   Ctrl + Shift + Delete (Windows)
   Cmd + Shift + Delete (Mac)
   ```

4. **Usa las teclas de navegación**:
   - Flecha arriba/abajo: Scroll vertical
   - Page Up/Page Down: Scroll por página
   - Home/End: Ir al inicio/final

### Problemas con la Compilación
```cmd
# Limpia el caché de npm
npm cache clean --force

# Reinstala dependencias
npm install

# Si persiste el problema, verifica que tienes las herramientas de compilación de Windows
npm install -g windows-build-tools
```

## Estructura de Directorios

```
C:\Users\[TuUsuario]\Documents\Formato_Campo_V2\
├── Data\                          # Datos de la aplicación
│   ├── Formatos\                  # Formatos guardados (.json)
│   ├── Fotos\                     # Imágenes de mediciones
│   └── Exportaciones\             # Archivos exportados
├── src\                           # Código fuente de la aplicación
├── package.json                   # Configuración del proyecto
├── app.json                       # Configuración de Expo
└── WINDOWS_SETUP.md              # Esta guía
```

## Comandos Útiles

### Desarrollo
```cmd
npm run start          # Inicia el servidor de desarrollo
npm run windows        # Ejecuta específicamente para Windows
npm run build:windows  # Construye ejecutable para Windows
```

### Mantenimiento
```cmd
npm run clean          # Limpia archivos temporales
npm install            # Reinstala dependencias
npm update             # Actualiza dependencias
```

## Actualización de la Aplicación

Para actualizar a una nueva versión:

1. Respalda tu carpeta de datos:
   ```cmd
   xcopy "C:\Users\[TuUsuario]\Documents\Formato_Campo_V2\Data" "C:\Users\[TuUsuario]\Documents\Backup_Formato_Campo" /E /I
   ```

2. Descarga la nueva versión
3. Instala las nuevas dependencias:
   ```cmd
   npm install
   ```

4. Ejecuta la migración de datos (automática al iniciar la app)

## Soporte Técnico

### Logs de Error
Los logs se guardan en:
```
C:\Users\[TuUsuario]\AppData\Local\Formato_Campo_V2\logs\
```

### Información del Sistema
Para reportar errores, incluye:
- Versión de Windows (`winver`)
- Versión de Node.js (`node --version`)
- Versión de la aplicación
- Logs de error (si están disponibles)

### Contacto
- **Email**: [tu-email@empresa.com]
- **Teléfono**: [tu-teléfono]
- **Documentación**: Consulta CLAUDE.md para más detalles técnicos

## Licencia y Términos de Uso

Esta aplicación está diseñada específicamente para mediciones acústicas profesionales de Eprodesa. El uso está restringido según los términos de la licencia de software.

---

**¡Importante!**: Siempre respalda tus datos antes de actualizar la aplicación o cambiar de versión.