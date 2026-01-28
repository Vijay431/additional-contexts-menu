import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { Logger } from '../utils/logger';
import { ConfigurationService } from './configurationService';
import { FileDiscoveryService } from './fileDiscoveryService';
import { ProjectDetectionService } from './projectDetectionService';

/**
 * Service for generating docker-compose.yml files based on project dependencies
 */
export class DockerComposeGeneratorService {
  private static instance: DockerComposeGeneratorService | undefined;
  private readonly projectDetectionService: ProjectDetectionService;
  private readonly fileDiscoveryService: FileDiscoveryService;
  private readonly configurationService: ConfigurationService;

  private constructor(
    projectDetectionService: ProjectDetectionService,
    fileDiscoveryService: FileDiscoveryService,
    configurationService: ConfigurationService,
  ) {
    this.projectDetectionService = projectDetectionService;
    this.fileDiscoveryService = fileDiscoveryService;
    this.configurationService = configurationService;
  }

  static getInstance(): DockerComposeGeneratorService {
    if (!DockerComposeGeneratorService.instance) {
      DockerComposeGeneratorService.instance = new DockerComposeGeneratorService(
        ProjectDetectionService.getInstance(),
        FileDiscoveryService.getInstance(),
        ConfigurationService.getInstance(),
      );
    }
    return DockerComposeGeneratorService.instance;
  }

