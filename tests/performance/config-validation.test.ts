/**
 * Simplified Performance Test Configuration
 * This validates the Artillery configuration is correct
 */

describe('Performance Test Configuration', () => {
    const fs = require('fs');
    const path = require('path');
    const yaml = require('js-yaml');

    it('should have valid Artillery configuration file', () => {
        const configPath = path.join(__dirname, '../../performance/order-placement.yml');
        expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should parse Artillery YAML configuration', () => {
        const configPath = path.join(__dirname, '../../performance/order-placement.yml');
        const fileContents = fs.readFileSync(configPath, 'utf8');

        let config;
        expect(() => {
            config = yaml.load(fileContents);
        }).not.toThrow();

        expect(config).toBeDefined();
        expect(config.config).toBeDefined();
        expect(config.scenarios).toBeDefined();
    });

    it('should have correct load phases configured', () => {
        const configPath = path.join(__dirname, '../../performance/order-placement.yml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);

        expect(config.config.phases).toBeDefined();
        expect(config.config.phases.length).toBeGreaterThan(0);

        // Check for warm-up phase
        const warmupPhase = config.config.phases.find((p: any) => p.name === 'Warm up');
        expect(warmupPhase).toBeDefined();
        expect(warmupPhase.arrivalRate).toBe(10);

        // Check for sustained load phase
        const sustainedPhase = config.config.phases.find((p: any) => p.name === 'Sustained load');
        expect(sustainedPhase).toBeDefined();
        expect(sustainedPhase.arrivalRate).toBe(50);
    });

    it('should have scenarios configured', () => {
        const configPath = path.join(__dirname, '../../performance/order-placement.yml');
        const fileContents = fs.readFileSync(configPath, 'utf8');
        const config = yaml.load(fileContents);

        expect(config.scenarios).toBeDefined();
        expect(config.scenarios.length).toBeGreaterThan(0);

        // Check for Complete Order Flow scenario
        const orderFlowScenario = config.scenarios.find((s: any) => s.name === 'Complete Order Flow');
        expect(orderFlowScenario).toBeDefined();
        expect(orderFlowScenario.weight).toBe(70);
        expect(orderFlowScenario.flow).toBeDefined();
    });

    it('should have processor file', () => {
        const processorPath = path.join(__dirname, '../../performance/processor.js');
        expect(fs.existsSync(processorPath)).toBe(true);
    });
});
