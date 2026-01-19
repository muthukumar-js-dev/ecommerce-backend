#!/bin/bash

# Apply Resource Right-Sizing Script
# Applies right-sizing recommendations to Kubernetes deployments

set -e

NAMESPACE=${1:-"ecommerce-prod"}
DRY_RUN=${2:-"true"}

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Resource Right-Sizing Application"
echo "========================================="
echo "Namespace: $NAMESPACE"
echo "Dry Run: $DRY_RUN"
echo ""

# Generate recommendations
echo -e "${BLUE}=== 1. Generating Recommendations ===${NC}"
echo ""

npx ts-node scripts/cost-optimization/resource-analyzer.ts > recommendations.json

if [ ! -s recommendations.json ]; then
    echo -e "${YELLOW}No recommendations generated${NC}"
    exit 0
fi

# Parse recommendations
TOTAL_RECOMMENDATIONS=$(cat recommendations.json | jq '.totalRecommendations')
TOTAL_SAVINGS=$(cat recommendations.json | jq '.totalMonthlySavings')

echo -e "${GREEN}Found $TOTAL_RECOMMENDATIONS recommendations${NC}"
echo -e "${GREEN}Potential monthly savings: \$$TOTAL_SAVINGS${NC}"
echo ""

# Review recommendations with significant savings
echo -e "${BLUE}=== 2. High-Impact Recommendations ===${NC}"
echo ""

cat recommendations.json | jq -r '.recommendations[] | select(.savings > 10) | 
    "Pod: \(.resource)\n  Current: CPU \(.currentSize.cpu), Memory \(.currentSize.memory)\n  Recommended: CPU \(.recommendedSize.cpu), Memory \(.recommendedSize.memory)\n  Monthly Savings: $\(.savings)\n"'

if [ "$DRY_RUN" == "true" ]; then
    echo ""
    echo -e "${YELLOW}=== DRY RUN MODE ===${NC}"
    echo "To apply changes, run:"
    echo "  bash scripts/cost-optimization/apply-rightsizing.sh $NAMESPACE false"
    exit 0
fi

# Apply recommendations
echo ""
echo -e "${BLUE}=== 3. Applying Recommendations ===${NC}"
echo ""

# Confirm before applying
read -p "Apply these recommendations? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled"
    exit 0
fi

APPLIED=0
FAILED=0

while IFS= read -r recommendation; do
    POD=$(echo $recommendation | jq -r '.resource')
    DEPLOYMENT=$(echo $POD | sed 's/-[^-]*$//')  # Remove pod hash
    NEW_CPU=$(echo $recommendation | jq -r '.recommendedSize.cpu')
    NEW_MEMORY=$(echo $recommendation | jq -r '.recommendedSize.memory')
    
    echo "Updating $DEPLOYMENT..."
    echo "  CPU: $NEW_CPU"
    echo "  Memory: $NEW_MEMORY"
    
    # Update deployment
    if kubectl set resources deployment/$DEPLOYMENT \
        --requests=cpu=$NEW_CPU,memory=$NEW_MEMORY \
        -n $NAMESPACE 2>/dev/null; then
        
        echo -e "${GREEN}  ✓ Updated successfully${NC}"
        ((APPLIED++))
    else
        echo -e "${RED}  ✗ Failed to update${NC}"
        ((FAILED++))
    fi
    
    echo ""
done < <(cat recommendations.json | jq -c '.recommendations[] | select(.savings > 10)')

echo ""
echo -e "${BLUE}=== 4. Summary ===${NC}"
echo ""
echo "Applied: $APPLIED"
echo "Failed: $FAILED"
echo ""

if [ $APPLIED -gt 0 ]; then
    echo -e "${GREEN}✓ Right-sizing applied successfully${NC}"
    echo ""
    echo "Monitor the deployments:"
    echo "  kubectl get pods -n $NAMESPACE -w"
    echo ""
    echo "Rollback if needed:"
    echo "  kubectl rollout undo deployment/<name> -n $NAMESPACE"
else
    echo -e "${YELLOW}No changes applied${NC}"
fi

# Cleanup
rm -f recommendations.json
