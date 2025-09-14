# 🍎 QZ Tray - Solución de Problemas en macOS

## ❌ Error: "Failed to load QZ Tray library"

Este error en macOS generalmente significa que QZ Tray está instalado pero **no está ejecutándose**.

## ✅ Pasos de Diagnóstico

### 1. **Verificar si QZ Tray está ejecutándose**
```bash
# Busca el proceso QZ Tray
ps aux | grep -i qz
```

### 2. **Buscar el ícono en la barra de menú**
- Mira en la **barra de menú superior** (esquina derecha)
- Busca el ícono **🖨️** o **QZ**
- Si no está visible, QZ Tray no está ejecutándose

### 3. **Iniciar QZ Tray manualmente**
```bash
# Opción 1: Desde terminal
open -a "QZ Tray"

# Opción 2: Desde Finder
# Aplicaciones → QZ Tray → Doble clic
```

### 4. **Verificar permisos de macOS**
- Ve a **Preferencias del Sistema** → **Seguridad y Privacidad**
- En la pestaña **General**, busca mensajes sobre QZ Tray
- Si aparece, haz clic en **"Permitir"**

### 5. **Configurar QZ Tray para desarrollo**
Una vez que QZ Tray esté ejecutándose:

1. **Haz clic derecho** en el ícono 🖨️ de la barra de menú
2. Selecciona **"Advanced"**
3. Marca **"Allow unsigned requests"** ✅
4. El estado debe mostrar **"QZ Tray is running"** en verde

### 6. **Verificar puerto de conexión**
```bash
# QZ Tray usa el puerto 8181 por defecto
lsof -i :8181
```

## 🔧 Soluciones Comunes

### **Problema: QZ Tray no aparece en la barra de menú**
```bash
# Reiniciar QZ Tray
pkill -f "QZ Tray"
sleep 2
open -a "QZ Tray"
```

### **Problema: "Connection refused"**
- QZ Tray no está ejecutándose
- Reinicia la aplicación desde Aplicaciones

### **Problema: "Permission denied"**
- Ve a Preferencias del Sistema → Seguridad y Privacidad
- Permite que QZ Tray se ejecute

### **Problema: QZ Tray se cierra automáticamente**
```bash
# Ejecutar desde terminal para ver errores
/Applications/QZ\ Tray.app/Contents/MacOS/QZ\ Tray
```

## 🚀 Configuración Automática

Para que QZ Tray se inicie automáticamente:

1. **Preferencias del Sistema** → **Usuarios y Grupos**
2. Tu usuario → **Elementos de Inicio**
3. Haz clic en **"+"** y agrega **QZ Tray**

## 📋 Lista de Verificación Rápida

- [ ] QZ Tray instalado desde qz.io/download
- [ ] Ícono 🖨️ visible en barra de menú superior
- [ ] "Allow unsigned requests" activado
- [ ] Estado "QZ Tray is running" en verde
- [ ] Puerto 8181 abierto y escuchando
- [ ] Permisos de macOS otorgados

## 🔍 Comando de Diagnóstico Completo

```bash
echo "=== Diagnóstico QZ Tray macOS ==="
echo "1. Proceso QZ Tray:"
ps aux | grep -i qz | grep -v grep

echo -e "\n2. Puerto 8181:"
lsof -i :8181

echo -e "\n3. Aplicación instalada:"
ls -la /Applications/ | grep -i qz

echo -e "\n4. Conexión local:"
curl -s http://localhost:8181 && echo "✅ QZ Tray responde" || echo "❌ QZ Tray no responde"
```

## 💡 Después de Solucionar

1. Refresca la página de ParkiU
2. Haz clic en **"Actualizar"** en el selector de impresoras
3. Deberías ver: **"✅ QZ Tray conectado (X impresoras)"**

---

**¿Sigues teniendo problemas?** Ejecuta el comando de diagnóstico y comparte la salida.
