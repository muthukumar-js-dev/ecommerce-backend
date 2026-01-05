# Kafka Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start Kafka

```bash
docker-compose -f docker-compose.kafka.yml up -d
```

Wait ~30 seconds for all services to start.

### Step 2: Create Topics

```bash
# Windows
.\scripts\kafka\create-topics.ps1

# Linux/Mac
./scripts/kafka/create-topics.sh
```

### Step 3: Verify Setup

```bash
# Windows
.\scripts\kafka\verify-setup.ps1

# Or manually check
http://localhost:8080  # Kafka UI
```

---

## ✅ Verification

Your setup is ready when you see:
- ✓ Kafka UI accessible at http://localhost:8080
- ✓ All 6 topics visible in Kafka UI
- ✓ Schema Registry at http://localhost:8081

---

## 🎯 Next Steps

### Run Tests
```bash
npm run test:kafka
```

### Start Monitoring (Optional)
```bash
docker-compose -f docker-compose.monitoring.yml up -d

# Access:
# Grafana:    http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

### Integrate with Application
See `KAFKA-SETUP.md` for detailed integration guide.

---

## 🛠️ Common Commands

### View Logs
```bash
docker-compose -f docker-compose.kafka.yml logs -f kafka
```

### List Topics
```bash
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Describe Topic
```bash
docker exec kafka kafka-topics --describe --topic order.events --bootstrap-server localhost:9092
```

### Stop Kafka
```bash
docker-compose -f docker-compose.kafka.yml down
```

### Stop and Remove Data
```bash
docker-compose -f docker-compose.kafka.yml down -v
```

---

## 🆘 Troubleshooting

### Kafka not starting?
```bash
# Check Docker
docker ps

# View logs
docker-compose -f docker-compose.kafka.yml logs kafka

# Restart
docker-compose -f docker-compose.kafka.yml restart
```

### Topics not created?
```bash
# Verify Kafka is running
docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

# Re-run topic creation
.\scripts\kafka\create-topics.ps1
```

### Port conflicts?
Edit `docker-compose.kafka.yml` and change port mappings.

---

## 📚 Full Documentation

See `KAFKA-SETUP.md` for comprehensive documentation.
