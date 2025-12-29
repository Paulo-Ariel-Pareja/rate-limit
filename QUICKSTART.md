# Inicio Rápido

Guía rápida para poner en marcha el API Rate Validator.

## Pasos Rápidos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar Redis
```bash
# Opción A: Docker Compose
docker-compose up -d

# Opción B: Docker directo
docker run --name redis -p 6379:6379 -d redis

# Opción C: Si ya tienes Redis instalado localmente
redis-server
```

### 3. Iniciar el servidor
```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

### 4. Ejecutar pruebas
```bash
# En otra terminal
node test-request.js
```

## Verificación Manual

### Test 1: Request válido
```bash
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -H "client: test-client" \
  -d '{"test": "data"}'
```

**Resultado esperado:** `200 OK`

### Test 2: Request duplicado
Ejecuta el mismo comando dos veces rápidamente (dentro de 2 segundos):

```bash
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -H "client: test-client" \
  -d '{"test": "data"}'
```

**Resultado esperado (segunda vez):** `409 Conflict`

### Test 3: Sin header client
```bash
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Resultado esperado:** `400 Bad Request`

## Solución de Problemas

### Error: "ECONNREFUSED" al conectar a Redis
- Verifica que Redis esté ejecutándose: `docker ps` o `redis-cli ping`
- Verifica la configuración en `src/app.module.ts`

### Error: "Module not found"
- Ejecuta `npm install` nuevamente
- Verifica que todas las dependencias estén instaladas

### El servidor no inicia
- Verifica que el puerto 3000 esté disponible
- Cambia el puerto usando la variable de entorno: `PORT=3001 npm run start:dev`


