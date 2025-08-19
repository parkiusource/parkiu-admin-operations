# 🛠️ Scripts de Desarrollo - ParkiU Admin

## 🚀 Comando Principal
```bash
npm run dev
```

## 🔧 Solución de Problemas de Puertos

### Si el puerto está ocupado:
```bash
# 1. Ver qué está usando los puertos
lsof -i :5173
lsof -i :5174

# 2. Terminar procesos específicos (reemplaza PID con el número real)
kill -9 [PID]

# 3. Terminar TODOS los procesos de Vite
pkill -f "vite"

# 4. Limpiar todos los procesos de Node relacionados con el proyecto
ps aux | grep "parkiu-admin" | grep -v grep | awk '{print $2}' | xargs kill -9
```

### Script de limpieza completa:
```bash
# Terminar todos los procesos de desarrollo
pkill -f "vite" && pkill -f "npm run dev" && echo "✅ Procesos terminados"
```

## 🧹 Comandos de Limpieza

### Limpiar cache de npm y node_modules:
```bash
npm run clean && npm install
```

### Verificar estado de puertos:
```bash
echo "Puerto 5173:" && lsof -i :5173
echo "Puerto 5174:" && lsof -i :5174
echo "Procesos Vite:" && ps aux | grep vite | grep -v grep
```

## 🚦 Estados de Proceso

- **S+** = Running (activo)
- **T** = Stopped/Suspended (suspendido pero ocupando recursos)
- **Z** = Zombie process (proceso zombi)

## 🎯 Flujo Recomendado

1. **Antes de iniciar desarrollo:**
   ```bash
   pkill -f "vite" || true  # Limpiar procesos anteriores
   npm run dev              # Iniciar desarrollo
   ```

2. **Al terminar desarrollo:**
   ```bash
   Ctrl+C  # En la terminal donde corre npm run dev
   ```

3. **Si hay problemas:**
   ```bash
   pkill -f "vite"     # Limpiar procesos
   lsof -i :5173       # Verificar puerto libre
   npm run dev         # Reiniciar
   ```