  /**
   * Generate docker-compose.yml for the current workspace
   */
  async generateDockerCompose(): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        void vscode.window.showWarningMessage('Please open a workspace folder first.');
        return;
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Generating docker-compose.yml...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0 });

          // Analyze project dependencies
          const services = await this.detectServices(workspaceFolder.uri.fsPath);
          progress.report({ increment: 60 });

          // Generate docker-compose.yml content
          const composeContent = await this.buildDockerComposeContent(services, workspaceFolder.uri.fsPath);
          progress.report({ increment: 80 });

          // Write docker-compose.yml
          await this.writeDockerCompose(workspaceFolder.uri, composeContent);
          progress.report({ increment: 100 });

          Logger.info('docker-compose.yml generated successfully');
        },
      );
    } catch (error) {
      Logger.error('Error generating docker-compose.yml', error);
      void vscode.window.showErrorMessage(
        `Failed to generate docker-compose.yml: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Detect services based on package.json dependencies
   */
  private async detectServices(projectPath: string): Promise<DockerService[]> {
    const services: DockerService[] = [];

    // Read package.json
    const packageJsonPath = `${projectPath}/package.json`;
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      if (!packageJsonContent) {
        return services;
      }

      const packageJson = JSON.parse(packageJsonContent);
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Detect databases
      services.push(...this.detectDatabases(allDependencies));

      // Detect caches
      services.push(...this.detectCaches(allDependencies));

      // Detect message queues
      services.push(...this.detectMessageQueues(allDependencies));

      // Detect search engines
      services.push(...this.detectSearchEngines(allDependencies));
    } catch {
      // No package.json or unable to parse
    }

    return services;
  }

  /**
   * Detect database dependencies
   */
  private detectDatabases(dependencies: Record<string, string>): DockerService[] {
    const services: DockerService[] = [];
    const dbMapping: Record<string, DockerService> = {
      pg: {
        name: 'postgres',
        image: 'postgres:16-alpine',
        ports: ['5432:5432'],
        environment: {
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'postgres',
          POSTGRES_DB: 'mydb',
        },
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      },
      postgres: {
        name: 'postgres',
        image: 'postgres:16-alpine',
        ports: ['5432:5432'],
        environment: {
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'postgres',
          POSTGRES_DB: 'mydb',
        },
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      },
      mongodb: {
        name: 'mongodb',
        image: 'mongo:7',
        ports: ['27017:27017'],
        environment: {
          MONGO_INITDB_ROOT_USERNAME: 'mongo',
          MONGO_INITDB_ROOT_PASSWORD: 'mongo',
        },
        volumes: ['mongodb_data:/data/db'],
      },
      mongoose: {
        name: 'mongodb',
        image: 'mongo:7',
        ports: ['27017:27017'],
        environment: {
          MONGO_INITDB_ROOT_USERNAME: 'mongo',
          MONGO_INITDB_ROOT_PASSWORD: 'mongo',
        },
        volumes: ['mongodb_data:/data/db'],
      },
      mysql: {
        name: 'mysql',
        image: 'mysql:8',
        ports: ['3306:3306'],
        environment: {
          MYSQL_ROOT_PASSWORD: 'root',
          MYSQL_DATABASE: 'mydb',
        },
        volumes: ['mysql_data:/var/lib/mysql'],
      },
      mysql2: {
        name: 'mysql',
        image: 'mysql:8',
        ports: ['3306:3306'],
        environment: {
          MYSQL_ROOT_PASSWORD: 'root',
          MYSQL_DATABASE: 'mydb',
        },
        volumes: ['mysql_data:/var/lib/mysql'],
      },
      redis: {
        name: 'redis',
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
        volumes: ['redis_data:/data'],
      },
      '@prisma/client': {
        name: 'postgres',
        image: 'postgres:16-alpine',
        ports: ['5432:5432'],
        environment: {
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'postgres',
          POSTGRES_DB: 'mydb',
        },
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      },
      prisma: {
        name: 'postgres',
        image: 'postgres:16-alpine',
        ports: ['5432:5432'],
        environment: {
          POSTGRES_USER: 'postgres',
          POSTGRES_PASSWORD: 'postgres',
          POSTGRES_DB: 'mydb',
        },
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      },
      '@libsql/client': {
        name: 'turso',
        image: 'ghcr.io/tursodatabase/turso-cli:latest',
        ports: ['8080:8080'],
        environment: {
          TURSO_API_URL: 'http://local:8080',
        },
      },
      'better-sqlite3': {
        name: 'sqlite',
        image: 'nouchka/sqlite3:latest',
        volumes: ['sqlite_data:/root/db'],
      },
    };

    for (const [dep, service] of Object.entries(dbMapping)) {
      if (dependencies[dep]) {
        services.push(service);
        break; // Only add each service once
      }
    }

    return services;
  }

  /**
   * Detect cache dependencies
   */
  private detectCaches(dependencies: Record<string, string>): DockerService[] {
    const services: DockerService[] = [];

    // Redis is also a cache, check if we already added it
    if (dependencies.redis || dependencies['@redis/client']) {
      // Skip if already added as database
    }

    if (dependencies.memcached || dependencies['memjs']) {
      services.push({
        name: 'memcached',
        image: 'memcached:alpine',
        ports: ['11211:11211'],
      });
    }

    return services;
  }

  /**
   * Detect message queue dependencies
   */
  private detectMessageQueues(dependencies: Record<string, string>): DockerService[] {
    const services: DockerService[] = [];

    if (
      dependencies['amqplib'] ||
      dependencies['@nestjs/microservices'] ||
      dependencies['bullmq'] ||
      dependencies.bull
    ) {
      services.push({
        name: 'rabbitmq',
        image: 'rabbitmq:3-management-alpine',
        ports: ['5672:5672', '15672:15672'],
        environment: {
          RABBITMQ_DEFAULT_USER: 'guest',
          RABBITMQ_DEFAULT_PASS: 'guest',
        },
        volumes: ['rabbitmq_data:/var/lib/rabbitmq'],
      });
    }

    if (
      dependencies.kafka ||
      dependencies['kafkajs'] ||
      dependencies['@kafkajs/consumer'] ||
      dependencies['@kafkajs/producer']
    ) {
      services.push({
        name: 'kafka',
        image: 'confluentinc/cp-kafka:latest',
        ports: ['9092:9092'],
        environment: {
          KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181',
          KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:9092',
          KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
        },
        depends_on: ['zookeeper'],
      });

      services.push({
        name: 'zookeeper',
        image: 'confluentinc/cp-zookeeper:latest',
        ports: ['2181:2181'],
        environment: {
          ZOOKEEPER_CLIENT_PORT: '2181',
          ZOOKEEPER_TICK_TIME: '2000',
        },
        volumes: ['zookeeper_data:/var/lib/zookeeper/data'],
      });
    }

    return services;
  }

  /**
   * Detect search engine dependencies
   */
  private detectSearchEngines(dependencies: Record<string, string>): DockerService[] {
    const services: DockerService[] = [];

    if (
      dependencies['@elastic/elasticsearch'] ||
      dependencies['elasticsearch'] ||
      dependencies['@elastic/elasticsearch-cloud']
    ) {
      services.push({
        name: 'elasticsearch',
        image: 'elasticsearch:8.11.0',
        ports: ['9200:9200'],
        environment: {
          'discovery.type': 'single-node',
          'xpack.security.enabled': 'false',
          'ES_JAVA_OPTS': '-Xms512m -Xmx512m',
        },
        volumes: ['elasticsearch_data:/usr/share/elasticsearch/data'],
      });
    }

    if (dependencies['algoliasearch'] || dependencies.algolia) {
      // Algolia is a cloud service, skip local container
    }

    if (dependencies['typesense'] || dependencies['typesense-javascript'] || dependencies['@typesense/typesense']) {
      services.push({
        name: 'typesense',
        image: 'typesense/typesense:0.25.1',
        ports: ['8108:8108'],
        environment: {
          TYPESENSE_API_KEY: 'xyz',
        },
        volumes: ['typesense_data:/data'],
      });
    }

    return services;
  }

  /**
   * Build docker-compose.yml content from detected services
   */
  private async buildDockerComposeContent(services: DockerService[], projectPath: string): Promise<string> {
    const lines: string[] = [];

    lines.push('version: "3.8"');
    lines.push('');
    lines.push('services:');

    // Add app service if Dockerfile exists
    const hasDockerfile = await fs
      .access(`${projectPath}/Dockerfile`)
      .then(() => true)
      .catch(() => false);
    if (hasDockerfile) {
      lines.push('  app:');
      lines.push('    build: .');
      lines.push('    ports:');
      lines.push('      - "3000:3000"');
      lines.push('    environment:');
      lines.push('      - NODE_ENV=development');
      if (services.length > 0) {
        lines.push('    depends_on:');
        for (const service of services) {
          lines.push(`      - ${service.name}`);
        }
      }
      lines.push('');
    }

    // Add detected services
    const serviceNames = new Set<string>();
    for (const service of services) {
      if (serviceNames.has(service.name)) {
        continue; // Avoid duplicates
      }
      serviceNames.add(service.name);

      lines.push(`  ${service.name}:`);
      lines.push(`    image: ${service.image}`);

      if (service.ports && service.ports.length > 0) {
        lines.push('    ports:');
        for (const port of service.ports) {
          lines.push(`      - "${port}"`);
        }
      }

      if (service.environment && Object.keys(service.environment).length > 0) {
        lines.push('    environment:');
        for (const [key, value] of Object.entries(service.environment)) {
          lines.push(`      ${key}: "${value}"`);
        }
      }

      if (service.volumes && service.volumes.length > 0) {
        lines.push('    volumes:');
        for (const volume of service.volumes) {
          lines.push(`      - ${volume}`);
        }
      }

      if (service.depends_on && service.depends_on.length > 0) {
        lines.push('    depends_on:');
        for (const dep of service.depends_on) {
          lines.push(`      - ${dep}`);
        }
      }

      lines.push('');
    }

    // Add volumes section if any services use volumes
    const hasVolumes = services.some((s) => s.volumes && s.volumes.length > 0);
    if (hasVolumes) {
      lines.push('volumes:');
      const volumeNames = new Set<string>();
      for (const service of services) {
        if (service.volumes) {
          for (const volume of service.volumes) {
            const volumeName = volume.split(':')[0];
            if (!volumeNames.has(volumeName)) {
              volumeNames.add(volumeName);
              lines.push(`  ${volumeName}:`);
            }
          }
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Write docker-compose.yml to file
   */
  private async writeDockerCompose(workspaceUri: vscode.Uri, content: string): Promise<void> {
    const composePath = vscode.Uri.joinPath(workspaceUri, 'docker-compose.yml');

    // Check if docker-compose.yml already exists
    const composeExists = await fs
      .access(composePath.fsPath)
      .then(() => true)
      .catch(() => false);

    if (composeExists) {
      const choice = await vscode.window.showWarningMessage(
        'docker-compose.yml already exists. Do you want to overwrite it?',
        'Overwrite',
        'Cancel',
      );

      if (choice !== 'Overwrite') {
        return;
      }
    }

    // Write the docker-compose.yml
    const encoder = new TextEncoder();
    await vscode.workspace.fs.writeFile(composePath, encoder.encode(content));

    // Open the docker-compose.yml
    const doc = await vscode.workspace.openTextDocument(composePath);
    await vscode.window.showTextDocument(doc);

    void vscode.window.showInformationMessage('docker-compose.yml generated successfully!');
  }
}

/**
 * Docker service configuration
 */
interface DockerService {
  name: string;
  image: string;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
}
