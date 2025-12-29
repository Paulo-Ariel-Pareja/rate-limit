#!/usr/bin/env node

/**
 * Script de test de carga para evaluar el rendimiento del API Rate Validator
 *
 * Uso: node load-test.js [opciones]
 *
 * Opciones:
 *   --concurrent N    Número de requests concurrentes (default: 10)
 *   --total N         Total de requests a enviar (default: 1000)
 *   --ramp N          Tiempo en segundos para aumentar la carga gradualmente (default: 0, sin ramp)
 *   --url URL         URL del servicio (default: http://localhost:3000)
 *   --client-id ID    ID del cliente para los headers (default: load-test-client)
 */

const http = require('http');

// Configuración por defecto
const config = {
  concurrent: parseInt(process.env.CONCURRENT || '10', 10),
  total: parseInt(process.env.TOTAL || '1000', 10),
  ramp: parseInt(process.env.RAMP || '0', 10),
  url: process.env.API_URL || 'http://localhost:3000',
  clientId: process.env.CLIENT_ID || 'load-test-client',
};

// Parsear argumentos de línea de comandos
process.argv.forEach((arg, index) => {
  if (arg === '--concurrent' && process.argv[index + 1]) {
    config.concurrent = parseInt(process.argv[index + 1], 10);
  } else if (arg === '--total' && process.argv[index + 1]) {
    config.total = parseInt(process.argv[index + 1], 10);
  } else if (arg === '--ramp' && process.argv[index + 1]) {
    config.ramp = parseInt(process.argv[index + 1], 10);
  } else if (arg === '--url' && process.argv[index + 1]) {
    config.url = process.argv[index + 1];
  } else if (arg === '--client-id' && process.argv[index + 1]) {
    config.clientId = process.argv[index + 1];
  }
});

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Estadísticas
const stats = {
  total: 0,
  success: 0,
  errors: 0,
  duplicates: 0,
  badRequest: 0,
  durations: [],
  startTime: null,
  endTime: null,
  statusCodes: {},
};

// Función para hacer un request
function makeRequest(requestId) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    const body = JSON.stringify({
      requestId,
      timestamp: Date.now(),
      data: `load-test-${requestId}`,
    });

    const options = {
      hostname: new URL(config.url).hostname,
      port: new URL(config.url).port || 3000,
      path: '/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'client': config.clientId,
      },
      timeout: 10000, // 10 segundos de timeout
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // milisegundos

        stats.total++;
        stats.durations.push(duration);

        // Contar códigos de estado
        const statusCode = res.statusCode;
        stats.statusCodes[statusCode] =
          (stats.statusCodes[statusCode] || 0) + 1;

        if (statusCode === 200) {
          stats.success++;
        } else if (statusCode === 409) {
          stats.duplicates++;
        } else if (statusCode === 400) {
          stats.badRequest++;
        } else {
          stats.errors++;
        }

        resolve({
          success: statusCode === 200,
          statusCode,
          duration,
          requestId,
        });
      });
    });

    req.on('error', (error) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      stats.total++;
      stats.errors++;
      stats.durations.push(duration);

      resolve({
        success: false,
        statusCode: 0,
        duration,
        requestId,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      stats.total++;
      stats.errors++;
      const duration = 10000; // timeout
      stats.durations.push(duration);

      resolve({
        success: false,
        statusCode: 0,
        duration,
        requestId,
        error: 'Timeout',
      });
    });

    req.write(body);
    req.end();
  });
}

// Calcular percentiles
function calculatePercentiles(durations, percentiles = [50, 75, 90, 95, 99]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const result = {};

  percentiles.forEach((p) => {
    const index = Math.ceil((sorted.length * p) / 100) - 1;
    result[`p${p}`] = sorted[Math.max(0, index)] || 0;
  });

  return result;
}

// Calcular estadísticas
function calculateStats() {
  if (stats.durations.length === 0) {
    return {
      min: 0,
      max: 0,
      avg: 0,
      median: 0,
      percentiles: {},
    };
  }

  const sorted = [...stats.durations].sort((a, b) => a - b);
  const sum = stats.durations.reduce((a, b) => a + b, 0);
  const avg = sum / stats.durations.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];

  const percentiles = calculatePercentiles(stats.durations);

  return {
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2),
    median: median.toFixed(2),
    percentiles,
  };
}

