# Comandos para Ejecutar la Aplicación en Windows

Esta guía te muestra todos los comandos que puedes ejecutar TÚ MISMO en tu terminal para probar la aplicación sin conflictos de puertos.

## 🚀 Método Recomendado: Build de Producción

### 1. Instalar Dependencias (Solo la primera vez)
```cmd
cd "C:\Users\Mateo B\Documents\Dev\formato_de_campo_v2"
npm install
```

### 2. Generar Build de Producción
```cmd
npm run build:windows
```
- ✅ **Qué hace**: Genera archivos estáticos optimizados
- ✅ **Resultado**: Carpeta `build-windows` con archivos HTML/JS/CSS
- ✅ **Ventaja**: No necesita servidor de desarrollo

### 3. Servir la Aplicación
```cmd
npm run serve:windows
```
- 🌐 **URL**: http://localhost:3000
- ✅ **Puerto fijo**: Siempre usa el puerto 3000
- ✅ **Estable**: No hay hot reload, pero más confiable

## 🛠️ Método Desarrollo: Puerto Fijo

### Para desarrollo con hot reload:
```cmd
npm run windows
```
- 🌐 **URL**: http://localhost:3000
- ⚡ **Hot reload**: Los cambios se actualizan automáticamente
- 🔧 **Uso**: Para hacer modificaciones y ver cambios en tiempo real

### Para desarrollo con puerto automático:
```cmd
npm run windows:dev
```
- 🌐 **URL**: Expo te dirá qué puerto usa
- ⚡ **Hot reload**: Activado
- 🔧 **Uso**: Si el puerto 3000 está ocupado

## 🔧 Comandos de Utilidad

### Limpiar caché si hay problemas:
```cmd
npm cache clean --force
npx expo start --clear
```

### Reinstalar dependencias:
```cmd
rmdir /s node_modules
npm install
```

### Ver qué puerto está usando:
```cmd
netstat -ano | findstr ":3000"
```

### Matar proceso en puerto específico:
```cmd
# Primero encuentra el PID
netstat -ano | findstr ":3000"

# Luego mata el proceso (reemplaza XXXX con el PID)
taskkill //F //PID XXXX
```

## 📁 Estructura de Archivos Generados

Después de `npm run build:windows`:
```
build-windows/
├── index.html          # Archivo principal
├── static/
│   ├── js/             # JavaScript compilado
│   ├── css/            # Estilos compilados
│   └── media/          # Imágenes y assets
└── manifest.json       # Configuración de la app
```

## 🎯 Flujo de Trabajo Recomendado

### Para Probar la Aplicación:
1. `npm run build:windows` (generar archivos)
2. `npm run serve:windows` (servir aplicación)
3. Abrir http://localhost:3000

### Para Desarrollo:
1. `npm run windows` (servidor de desarrollo)
2. Hacer cambios en el código
3. Ver cambios automáticamente en el navegador

### Para Distribución:
1. `npm run build:windows`
2. Copiar carpeta `build-windows` a donde necesites
3. Abrir `index.html` en cualquier navegador

## ⚠️ Solución de Problemas

### Si el puerto 3000 está ocupado:
```cmd
# Opción 1: Usar puerto diferente
npx expo start --web --port 4000

# Opción 2: Matar proceso que usa el puerto
netstat -ano | findstr ":3000"
taskkill //F //PID [número_del_proceso]
```

### Si aparece pantalla en blanco:
1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Si hay errores, ejecuta:
   ```cmd
   npm cache clean --force
   npm run build:windows
   npm run serve:windows
   ```

### Si hay errores de dependencias:
```cmd
rm -rf node_modules package-lock.json
npm install
npm run build:windows
```

## 🔄 Comandos Rápidos de Referencia

| Comando | Propósito | URL | Hot Reload |
|---------|-----------|-----|------------|
| `npm run build:windows` | Generar archivos | - | No |
| `npm run serve:windows` | Servir build | :3000 | No |
| `npm run windows` | Desarrollo | :3000 | Sí |
| `npm run windows:dev` | Desarrollo auto | Auto | Sí |

## 💡 Consejos

1. **Para pruebas finales**: Usa `build:windows` + `serve:windows`
2. **Para desarrollo**: Usa `windows`
3. **Si hay conflictos de puerto**: Usa `windows:dev`
4. **Para distribuir**: Solo necesitas la carpeta `build-windows`

¡Con estos comandos tienes control total sobre cómo y cuándo ejecutar la aplicación!