# Guía de Test de Carga

Este documento explica cómo usar el script de test de carga para evaluar el rendimiento del API Rate Validator.

## Inicio Rápido

```bash
# Test básico (10 concurrentes, 1000 requests)
npm run test:load

# Test con más carga
npm run test:load:heavy
```

## Configuración

### Parámetros de línea de comandos

| Parámetro | Descripción | Default |
|-----------|-------------|---------|
| `--concurrent N` | Número de requests concurrentes | 10 |
| `--total N` | Total de requests a enviar | 1000 |
| `--ramp N` | Tiempo en segundos para ramp-up gradual | 0 (sin ramp) |
| `--url URL` | URL del servicio | http://localhost:3000 |
| `--client-id ID` | ID del cliente para headers | load-test-client |

### Variables de entorno

También puedes usar variables de entorno:

```bash
CONCURRENT=50 TOTAL=5000 node load-test.js
```

## Escenarios de Test

### 1. Test Básico de Carga

Evalúa el rendimiento con carga constante:

```bash
node load-test.js --concurrent 10 --total 1000
```

**Cuándo usar:** Para obtener una línea base de rendimiento.

### 2. Test de Carga Pesada

Evalúa el límite del servicio:

```bash
node load-test.js --concurrent 50 --total 5000
```

**Cuándo usar:** Para encontrar el punto de saturación.

### 3. Test con Ramp-Up

Aumenta la carga gradualmente:

```bash
node load-test.js --concurrent 100 --total 10000 --ramp 60
```

**Cuándo usar:** Para simular un aumento gradual de tráfico (como en producción).

### 4. Test de Estrés

Carga extrema para encontrar el punto de quiebre:

```bash
node load-test.js --concurrent 200 --total 20000
```

**Cuándo usar:** Para identificar el límite absoluto del sistema.

### 5. Test de Endurance

Carga sostenida por un período largo:

```bash
node load-test.js --concurrent 20 --total 50000
```

**Cuándo usar:** Para detectar memory leaks o degradación a largo plazo.

## Interpretación de Resultados

### Métricas Clave

1. **Requests por segundo (RPS)**
   - Indica el throughput del sistema
   - Valores altos = mejor rendimiento

2. **Tiempo de respuesta promedio**
   - Tiempo que tarda cada request
   - Valores bajos = mejor rendimiento

3. **Percentiles (p95, p99)**
   - Indican el tiempo de respuesta para el 95% y 99% de los requests
   - Importantes para SLA

4. **Tasa de errores**
   - Porcentaje de requests que fallan
   - Debe ser < 1% en condiciones normales

### Señales de Degradación

El script detecta automáticamente degradación cuando:
- El tiempo promedio reciente es > 1.5x el promedio general
- La tasa de errores aumenta significativamente
- Los percentiles p95/p99 aumentan drásticamente

### Puntos de Atención

⚠️ **Degradación detectada cuando:**
- Tiempo promedio reciente > 1.5x promedio general
- Tasa de errores > 5%
- p99 > 500ms (depende de tus requisitos)

✅ **Rendimiento saludable:**
- Tasa de éxito > 95%
- Tiempo promedio < 50ms
- p99 < 200ms
- Sin degradación detectada

## Mejores Prácticas

### 1. Comenzar con Carga Baja

```bash
# Empezar pequeño
node load-test.js --concurrent 5 --total 100

# Aumentar gradualmente
node load-test.js --concurrent 10 --total 500
node load-test.js --concurrent 20 --total 1000
```

### 2. Monitorear Recursos

Durante el test, monitorea:
- CPU del servidor
- Memoria del servidor
- Conexiones Redis
- Latencia de Redis

### 3. Test en Ambiente Similar a Producción

- Usa la misma configuración de Redis
- Mismo tamaño de instancia
- Misma red

### 4. Ejecutar Múltiples Tests

Ejecuta cada configuración varias veces para obtener resultados consistentes:

```bash
# Ejecutar 3 veces y promediar
for i in {1..3}; do
  node load-test.js --concurrent 20 --total 1000
  sleep 5
done
```

### 5. Documentar Resultados

Guarda los resultados de cada test para comparar:
- Antes y después de optimizaciones
- Diferentes versiones del código
- Diferentes configuraciones

## Ejemplos de Uso

### Ejemplo 1: Evaluación Inicial

```bash
# Test ligero
node load-test.js --concurrent 10 --total 500

# Si pasa, aumentar
node load-test.js --concurrent 25 --total 2000

# Continuar hasta encontrar límites
node load-test.js --concurrent 50 --total 5000
```

### Ejemplo 2: Simulación de Tráfico Real

```bash
# Ramp-up de 2 minutos, llegando a 50 concurrentes
node load-test.js --concurrent 50 --total 10000 --ramp 120
```

### Ejemplo 3: Test de Escalabilidad Horizontal

```bash
# Test contra múltiples instancias
node load-test.js --url http://localhost:3000 --concurrent 30 --total 3000
node load-test.js --url http://localhost:3001 --concurrent 30 --total 3000
node load-test.js --url http://localhost:3002 --concurrent 30 --total 3000
```

## Troubleshooting

### El test es muy lento

- Reduce `--concurrent` o `--total`
- Verifica la latencia de Redis
- Revisa recursos del servidor

### Muchos errores de timeout

- Aumenta el timeout en el código (actualmente 10s)
- Verifica que Redis esté respondiendo
- Revisa la carga del servidor

### Resultados inconsistentes

- Ejecuta múltiples veces
- Asegúrate de que no haya otros procesos usando recursos
- Verifica que Redis esté estable

## Integración con CI/CD

Puedes integrar el test de carga en tu pipeline:

```yaml
# Ejemplo para GitHub Actions
- name: Load Test
  run: |
    npm run start:prod &
    sleep 5
    node load-test.js --concurrent 20 --total 1000
    # Verificar que la tasa de éxito sea > 95%
```

## Notas Importantes

1. **Redis debe estar ejecutándose** antes de iniciar el test
2. **El servidor debe estar en ejecución** y accesible
3. **Los tests generan carga real** - no ejecutes en producción sin cuidado
4. **Los resultados pueden variar** según el hardware y la carga del sistema