// Mostrar estadísticas en tiempo real
function showStats() {
  const elapsed = stats.endTime
    ? Number(stats.endTime - stats.startTime) / 1000000000
    : Number(process.hrtime.bigint() - stats.startTime) / 1000000000;

  const rps = stats.total / elapsed;
  const successRate = (stats.success / stats.total) * 100 || 0;
  const errorRate =
    ((stats.errors + stats.duplicates + stats.badRequest) / stats.total) *
      100 || 0;

  const calculatedStats = calculateStats();

  log('\n' + '='.repeat(70), colors.cyan);
  log('📊 ESTADÍSTICAS DE CARGA', colors.cyan);
  log('='.repeat(70), colors.cyan);
  log(`\n📈 Requests:`, colors.yellow);
  log(`   Total enviados:     ${stats.total}`, colors.reset);
  log(
    `   Exitosos (200):      ${stats.success} (${successRate.toFixed(2)}%)`,
    colors.green,
  );
  log(`   Duplicados (409):    ${stats.duplicates}`, colors.yellow);
  log(`   Bad Request (400):   ${stats.badRequest}`, colors.yellow);
  log(
    `   Errores:             ${stats.errors} (${errorRate.toFixed(2)}%)`,
    colors.red,
  );

  log(`\n⏱️  Rendimiento:`, colors.yellow);
  log(`   Tiempo transcurrido: ${elapsed.toFixed(2)}s`, colors.reset);
  log(`   Requests/segundo:    ${rps.toFixed(2)} req/s`, colors.blue);
  log(`   Tiempo mínimo:        ${calculatedStats.min}ms`, colors.green);
  log(`   Tiempo máximo:        ${calculatedStats.max}ms`, colors.red);
  log(`   Tiempo promedio:      ${calculatedStats.avg}ms`, colors.blue);
  log(`   Mediana:              ${calculatedStats.median}ms`, colors.blue);

  log(`\n📊 Percentiles:`, colors.yellow);
  Object.entries(calculatedStats.percentiles).forEach(([percentile, value]) => {
    const color =
      percentile === 'p99'
        ? colors.red
        : percentile === 'p95'
          ? colors.yellow
          : colors.blue;
    log(`   ${percentile}: ${value.toFixed(2)}ms`, color);
  });

  log(`\n📋 Códigos de estado:`, colors.yellow);
  Object.entries(stats.statusCodes)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .forEach(([code, count]) => {
      const percentage = ((count / stats.total) * 100).toFixed(2);
      const color =
        code === '200'
          ? colors.green
          : code === '409'
            ? colors.yellow
            : colors.red;
      log(`   ${code}: ${count} (${percentage}%)`, color);
    });

  // Detectar degradación
  if (stats.total > 100) {
    const recentDurations = stats.durations.slice(
      -Math.floor(stats.total * 0.1),
    );
    const recentAvg =
      recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
    const overallAvg = parseFloat(calculatedStats.avg);

    if (recentAvg > overallAvg * 1.5) {
      log(`\n⚠️  ADVERTENCIA: Degradación detectada`, colors.red);
      log(`   Promedio reciente: ${recentAvg.toFixed(2)}ms`, colors.red);
      log(`   Promedio general:  ${overallAvg}ms`, colors.yellow);
      log(
        `   Incremento:        ${((recentAvg / overallAvg - 1) * 100).toFixed(2)}%`,
        colors.red,
      );
    }
  }

  log('\n' + '='.repeat(70) + '\n', colors.cyan);
}

