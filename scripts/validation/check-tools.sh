#!/bin/bash

# Tool Installation Verification Script
# Checks if all required validation tools are installed

set -e

echo "========================================="
echo "Validation Tools Check"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

MISSING_TOOLS=()
INSTALLED_TOOLS=()

# Function to check tool
check_tool() {
    local tool=$1
    local install_cmd=$2
    
    if command -v "$tool" &> /dev/null; then
        local version=$($tool --version 2>&1 | head -n 1)
        echo -e "${GREEN}✓ $tool${NC} - $version"
        INSTALLED_TOOLS+=("$tool")
    else
        echo -e "${RED}✗ $tool${NC} - Not installed"
        echo -e "  ${YELLOW}Install: $install_cmd${NC}"
        MISSING_TOOLS+=("$tool")
    fi
}

echo "Checking required tools..."
echo ""

# 1. Trivy (Container Scanning)
check_tool "trivy" "brew install aquasecurity/trivy/trivy (macOS) or see https://aquasecurity.github.io/trivy"

# 2. TruffleHog (Secret Scanning)
check_tool "trufflehog" "pip install trufflehog or brew install trufflehog (macOS)"

# 3. Artillery (Load Testing)
check_tool "artillery" "npm install -g artillery"

# 4. kubectl (Kubernetes)
check_tool "kubectl" "brew install kubectl (macOS) or see https://kubernetes.io/docs/tasks/tools/"

# 5. Node.js
check_tool "node" "brew install node (macOS) or see https://nodejs.org/"

# 6. npm
check_tool "npm" "Comes with Node.js"

# 7. Docker
check_tool "docker" "brew install docker (macOS) or see https://docs.docker.com/get-docker/"

# 8. jq (JSON processor)
check_tool "jq" "brew install jq (macOS) or apt-get install jq (Linux)"

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""

echo "Installed: ${#INSTALLED_TOOLS[@]}"
echo "Missing: ${#MISSING_TOOLS[@]}"

if [ ${#MISSING_TOOLS[@]} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All required tools are installed!${NC}"
    echo ""
    echo "You can now run validations:"
    echo "  bash scripts/validation/run-all-validations.sh"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tools are missing${NC}"
    echo ""
    echo "Missing tools:"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo "  - $tool"
    done
    echo ""
    echo "Install missing tools and run this script again."
    exit 1
fi
