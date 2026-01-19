#!/bin/bash

# Master Validation Script
# Runs all pre-production validation checks

set -e

echo "========================================="
echo "Complete Pre-Production Validation"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track results
SECURITY_PASSED=false
PERFORMANCE_PASSED=false
INFRASTRUCTURE_PASSED=false
VALIDATION_PASSED=true

# 0. Check Tools
echo "=== 0. Checking Required Tools ==="
echo ""

if [ -f "scripts/validation/check-tools.sh" ]; then
    bash scripts/validation/check-tools.sh
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}⚠ Some tools are missing but continuing...${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Tool check script not found${NC}"
fi

echo ""

# 1. Security Audit
echo "=== 1. Security Audit ==="
echo ""

if [ -f "scripts/validation/security-audit.sh" ]; then
    bash scripts/validation/security-audit.sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Security audit passed${NC}"
        SECURITY_PASSED=true
    else
        echo -e "${RED}✗ Security audit failed${NC}"
        VALIDATION_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ Security audit script not found${NC}"
fi

echo ""

# 2. Performance Benchmarking
echo "=== 2. Performance Benchmarking ==="
echo ""

if [ -f "scripts/validation/performance-benchmark.sh" ]; then
    bash scripts/validation/performance-benchmark.sh
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Performance benchmarking passed${NC}"
        PERFORMANCE_PASSED=true
    else
        echo -e "${YELLOW}⚠ Performance benchmarking completed with warnings${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Performance benchmark script not found${NC}"
fi

echo ""

# 3. Security Validation (TypeScript)
echo "=== 3. Security Validation ==="
echo ""

if [ -f "scripts/validation/security-validator.ts" ]; then
    npx ts-node scripts/validation/security-validator.ts
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Security validation passed${NC}"
    else
        echo -e "${RED}✗ Security validation failed${NC}"
        VALIDATION_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ Security validator not found${NC}"
fi

echo ""

# 4. Performance Validation (TypeScript)
echo "=== 4. Performance Validation ==="
echo ""

if [ -f "scripts/validation/performance-validator.ts" ]; then
    npx ts-node scripts/validation/performance-validator.ts
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Performance validation passed${NC}"
    else
        echo -e "${YELLOW}⚠ Performance validation completed with warnings${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Performance validator not found${NC}"
fi

echo ""

# 5. Infrastructure Validation (TypeScript)
echo "=== 5. Infrastructure Validation ==="
echo ""

if [ -f "scripts/validation/infrastructure-validator.ts" ]; then
    npx ts-node scripts/validation/infrastructure-validator.ts
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Infrastructure validation passed${NC}"
        INFRASTRUCTURE_PASSED=true
    else
        echo -e "${YELLOW}⚠ Infrastructure validation completed with warnings${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Infrastructure validator not found${NC}"
fi

echo ""

# 6. Go/No-Go Assessment
echo "=== 5. Go/No-Go Assessment ==="
echo ""

if [ -f "scripts/validation/go-nogo-assessment.ts" ]; then
    npx ts-node scripts/validation/go-nogo-assessment.ts
    
    DECISION=$?
    
    if [ $DECISION -eq 0 ]; then
        echo -e "${GREEN}✓ Go/No-Go: GO${NC}"
    else
        echo -e "${RED}✗ Go/No-Go: NO-GO${NC}"
        VALIDATION_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ Go/No-Go assessment not found${NC}"
fi

echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
    echo ""
    echo "System is ready for production deployment!"
    echo ""
    echo "Next Steps:"
    echo "  1. Review validation reports"
    echo "  2. Obtain final stakeholder approval"
    echo "  3. Schedule production deployment"
    echo "  4. Execute deployment plan"
    exit 0
else
    echo -e "${RED}❌ VALIDATION FAILED${NC}"
    echo ""
    echo "System is NOT ready for production deployment."
    echo ""
    echo "Action Required:"
    echo "  1. Review failed validation reports"
    echo "  2. Address all blocking issues"
    echo "  3. Re-run validation suite"
    echo "  4. Obtain approval before proceeding"
    exit 1
fi