// Función para ejecutar carga con ramp-up
async function runRampUpLoad() {
  log('🚀 Iniciando test de carga con ramp-up', colors.cyan);
  log(`   Configuración:`, colors.yellow);
  log(`   - Requests totales: ${config.total}`, colors.reset);
  log(`   - Concurrencia máxima: ${config.concurrent}`, colors.reset);
  log(`   - Ramp-up: ${config.ramp}s`, colors.reset);
  log(`   - URL: ${config.url}`, colors.reset);
  log(`   - Client ID: ${config.clientId}\n`, colors.reset);

  stats.startTime = process.hrtime.bigint();
  const startTimestamp = new Date().toISOString();
  log(`🕐 Inicio: ${startTimestamp}\n`, colors.blue);

  const requestsPerSecond = config.total / config.ramp;
  const interval = 1000 / requestsPerSecond;
  let sent = 0;
  let active = 0;

  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      if (sent >= config.total) {
        clearInterval(intervalId);
        // Esperar a que terminen todos los requests activos
        const checkInterval = setInterval(() => {
          if (active === 0) {
            clearInterval(checkInterval);
            stats.endTime = process.hrtime.bigint();
            const endTimestamp = new Date().toISOString();
            log(`\n🕐 Fin: ${endTimestamp}`, colors.blue);
            showStats();
            resolve();
          }
        }, 100);
        return;
      }

      // Enviar batch de requests
      const batchSize = Math.min(
        config.concurrent - active,
        config.total - sent,
      );
      for (let i = 0; i < batchSize; i++) {
        active++;
        sent++;
        makeRequest(sent).then(() => {
          active--;
        });
      }
    }, interval);
  });
}

// Función para ejecutar carga constante
async function runConstantLoad() {
  log('🚀 Iniciando test de carga constante', colors.cyan);
  log(`   Configuración:`, colors.yellow);
  log(`   - Requests totales: ${config.total}`, colors.reset);
  log(`   - Concurrencia: ${config.concurrent}`, colors.reset);
  log(`   - URL: ${config.url}`, colors.reset);
  log(`   - Client ID: ${config.clientId}\n`, colors.reset);

  stats.startTime = process.hrtime.bigint();
  const startTimestamp = new Date().toISOString();
  log(`🕐 Inicio: ${startTimestamp}\n`, colors.blue);

  let sent = 0;
  const promises = [];

  // Crear workers concurrentes
  const workers = [];
  for (let i = 0; i < config.concurrent; i++) {
    workers.push(
      (async () => {
        while (sent < config.total) {
          const current = ++sent;
          if (current > config.total) break;
          await makeRequest(current);
        }
      })(),
    );
  }

  // Mostrar progreso cada segundo
  const progressInterval = setInterval(() => {
    const elapsed =
      Number(process.hrtime.bigint() - stats.startTime) / 1000000000;
    const rps = stats.total / elapsed;
    process.stdout.write(
      `\r📊 Progreso: ${stats.total}/${config.total} requests | ${rps.toFixed(2)} req/s | ` +
        `Exitosos: ${stats.success} | Errores: ${stats.errors}     `,
    );
  }, 1000);

  await Promise.all(workers);

  clearInterval(progressInterval);
  stats.endTime = process.hrtime.bigint();
  const endTimestamp = new Date().toISOString();
  log(`\n🕐 Fin: ${endTimestamp}`, colors.blue);
  showStats();
}

// Verificar conexión antes de iniciar
async function checkConnection() {
  return new Promise((resolve) => {
    const options = {
      hostname: new URL(config.url).hostname,
      port: new URL(config.url).port || 3000,
      path: '/health',
      method: 'POST',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Ejecutar
(async () => {
  log('\n🔍 Verificando conexión con el servidor...', colors.blue);
  const isConnected = await checkConnection();

  if (!isConnected) {
    log(`\n❌ No se pudo conectar a ${config.url}`, colors.red);
    log('   Asegúrate de que el servidor esté ejecutándose:', colors.yellow);
    log('   npm run start:dev\n', colors.yellow);
    process.exit(1);
  }

  log('✅ Conexión establecida\n', colors.green);

  try {
    if (config.ramp > 0) {
      await runRampUpLoad();
    } else {
      await runConstantLoad();
    }
  } catch (error) {
    log(`\n❌ Error durante el test: ${error.message}`, colors.red);
    process.exit(1);
  }
})();
