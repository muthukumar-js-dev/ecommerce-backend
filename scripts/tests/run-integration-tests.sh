#!/bin/bash

# Integration Test Runner
# Runs all integration tests for Phase 4 components

set -e

echo "========================================="
echo "Phase 4 Integration Tests"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0

# Function to run test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: ${test_name}${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED: ${test_name}${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED: ${test_name}${NC}"
        ((FAILED++))
    fi
    echo ""
}

# 1. Redis Cache Tests
echo "=== Redis Cache Tests ==="
run_test "Redis Connection" "npm run test:integration -- tests/integration/cache/redis.test.ts -t 'Redis Connection'"
run_test "Cache Service" "npm run test:integration -- tests/integration/cache/redis.test.ts -t 'Cache Service'"
run_test "Session Service" "npm run test:integration -- tests/integration/cache/redis.test.ts -t 'Session Service'"
run_test "Rate Limiter" "npm run test:integration -- tests/integration/cache/redis.test.ts -t 'Rate Limiter'"

# 2. Database Tests
echo "=== Database Tests ==="
run_test "MongoDB Connection" "npm run test:integration -- tests/integration/database/database.test.ts -t 'Connection Pool'"
run_test "Database Indexes" "npm run test:integration -- tests/integration/database/database.test.ts -t 'Indexes'"
run_test "Query Profiling" "npm run test:integration -- tests/integration/database/database.test.ts -t 'Profiling'"
run_test "Database Monitoring" "npm run test:integration -- tests/integration/database/database.test.ts -t 'Monitoring'"

# 3. Health Checks
echo "=== Health Checks ==="
run_test "API Health" "curl -f http://localhost:3000/health || exit 1"
run_test "Database Health" "kubectl exec -n ecommerce-prod mongodb-0 -- mongosh --eval 'db.adminCommand({ping: 1})' || exit 1"
run_test "Redis Health" "kubectl exec -n ecommerce-prod redis-master-0 -- redis-cli ping || exit 1"

# 4. Performance Tests
echo "=== Performance Tests ==="
run_test "Cache Performance" "npm run test:integration -- tests/integration/cache/redis.test.ts -t 'Performance'"
run_test "Database Performance" "npm run test:integration -- tests/integration/database/database.test.ts -t 'Performance'"

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    exit 1
fi
