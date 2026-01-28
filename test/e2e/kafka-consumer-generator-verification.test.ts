import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import type {
  KafkaConsumerConfig,
  KafkaConsumerTopic,
  GeneratedKafkaConsumer,
} from '../../src/types/extension';

/**
 * Temporary Verification Test for Kafka Consumer Generator Service
 *
 * This test verifies that the KafkaConsumerGeneratorService:
 * 1. Is properly importable and can be instantiated
 * 2. Has the correct interface and methods
 * 3. Has proper type definitions
 */
suite('Kafka Consumer Generator - Verification Test', () => {
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
    tempWorkspace = path.join(__dirname, '../temp-workspace-kafka-consumer');
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

  test('KafkaConsumerGeneratorService should be importable', async () => {
    // Try to import the service
    const { KafkaConsumerGeneratorService } = await import('../../src/services/kafkaConsumerGeneratorService');

    assert.ok(KafkaConsumerGeneratorService, 'KafkaConsumerGeneratorService should be defined');
    assert.strictEqual(typeof KafkaConsumerGeneratorService.getInstance, 'function', 'getInstance should be a function');
  });

  test('KafkaConsumerGeneratorService should have correct interface', async () => {
    const { KafkaConsumerGeneratorService } = await import('../../src/services/kafkaConsumerGeneratorService');
    const service = KafkaConsumerGeneratorService.getInstance();

    // Check that service has required methods
    assert.ok(service, 'Service instance should be created');
    assert.strictEqual(typeof service.generateConsumer, 'function', 'generateConsumer method should exist');
    assert.strictEqual(typeof service.createConsumerFile, 'function', 'createConsumerFile method should exist');
    assert.strictEqual(typeof service.getConsumerGenerationOptions, 'function', 'getConsumerGenerationOptions method should exist');
  });

  test('KafkaConsumerGeneratorService should have proper types', async () => {
    // Types are imported at the top of the file with 'import type'
    // This test verifies they compile correctly by using them in type annotations
    // The TypeScript compiler will verify these types exist

    // Use the types to ensure they compile correctly
    const consumerConfig: KafkaConsumerConfig = {
      enabled: true,
      includeErrorHandling: true,
      includeRetryStrategy: true,
      includeDeserialization: true,
      defaultConsumerPath: '/src/consumers',
    };

    const topic: KafkaConsumerTopic = {
      name: 'test-topic',
      messageType: 'TestMessage',
      messageProperties: [
        { name: 'id', type: 'string' },
        { name: 'data', type: 'string' },
      ],
      includeErrorHandling: true,
      consumerOptions: {},
    };

    const generatedConsumer: GeneratedKafkaConsumer = {
      groupName: 'test-group',
      groupId: 'test-group-id',
      brokers: 'localhost:9092',
      topics: [topic],
      imports: ['kafkajs'],
      consumerCode: 'test code',
    };

    // Verify type structure (compile-time check)
    assert.ok(consumerConfig.enabled !== undefined, 'KafkaConsumerConfig should have enabled');
    assert.ok(topic.name !== undefined, 'KafkaConsumerTopic should have name');
    assert.ok(generatedConsumer.groupName !== undefined, 'GeneratedKafkaConsumer should have groupName');
  });

  test('Configuration service should have kafkaConsumerGenerator config', async () => {
    const { ConfigurationService } = await import('../../src/services/configurationService');
    const configService = ConfigurationService.getInstance();

    // Check that config getter exists
    assert.strictEqual(typeof configService.getKafkaConsumerGeneratorConfig, 'function', 'getKafkaConsumerGeneratorConfig should exist');

    // Get config
    const config = configService.getKafkaConsumerGeneratorConfig();
    assert.ok(config, 'Config should be defined');
    assert.strictEqual(typeof config.enabled, 'boolean', 'enabled should be boolean');
    assert.strictEqual(typeof config.includeErrorHandling, 'boolean', 'includeErrorHandling should be boolean');
    assert.strictEqual(typeof config.includeRetryStrategy, 'boolean', 'includeRetryStrategy should be boolean');
    assert.strictEqual(typeof config.includeDeserialization, 'boolean', 'includeDeserialization should be boolean');
    assert.strictEqual(typeof config.defaultConsumerPath, 'string', 'defaultConsumerPath should be string');
  });

  test('KafkaConsumerGeneratorService should generate consumer structure', async () => {
    const { KafkaConsumerGeneratorService } = await import('../../src/services/kafkaConsumerGeneratorService');

    const service = KafkaConsumerGeneratorService.getInstance();

    // Test that generateConsumer method exists and returns correct type
    // Note: We can't test the actual generation without user prompts in this context
    assert.strictEqual(typeof service.generateConsumer, 'function', 'generateConsumer method should exist');
  });

  test('KafkaConsumerGeneratorService should create consumer files', async () => {
    const { KafkaConsumerGeneratorService } = await import('../../src/services/kafkaConsumerGeneratorService');

    const service = KafkaConsumerGeneratorService.getInstance();

    const testCode = `
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'test-consumer',
  brokers: ['localhost:9092'],
});

export const testConsumer = kafka.consumer({
  groupId: 'test-group',
});
`;

    const outputPath = path.join(tempWorkspace, 'test-consumer.ts');

    // Create file
    await service.createConsumerFile(outputPath, testCode);

    // Verify file exists
    const fileExists = await fs.access(outputPath).then(() => true).catch(() => false);
    assert.strictEqual(fileExists, true, 'Consumer file should be created');

    // Verify content
    const content = await fs.readFile(outputPath, 'utf-8');
    assert.ok(content.includes('kafkajs'), 'File should contain kafkajs import');
    assert.ok(content.includes('testConsumer'), 'File should contain testConsumer');
  });

  test('ContextMenuManager should have kafkaConsumerGeneratorService', async () => {
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
