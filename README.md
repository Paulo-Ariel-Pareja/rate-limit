# API Rate Validator

API REST basada en NestJS para validar si un request es duplicado o no. Utiliza Redis para permitir escalado horizontal y alta eficiencia.

## Características

- ✅ Validación de requests duplicados en ventana de 2 segundos
- ✅ Identificación basada en body + header `client`
- ✅ Uso de Redis para escalado horizontal
- ✅ Alta eficiencia y rendimiento

## Requisitos

- Node.js >= 18
- Redis (puede ejecutarse con Docker)

## Instalación

```bash
npm install
```

## Configuración

El servicio se configura mediante variables de entorno. Puedes crear un archivo `.env` en la raíz del proyecto basándote en `.env.example`.

### Variables de Entorno

#### Servidor
- `PORT`: Puerto en el que el servidor escuchará (default: 3000)

#### Redis
- `REDIS_HOST`: Host de Redis (default: localhost)
- `REDIS_PORT`: Puerto de Redis (default: 6379)
- `REDIS_PASSWORD`: Contraseña de Redis (opcional)

#### Cache
- `CACHE_TTL_SEG`: TTL (Time To Live) del cache en segundos. Tiempo que un request se mantiene en cache para detectar duplicados (default: 2000ms = 2 segundos)

### Ejemplo de archivo .env

```env
PORT=3000
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
CACHE_TTL_SEG=2
```

## Ejecutar Redis con Docker

### Opción 1: Docker Compose (recomendado)
```bash
docker-compose up -d
```

### Opción 2: Docker directo
```bash
docker run --name redis -p 6379:6379 -d redis
```

## Ejecutar la aplicación

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

## Endpoints

### POST /validate

Valida si un request es duplicado.

**Headers requeridos:**
- `client`: Identificador del cliente

**Body:** Cualquier JSON

**Respuestas:**
- `200 OK`: Request válido (no duplicado)
- `400 Bad Request`: Falta el header `client`
- `409 Conflict`: Request duplicado detectado

### POST /health

Health check del servicio.

## Ejemplo de uso

```bash
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -H "client: client123" \
  -d '{"key": "value", "data": "test"}'
```

## Scripts de prueba

### Tests funcionales

#### Opción 1: Script Node.js (recomendado)
```bash
node test-request.js
```

#### Opción 2: Script Bash
```bash
chmod +x test-request.sh
./test-request.sh
```

#### Opción 3: Manual con curl
```bash
# Request válido
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -H "client: client123" \
  -d '{"key": "value", "data": "test"}'

# Request duplicado (ejecutar inmediatamente después del anterior)
curl -X POST http://localhost:3000/validate \
  -H "Content-Type: application/json" \
  -H "client: client123" \
  -d '{"key": "value", "data": "test"}'
```

El segundo request debería retornar un error 409 (Conflict) indicando que es un duplicado.

### Test de carga

El script `load-test.js` permite evaluar el rendimiento del servicio bajo diferentes niveles de carga.

#### Uso básico
```bash
# Test con configuración por defecto (10 concurrentes, 1000 requests)
npm run test:load

# O directamente
node load-test.js
```

#### Opciones avanzadas
```bash
# Test con más concurrencia y requests
node load-test.js --concurrent 50 --total 5000

# Test con ramp-up gradual (aumenta la carga durante 30 segundos)
node load-test.js --concurrent 100 --total 10000 --ramp 30

# Test contra otro servidor
node load-test.js --url http://localhost:3001 --concurrent 20 --total 2000

# Usando variables de entorno
CONCURRENT=50 TOTAL=5000 node load-test.js
```

#### Parámetros disponibles

- `--concurrent N`: Número de requests concurrentes (default: 10)
- `--total N`: Total de requests a enviar (default: 1000)
- `--ramp N`: Tiempo en segundos para aumentar la carga gradualmente (default: 0, sin ramp)
- `--url URL`: URL del servicio (default: http://localhost:3000)
- `--client-id ID`: ID del cliente para los headers (default: load-test-client)

#### Métricas proporcionadas

El script muestra:
- **Requests totales**: Total enviados, exitosos, duplicados, errores
- **Rendimiento**: Requests por segundo, tiempo mínimo/máximo/promedio, mediana
- **Percentiles**: p50, p75, p90, p95, p99
- **Códigos de estado**: Distribución de códigos HTTP
- **Detección de degradación**: Alerta cuando el rendimiento empieza a degradarse

#### Ejemplo de salida
```
🚀 Iniciando test de carga constante
   Configuración:
   - Requests totales: 1000
   - Concurrencia: 10
   - URL: http://localhost:3000
   - Client ID: load-test-client

🕐 Inicio: 2024-01-15T10:30:45.000Z

📊 Progreso: 1000/1000 requests | 125.50 req/s | Exitosos: 950 | Errores: 50

🕐 Fin: 2024-01-15T10:30:53.000Z

======================================================================
📊 ESTADÍSTICAS DE CARGA
======================================================================

📈 Requests:
   Total enviados:     1000
   Exitosos (200):      950 (95.00%)
   Duplicados (409):    30
   Bad Request (400):   0
   Errores:             20 (2.00%)

⏱️  Rendimiento:
   Tiempo transcurrido: 7.96s
   Requests/segundo:    125.63 req/s
   Tiempo mínimo:      5.23ms
   Tiempo máximo:       245.67ms
   Tiempo promedio:     12.45ms
   Mediana:              10.12ms

📊 Percentiles:
   p50: 10.12ms
   p75: 15.34ms
   p90: 25.67ms
   p95: 45.23ms
   p99: 120.45ms
```

