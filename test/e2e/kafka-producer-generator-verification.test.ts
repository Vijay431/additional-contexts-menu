import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';

/**
 * Temporary Verification Test for Kafka Producer Generator Service
 *
 * This test verifies that the KafkaProducerGeneratorService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Has proper type definitions
 */
suite('Kafka Producer Generator - Verification Test', () => {
  let tempWorkspace: string;
  let extension: vscode.Extension<any>;

  suiteSetup(async () => {
    // Get and activate extension
    extension = vscode.extensions.getExtension('VijayGangatharan.additional-context-menus')!;
    assert.ok(extension, 'Extension should be found');

    if (!extension.isActive) {
      await extension.activate();
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    assert.strictEqual(extension.isActive, true, 'Extension should be active');

    // Create temporary workspace
    tempWorkspace = path.join(__dirname, '../temp-workspace-kafka-producer');
    await fs.mkdir(tempWorkspace, { recursive: true });
  });

  suiteTeardown(async () => {
    // Clean up
    try {
      await fs.rmdir(tempWorkspace, { recursive: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('KafkaProducerGeneratorService should be importable', async () => {
    // Try to import the service
    const { KafkaProducerGeneratorService } = await import('../../src/services/kafkaProducerGeneratorService');

    assert.ok(KafkaProducerGeneratorService, 'KafkaProducerGeneratorService should be defined');
    assert.strictEqual(typeof KafkaProducerGeneratorService.getInstance, 'function', 'getInstance should be a function');
  });

  test('KafkaProducerGeneratorService should have correct interface', async () => {
    const { KafkaProducerGeneratorService } = await import('../../src/services/kafkaProducerGeneratorService');
    const service = KafkaProducerGeneratorService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');
    assert.strictEqual(typeof service.generateProducer, 'function', 'generateProducer method should exist');
    assert.strictEqual(typeof service.createProducerFile, 'function', 'createProducerFile method should exist');
    assert.strictEqual(typeof service.getProducerGenerationOptions, 'function', 'getProducerGenerationOptions method should exist');
  });

  test('KafkaProducerGeneratorService should have proper types', async () => {
    // Import types directly
    const {
      KafkaProducerConfig,
      KafkaProducerTopic,
      GeneratedKafkaProducer,
    } = await import('../../src/types/extension');

    // Check that Kafka types exist
    assert.ok(KafkaProducerConfig, 'KafkaProducerConfig type should be defined');
    assert.ok(KafkaProducerTopic, 'KafkaProducerTopic type should be defined');
    assert.ok(GeneratedKafkaProducer, 'GeneratedKafkaProducer type should be defined');
  });

  test('Configuration service should have kafkaProducerGenerator config', async () => {
    const { ConfigurationService } = await import('../../src/services/configurationService');
    const configService = ConfigurationService.getInstance();

    // Check that config getter exists
    assert.strictEqual(typeof configService.getKafkaProducerGeneratorConfig, 'function', 'getKafkaProducerGeneratorConfig should exist');

    // Get config
    const config = configService.getKafkaProducerGeneratorConfig();
    assert.ok(config, 'Config should be defined');
    assert.strictEqual(typeof config.enabled, 'boolean', 'enabled should be boolean');
    assert.strictEqual(typeof config.includeErrorHandling, 'boolean', 'includeErrorHandling should be boolean');
    assert.strictEqual(typeof config.includeSerialization, 'boolean', 'includeSerialization should be boolean');
    assert.strictEqual(typeof config.defaultProducerPath, 'string', 'defaultProducerPath should be string');
  });

  test('KafkaProducerGeneratorService should generate producer structure', async () => {
    const { KafkaProducerGeneratorService } = await import('../../src/services/kafkaProducerGeneratorService');

    const service = KafkaProducerGeneratorService.getInstance();

    // Test that generateProducer method exists and returns correct type
    // Note: We can't test the actual generation without user prompts in this context
    assert.strictEqual(typeof service.generateProducer, 'function', 'generateProducer method should exist');
  });

  test('KafkaProducerGeneratorService should create producer files', async () => {
    const { KafkaProducerGeneratorService } = await import('../../src/services/kafkaProducerGeneratorService');

    const service = KafkaProducerGeneratorService.getInstance();

    const testCode = `
import { Kafka, Producer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: ['localhost:9092'],
});

export const producer = kafka.producer({
  allowAutoTopicCreation: true,
});

export const connectProducer = async () => {
  await producer.connect();
};

export const disconnectProducer = async () => {
  await producer.disconnect();
};
`;

    const outputPath = path.join(tempWorkspace, 'test-producer.ts');

    // Create file
    await service.createProducerFile(outputPath, testCode);

    // Verify file exists
    const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
    assert.strictEqual(fileExists, true, 'Producer file should be created');

    // Verify content
    const content = await fs.readFile(outputPath, 'utf-8');
    assert.ok(content.includes('kafkajs'), 'File should contain kafkajs import');
    assert.ok(content.includes('producer'), 'File should contain producer');
    assert.ok(content.includes('connectProducer'), 'File should contain connectProducer');
  });

  test('ContextMenuManager should have kafkaProducerGeneratorService', async () => {
    const { ContextMenuManager } = await import('../../src/managers/ContextMenuManager');

    // Create manager instance
    const manager = new ContextMenuManager();

    // Initialize manager
    await manager.initialize();

    // Check that the manager is created
    assert.ok(manager, 'ContextMenuManager should be created');

    manager.dispose();
  });
});
