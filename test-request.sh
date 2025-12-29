#!/bin/bash

# Script de prueba usando curl para validar el funcionamiento del API Rate Validator

API_URL="${API_URL:-http://localhost:3000}"
ENDPOINT="${API_URL}/validate"

echo "🧪 Iniciando pruebas del API Rate Validator"
echo "================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Request válido
echo -e "${YELLOW}Test 1: Request válido (primera vez)${NC}"
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "client: client-001" \
  -d '{"key":"value","data":"test"}')

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | sed '$d')

if [ "$HTTP_CODE1" == "200" ]; then
  echo -e "${GREEN}  ✅ PASS: Request aceptado correctamente${NC}"
else
  echo -e "${RED}  ❌ FAIL: Esperado 200, recibido $HTTP_CODE1${NC}"
fi
echo ""

# Test 2: Request duplicado
echo -e "${YELLOW}Test 2: Request duplicado (mismo body y cliente)${NC}"
sleep 0.1
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "client: client-001" \
  -d '{"key":"value","data":"test"}')

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)

if [ "$HTTP_CODE2" == "409" ]; then
  echo -e "${GREEN}  ✅ PASS: Duplicado detectado correctamente (409)${NC}"
else
  echo -e "${RED}  ❌ FAIL: Esperado 409, recibido $HTTP_CODE2${NC}"
fi
echo ""

# Test 3: Request sin header client
echo -e "${YELLOW}Test 3: Request sin header client${NC}"
RESPONSE3=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"key":"value"}')

HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)

if [ "$HTTP_CODE3" == "400" ]; then
  echo -e "${GREEN}  ✅ PASS: Error 400 por falta de header${NC}"
else
  echo -e "${RED}  ❌ FAIL: Esperado 400, recibido $HTTP_CODE3${NC}"
fi
echo ""

# Test 4: Request con mismo body pero diferente cliente
echo -e "${YELLOW}Test 4: Request con mismo body pero diferente cliente${NC}"
RESPONSE4=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "client: client-002" \
  -d '{"key":"value","data":"test"}')

HTTP_CODE4=$(echo "$RESPONSE4" | tail -n1)

if [ "$HTTP_CODE4" == "200" ]; then
  echo -e "${GREEN}  ✅ PASS: Request aceptado (diferente cliente)${NC}"
else
  echo -e "${RED}  ❌ FAIL: Esperado 200, recibido $HTTP_CODE4${NC}"
fi
echo ""

# Test 5: Request después de 2+ segundos
echo -e "${YELLOW}Test 5: Request después de 2+ segundos${NC}"
echo -e "${BLUE}  ⏳ Esperando 2.5 segundos...${NC}"
sleep 2.5

RESPONSE5=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "client: client-003" \
  -d '{"key":"value","data":"delayed-test"}')

HTTP_CODE5=$(echo "$RESPONSE5" | tail -n1)

if [ "$HTTP_CODE5" == "200" ]; then
  echo -e "${GREEN}  ✅ PASS: Request aceptado después de 2 segundos${NC}"
else
  echo -e "${RED}  ❌ FAIL: Esperado 200, recibido $HTTP_CODE5${NC}"
fi
echo ""

# Test 6: Health check
echo -e "${YELLOW}Test 6: Health check${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)

if [ "$HEALTH_CODE" == "200" ]; then
  echo -e "${GREEN}  ✅ PASS: Health check OK${NC}"
else
  echo -e "${RED}  ❌ FAIL: Esperado 200, recibido $HEALTH_CODE${NC}"
fi
echo ""

echo "================================================"
echo -e "${BLUE}📊 Pruebas completadas${NC}"
echo ""


