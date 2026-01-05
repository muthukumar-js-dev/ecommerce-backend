# Kafka Infrastructure Verification Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kafka Infrastructure Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Check Docker is running
Write-Host "1. Checking Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   ✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Docker is not running" -ForegroundColor Red
    $allPassed = $false
}

# Check Kafka containers
Write-Host ""
Write-Host "2. Checking Kafka containers..." -ForegroundColor Yellow
$containers = @("zookeeper", "kafka", "schema-registry", "kafka-ui")
foreach ($container in $containers) {
    $status = docker ps --filter "name=$container" --format "{{.Status}}"
    if ($status -match "Up") {
        Write-Host "   ✓ $container is running" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $container is not running" -ForegroundColor Red
        $allPassed = $false
    }
}

# Check Kafka connectivity
Write-Host ""
Write-Host "3. Checking Kafka connectivity..." -ForegroundColor Yellow
try {
    $result = docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Kafka broker is accessible" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Cannot connect to Kafka broker" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "   ✗ Error checking Kafka connectivity" -ForegroundColor Red
    $allPassed = $false
}

# Check topics
Write-Host ""
Write-Host "4. Checking Kafka topics..." -ForegroundColor Yellow
$expectedTopics = @("user.events", "order.events", "payment.events", "notification.events", "product.events", "dlq.events")
try {
    $topics = docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>&1
    foreach ($topic in $expectedTopics) {
        if ($topics -match $topic) {
            Write-Host "   ✓ $topic exists" -ForegroundColor Green
        } else {
            Write-Host "   ✗ $topic is missing" -ForegroundColor Red
            $allPassed = $false
        }
    }
} catch {
    Write-Host "   ✗ Error checking topics" -ForegroundColor Red
    $allPassed = $false
}

# Check Schema Registry
Write-Host ""
Write-Host "5. Checking Schema Registry..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081/" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Schema Registry is accessible" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Schema Registry returned status $($response.StatusCode)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "   ✗ Cannot connect to Schema Registry" -ForegroundColor Red
    $allPassed = $false
}

# Check Kafka UI
Write-Host ""
Write-Host "6. Checking Kafka UI..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✓ Kafka UI is accessible at http://localhost:8080" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Kafka UI returned status $($response.StatusCode)" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "   ✗ Cannot connect to Kafka UI" -ForegroundColor Red
    $allPassed = $false
}

# Check monitoring (if running)
Write-Host ""
Write-Host "7. Checking Monitoring (optional)..." -ForegroundColor Yellow
$monitoringContainers = @("prometheus", "grafana", "kafka-exporter")
$monitoringRunning = $false
foreach ($container in $monitoringContainers) {
    $status = docker ps --filter "name=$container" --format "{{.Status}}"
    if ($status -match "Up") {
        Write-Host "   ✓ $container is running" -ForegroundColor Green
        $monitoringRunning = $true
    }
}
if (-not $monitoringRunning) {
    Write-Host "   ℹ Monitoring stack not running (optional)" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Kafka infrastructure is ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Access points:" -ForegroundColor Cyan
    Write-Host "  - Kafka UI:        http://localhost:8080" -ForegroundColor White
    Write-Host "  - Schema Registry: http://localhost:8081" -ForegroundColor White
    Write-Host "  - Kafka Broker:    localhost:9092" -ForegroundColor White
    if ($monitoringRunning) {
        Write-Host "  - Prometheus:      http://localhost:9090" -ForegroundColor White
        Write-Host "  - Grafana:         http://localhost:3001" -ForegroundColor White
    }
} else {
    Write-Host "✗ Some checks failed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Ensure Docker is running" -ForegroundColor White
    Write-Host "  2. Start Kafka: docker-compose -f docker-compose.kafka.yml up -d" -ForegroundColor White
    Write-Host "  3. Create topics: .\scripts\kafka\create-topics.ps1" -ForegroundColor White
    Write-Host "  4. Check logs: docker-compose -f docker-compose.kafka.yml logs" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan
