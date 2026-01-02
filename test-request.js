#!/usr/bin/env node

/**
 * Script de prueba para validar el funcionamiento del API Rate Validator
 * 
 * Uso: node test-request.js
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = `${API_URL}/validate`;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(body, clientId, testName) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();
    const timestamp = new Date().toISOString();
    const bodyString = JSON.stringify(body);
    
    const options = {
      hostname: new URL(API_URL).hostname,
      port: new URL(API_URL).port || 3000,
      path: '/validate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString),
        'client': clientId,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            body: parsed,
            headers: res.headers,
            duration: durationMs,
            timestamp: timestamp,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data,
            headers: res.headers,
            duration: durationMs,
            timestamp: timestamp,
          });
        }
      });
    });

    req.on('error', (error) => {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;
      reject({
        error,
        duration: durationMs,
        timestamp: timestamp,
      });
    });

    req.write(bodyString);
    req.end();
  });
}

async function runTests() {
  log('\n🧪 Iniciando pruebas del API Rate Validator\n', colors.cyan);

  const tests = [];

  // Test 1: Request válido (primera vez)
  tests.push(async () => {
    log('Test 1: Request válido (primera vez)', colors.yellow);
    try {
      const response = await makeRequest(
        { key: 'value', data: 'test' },
        'client-001',
        'Test 1',
      );
      
      const timeInfo = `[${response.timestamp}] ⏱️  ${response.duration.toFixed(2)}ms`;
      log(`  ${timeInfo}`, colors.blue);
      
      if (response.statusCode === 200) {
        log('  ✅ PASS: Request aceptado correctamente', colors.green);
        return { success: true, duration: response.duration };
      } else {
        log(`  ❌ FAIL: Esperado 200, recibido ${response.statusCode}`, colors.red);
        return { success: false, duration: response.duration };
      }
    } catch (error) {
      const timeInfo = error.timestamp ? `[${error.timestamp}] ⏱️  ${error.duration.toFixed(2)}ms` : '';
      log(`  ❌ FAIL: Error - ${error.error?.message || error.message} ${timeInfo}`, colors.red);
      return { success: false, duration: error.duration || 0 };
    }
  });

  // Test 2: Request duplicado (mismo body y cliente dentro de 2 segundos)
  tests.push(async () => {
    log('\nTest 2: Request duplicado (mismo body y cliente)', colors.yellow);
    try {
      // Primer request
      const response1 = await makeRequest(
        { key: 'value', data: 'test' },
        'client-001',
        'Test 2 - Request 1',
      );
      
      log(`  Request 1: [${response1.timestamp}] ⏱️  ${response1.duration.toFixed(2)}ms`, colors.blue);
      
      if (response1.statusCode !== 200) {
        log(`  ⚠️  Primer request falló: ${response1.statusCode}`, colors.yellow);
      }

      // Segundo request inmediatamente (debe ser duplicado)
      await new Promise((resolve) => setTimeout(resolve, 100));
      const response2 = await makeRequest(
        { key: 'value', data: 'test' },
        'client-001',
        'Test 2 - Request 2',
      );

      log(`  Request 2: [${response2.timestamp}] ⏱️  ${response2.duration.toFixed(2)}ms`, colors.blue);

      if (response2.statusCode === 409) {
        log('  ✅ PASS: Duplicado detectado correctamente (409)', colors.green);
        return { success: true, duration: response1.duration + response2.duration };
      } else {
        log(`  ❌ FAIL: Esperado 409, recibido ${response2.statusCode}`, colors.red);
        return { success: false, duration: response1.duration + response2.duration };
      }
    } catch (error) {
      const timeInfo = error.timestamp ? `[${error.timestamp}] ⏱️  ${error.duration.toFixed(2)}ms` : '';
      log(`  ❌ FAIL: Error - ${error.error?.message || error.message} ${timeInfo}`, colors.red);
      return { success: false, duration: error.duration || 0 };
    }
  });

  // Test 3: Request sin header client
  tests.push(async () => {
    log('\nTest 3: Request sin header client', colors.yellow);
    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();
      const timestamp = new Date().toISOString();
      const body = JSON.stringify({ key: 'value' });
      const options = {
        hostname: new URL(API_URL).hostname,
        port: new URL(API_URL).port || 3000,
        path: '/validate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          // Sin client
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const durationMs = Number(endTime - startTime) / 1000000;
          log(`  [${timestamp}] ⏱️  ${durationMs.toFixed(2)}ms`, colors.blue);
          
          if (res.statusCode === 400) {
            log('  ✅ PASS: Error 400 por falta de header', colors.green);
            resolve({ success: true, duration: durationMs });
          } else {
            log(`  ❌ FAIL: Esperado 400, recibido ${res.statusCode}`, colors.red);
            resolve({ success: false, duration: durationMs });
          }
        });
      });

      req.on('error', (error) => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        log(`  ❌ FAIL: Error - ${error.message} [${timestamp}] ⏱️  ${durationMs.toFixed(2)}ms`, colors.red);
        resolve({ success: false, duration: durationMs });
      });

      req.write(body);
      req.end();
    });
  });

  // Test 4: Request con mismo body pero diferente cliente
  tests.push(async () => {
    log('\nTest 4: Request con mismo body pero diferente cliente', colors.yellow);
    try {
      const response1 = await makeRequest(
        { key: 'value', data: 'test' },
        'client-001',
        'Test 4 - Request 1',
      );

      log(`  Request 1: [${response1.timestamp}] ⏱️  ${response1.duration.toFixed(2)}ms`, colors.blue);

      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const response2 = await makeRequest(
        { key: 'value', data: 'test' },
        'client-002', // Diferente cliente
        'Test 4 - Request 2',
      );

      log(`  Request 2: [${response2.timestamp}] ⏱️  ${response2.duration.toFixed(2)}ms`, colors.blue);

      if (response2.statusCode === 200) {
        log('  ✅ PASS: Request aceptado (diferente cliente)', colors.green);
        return { success: true, duration: response1.duration + response2.duration };
      } else {
        log(`  ❌ FAIL: Esperado 200, recibido ${response2.statusCode}`, colors.red);
        return { success: false, duration: response1.duration + response2.duration };
      }
    } catch (error) {
      const timeInfo = error.timestamp ? `[${error.timestamp}] ⏱️  ${error.duration.toFixed(2)}ms` : '';
      log(`  ❌ FAIL: Error - ${error.error?.message || error.message} ${timeInfo}`, colors.red);
      return { success: false, duration: error.duration || 0 };
    }
  });

  // Test 5: Request después de 2 segundos (no debe ser duplicado)
  tests.push(async () => {
    log('\nTest 5: Request después de 2+ segundos', colors.yellow);
    try {
      const response1 = await makeRequest(
        { key: 'value', data: 'delayed-test' },
        'client-003',
        'Test 5 - Request 1',
      );

      log(`  Request 1: [${response1.timestamp}] ⏱️  ${response1.duration.toFixed(2)}ms`, colors.blue);
      log('  ⏳ Esperando 2.5 segundos...', colors.blue);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      const response2 = await makeRequest(
        { key: 'value', data: 'delayed-test' },
        'client-003',
        'Test 5 - Request 2',
      );

      log(`  Request 2: [${response2.timestamp}] ⏱️  ${response2.duration.toFixed(2)}ms`, colors.blue);

      if (response2.statusCode === 200) {
        log('  ✅ PASS: Request aceptado después de 2 segundos', colors.green);
        return { success: true, duration: response1.duration + response2.duration };
      } else {
        log(`  ❌ FAIL: Esperado 200, recibido ${response2.statusCode}`, colors.red);
        return { success: false, duration: response1.duration + response2.duration };
      }
    } catch (error) {
      const timeInfo = error.timestamp ? `[${error.timestamp}] ⏱️  ${error.duration.toFixed(2)}ms` : '';
      log(`  ❌ FAIL: Error - ${error.error?.message || error.message} ${timeInfo}`, colors.red);
      return { success: false, duration: error.duration || 0 };
    }
  });

  // Test 6: Health check
  tests.push(async () => {
    log('\nTest 6: Health check', colors.yellow);
    return new Promise((resolve) => {
      const startTime = process.hrtime.bigint();
      const timestamp = new Date().toISOString();
      const options = {
        hostname: new URL(API_URL).hostname,
        port: new URL(API_URL).port || 3000,
        path: '/health',
        method: 'POST',
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const durationMs = Number(endTime - startTime) / 1000000;
          log(`  [${timestamp}] ⏱️  ${durationMs.toFixed(2)}ms`, colors.blue);
          
          if (res.statusCode === 200) {
            log('  ✅ PASS: Health check OK', colors.green);
            resolve({ success: true, duration: durationMs });
          } else {
            log(`  ❌ FAIL: Esperado 200, recibido ${res.statusCode}`, colors.red);
            resolve({ success: false, duration: durationMs });
          }
        });
      });

      req.on('error', (error) => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;
        log(`  ❌ FAIL: Error - ${error.message} [${timestamp}] ⏱️  ${durationMs.toFixed(2)}ms`, colors.red);
        resolve({ success: false, duration: durationMs });
      });

      req.end();
    });
  });

  // Ejecutar todos los tests
  const testStartTime = process.hrtime.bigint();
  const testStartTimestamp = new Date().toISOString();
  log(`\n🕐 Inicio de pruebas: ${testStartTimestamp}\n`, colors.cyan);
  
  const results = [];
  for (const test of tests) {
    const result = await test();
    results.push(result);
  }

  const testEndTime = process.hrtime.bigint();
  const testEndTimestamp = new Date().toISOString();
  const totalDurationMs = Number(testEndTime - testStartTime) / 1000000;
  const totalDurationSec = totalDurationMs / 1000;

  // Resumen
  log('\n' + '='.repeat(50), colors.cyan);
  const passed = results.filter((r) => r.success || r === true).length;
  const total = results.length;
  const totalRequestTime = results.reduce((sum, r) => {
    if (typeof r === 'object' && r.duration) {
      return sum + r.duration;
    }
    return sum;
  }, 0);
  
  log(`\n📊 Resumen: ${passed}/${total} tests pasaron`, colors.cyan);
  log(`🕐 Inicio: ${testStartTimestamp}`, colors.blue);
  log(`🕐 Fin: ${testEndTimestamp}`, colors.blue);
  log(`⏱️  Tiempo total de ejecución: ${totalDurationSec.toFixed(2)}s (${totalDurationMs.toFixed(2)}ms)`, colors.blue);
  log(`⏱️  Tiempo total de requests: ${totalRequestTime.toFixed(2)}ms`, colors.blue);
  
  if (passed === total) {
    log('🎉 ¡Todos los tests pasaron!', colors.green);
  } else {
    log('⚠️  Algunos tests fallaron', colors.yellow);
  }
  log('\n');
}

// Verificar conexión antes de ejecutar tests
async function checkConnection() {
  return new Promise((resolve) => {
    const options = {
      hostname: new URL(API_URL).hostname,
      port: new URL(API_URL).port || 3000,
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
  log('🔍 Verificando conexión con el servidor...', colors.blue);
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    log(`\n❌ No se pudo conectar a ${API_URL}`, colors.red);
    log('   Asegúrate de que el servidor esté ejecutándose:', colors.yellow);
    log('   npm run start:dev\n', colors.yellow);
    process.exit(1);
  }
  
  log('✅ Conexión establecida\n', colors.green);
  await runTests();
})();


