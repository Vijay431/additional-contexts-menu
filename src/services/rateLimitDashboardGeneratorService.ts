import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface RateLimitDashboardConfig {
  enabled: boolean;
  includeTypeScript: boolean;
  includeErrorHandling: boolean;
  includeJSDoc: boolean;
  framework: 'react' | 'vue' | 'angular' | 'svelte';
  includeRealtimeUpdates: boolean;
  includeCharts: boolean;
  includeExport: boolean;
  outputDirectory: string;
  backendType: 'memory' | 'redis' | 'database';
  defaultDashboardName: string;
}

export interface RateLimitMetric {
  name: string;
  endpoint: string;
  maxRequests: number;
  windowSize: number;
  currentUsage: number;
  blockedRequests: number;
  violationCount: number;
}

export interface GeneratedRateLimitDashboard {
  name: string;
  framework: 'react' | 'vue' | 'angular' | 'svelte';
  metrics: RateLimitMetric[];
  componentCode: string;
  serviceCode: string;
  typesCode: string;
  routesCode: string;
  files: GeneratedFile[];
  mainFilePath: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

/**
 * Service for generating rate limit dashboard UI.
 * Creates real-time monitoring dashboards for API rate limiting.
 */
export class RateLimitDashboardGeneratorService {
  private static instance: RateLimitDashboardGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): RateLimitDashboardGeneratorService {
    RateLimitDashboardGeneratorService.instance ??= new RateLimitDashboardGeneratorService();
    return RateLimitDashboardGeneratorService.instance;
  }

  /**
   * Generates a rate limit dashboard UI
   */
  public async generateRateLimitDashboard(
    workspacePath: string,
    config: RateLimitDashboardConfig,
  ): Promise<GeneratedRateLimitDashboard | null> {
    // Get dashboard name
    const dashboardName = await this.getDashboardName(config);
    if (!dashboardName) {
      return null;
    }

    // Collect metrics to monitor
    const metrics = await this.collectMetrics(config);
    if (!metrics || metrics.length === 0) {
      vscode.window.showWarningMessage('No metrics defined. Dashboard generation cancelled.');
      return null;
    }

    // Generate component code
    const componentCode = this.generateComponent(dashboardName, metrics, config);

    // Generate service code
    const serviceCode = this.generateService(dashboardName, metrics, config);

    // Generate types code
    const typesCode = this.generateTypes(metrics, config);

    // Generate routes code
    const routesCode = this.generateRoutes(dashboardName, config);

    this.logger.info('Rate limit dashboard generated', {
      dashboardName,
      framework: config.framework,
      metrics: metrics.length,
    });

    // Determine output file paths
    const outputDir = config.outputDirectory || 'src/dashboards';
    const componentFileName = `${dashboardName}.${this.getFileExtension(config.framework)}`;
    const componentFilePath = path.join(workspacePath, outputDir, componentFileName);

    // Create files array
    const files: GeneratedFile[] = [
      {
        path: componentFilePath,
        content: componentCode,
      },
    ];

    // Add service file
    const serviceFileName = `${dashboardName}Service.ts`;
    const serviceFilePath = path.join(workspacePath, outputDir, serviceFileName);
    files.push({
      path: serviceFilePath,
      content: serviceCode,
    });

    // Add types file if TypeScript
    if (config.includeTypeScript) {
      const typesFileName = `${dashboardName}Types.ts`;
      const typesFilePath = path.join(workspacePath, outputDir, typesFileName);
      files.push({
        path: typesFilePath,
        content: typesCode,
      });
    }

    // Add routes file
    const routesFileName = `${dashboardName}Routes.ts`;
    const routesFilePath = path.join(workspacePath, outputDir, routesFileName);
    files.push({
      path: routesFilePath,
      content: routesCode,
    });

    return {
      name: dashboardName,
      framework: config.framework,
      metrics,
      componentCode,
      serviceCode,
      typesCode,
      routesCode,
      files,
      mainFilePath: componentFilePath,
    };
  }

  /**
   * Prompts user for dashboard name
   */
  private async getDashboardName(
    config: RateLimitDashboardConfig,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter dashboard name (e.g., RateLimitMonitor, api-dashboard)',
      placeHolder: 'RateLimitMonitor',
      value: config.defaultDashboardName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Dashboard name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Dashboard name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Collects metrics from user
   */
  private async collectMetrics(
    config: RateLimitDashboardConfig,
  ): Promise<RateLimitMetric[] | null> {
    const metrics: RateLimitMetric[] = [];

    let addMore = true;
    while (addMore) {
      const metric = await this.createMetric(config);
      if (metric) {
        metrics.push(metric);
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Add another metric', value: 'add' },
          { label: 'Finish', value: 'finish' },
        ],
        { placeHolder: 'Add another metric or finish?' },
      );

      if (!choice || choice.value === 'finish') {
        addMore = false;
      }
    }

    return metrics.length > 0 ? metrics : null;
  }

  /**
   * Creates a single metric through user interaction
   */
  private async createMetric(
    config: RateLimitDashboardConfig,
  ): Promise<RateLimitMetric | null> {
    // Get metric name
    const nameInput = await vscode.window.showInputBox({
      prompt: 'Enter metric name (e.g., apiLimiter, authLimiter)',
      placeHolder: 'apiLimiter',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Metric name cannot be empty';
        }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Metric name must start with a letter and contain only letters and numbers';
        }
        return null;
      },
    });

    if (!nameInput) {
      return null;
    }

    const metricName = nameInput.trim();

    // Get endpoint
    const endpoint = await vscode.window.showInputBox({
      prompt: 'Enter API endpoint pattern (e.g., /api/*, /auth/*)',
      placeHolder: '/api/*',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Endpoint cannot be empty';
        }
        return null;
      },
    });

    if (!endpoint) {
      return null;
    }

    // Get max requests
    const maxRequestsInput = await vscode.window.showInputBox({
      prompt: 'Enter maximum requests per window',
      placeHolder: '100',
      value: '100',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'Max requests must be a positive number';
        }
        return null;
      },
    });

    if (!maxRequestsInput) {
      return null;
    }

    // Get window size
    const windowSizeInput = await vscode.window.showInputBox({
      prompt: 'Enter time window in milliseconds (e.g., 60000 for 1 minute)',
      placeHolder: '60000',
      value: '60000',
      validateInput: (value) => {
        const num = parseInt(value, 10);
        if (isNaN(num) || num <= 0) {
          return 'Window size must be a positive number';
        }
        return null;
      },
    });

    if (!windowSizeInput) {
      return null;
    }

    return {
      name: metricName,
      endpoint: endpoint.trim(),
      maxRequests: parseInt(maxRequestsInput, 10),
      windowSize: parseInt(windowSizeInput, 10),
      currentUsage: 0,
      blockedRequests: 0,
      violationCount: 0,
    };
  }

  /**
   * Generates the dashboard component code
   */
  private generateComponent(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    const ts = config.includeTypeScript;
    const jsDoc = config.includeJSDoc;
    let code = '';

    // Generate imports based on framework
    code += this.generateComponentImports(dashboardName, metrics, config);

    code += '\n';

    // Add JSDoc if enabled
    if (jsDoc) {
      code += `/**
 * Rate Limit Dashboard Component
 * Displays real-time rate limiting statistics and metrics
 * @component ${dashboardName}
 */\n\n`;
    }

    // Generate component based on framework
    switch (config.framework) {
      case 'react':
        code += this.generateReactComponent(dashboardName, metrics, config);
        break;
      case 'vue':
        code += this.generateVueComponent(dashboardName, metrics, config);
        break;
      case 'angular':
        code += this.generateAngularComponent(dashboardName, metrics, config);
        break;
      case 'svelte':
        code += this.generateSvelteComponent(dashboardName, metrics, config);
        break;
    }

    return code;
  }

  /**
   * Generates component imports
   */
  private generateComponentImports(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    let imports = '';

    const ts = config.includeTypeScript;

    switch (config.framework) {
      case 'react':
        imports += ts ? "import React, { useState, useEffect } from 'react';\n" : "import React, { useState, useEffect } from 'react';\n";
        if (config.includeCharts) {
          imports += "import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';\n";
        }
        imports += `import { ${dashboardName}Service } from './${dashboardName}Service';\n`;
        if (ts) {
          imports += `import { RateLimitMetric } from './${dashboardName}Types';\n`;
        }
        break;

      case 'vue':
        if (ts) {
          imports += "import { defineComponent, ref, onMounted, onUnmounted } from 'vue';\n";
        } else {
          imports += "import { ref, onMounted, onUnmounted } from 'vue';\n";
        }
        if (config.includeCharts) {
          imports += "import { Line } from 'vue-chartjs';\n";
        }
        imports += `import { ${dashboardName}Service } from './${dashboardName}Service';\n`;
        break;

      case 'angular':
        imports += "import { Component, OnInit, OnDestroy } from '@angular/core';\n";
        if (config.includeCharts) {
          imports += "import { ChartModule } from 'ng2-charts';\n";
        }
        imports += `import { ${dashboardName}Service } from './${dashboardName}Service';\n`;
        break;

      case 'svelte':
        if (config.includeCharts) {
          imports += "import { Line } from 'svelte-chartjs';\n";
        }
        imports += `import { ${dashboardName}Service } from './${dashboardName}Service';\n`;
        if (ts) {
          imports += `import type { RateLimitMetric } from './${dashboardName}Types';\n`;
        }
        break;
    }

    return imports;
  }

  /**
   * Generates React component
   */
  private generateReactComponent(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    const ts = config.includeTypeScript;
    let code = '';

    const componentInterface = ts ? `: React.FC` : '';

    code += `export const ${this.pascalCase(dashboardName)}${componentInterface} = () => {
  const [metricsData, setMetricsData] = ${ts ? 'useState<RateLimitMetric[]>([])' : 'useState([])'};
  const [loading, setLoading] = ${ts ? 'useState<boolean>(true)' : 'useState(true)'};
  const [error, setError] = ${ts ? 'useState<string | null>(null)' : 'useState(null)'};
  const [autoRefresh, setAutoRefresh] = ${ts ? 'useState<boolean>' : 'useState'}(${config.includeRealtimeUpdates});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await ${dashboardName}Service.getMetrics();
        setMetricsData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const handleExport = async () => {
    try {
      await ${dashboardName}Service.exportMetrics(metricsData);
      alert('Metrics exported successfully');
    } catch (err) {
      alert('Failed to export metrics');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="${this.kebabCase(dashboardName)}">
      <div className="dashboard-header">
        <h1>Rate Limit Dashboard</h1>
        <div className="controls">
          <button onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
          </button>
          ${config.includeExport ? '<button onClick={handleExport}>Export</button>' : ''}
        </div>
      </div>

      <div className="metrics-grid">
        {metricsData.map((metric) => (
          <div key={metric.name} className="metric-card">
            <h3>{metric.name}</h3>
            <p>Endpoint: {metric.endpoint}</p>
            <div className="metric-stats">
              <div>
                <span className="label">Current Usage:</span>
                <span className="value">{metric.currentUsage} / {metric.maxRequests}</span>
              </div>
              <div>
                <span className="label">Blocked Requests:</span>
                <span className="value blocked">{metric.blockedRequests}</span>
              </div>
              <div>
                <span className="label">Violations:</span>
                <span className="value violation">{metric.violationCount}</span>
              </div>
              <div>
                <span className="label">Usage Percentage:</span>
                <span className={\`value percentage \${metric.currentUsage / metric.maxRequests > 0.8 ? 'high' : ''}\`}>
                  {((metric.currentUsage / metric.maxRequests) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            ${config.includeCharts ? this.generateReactChartCode(config) : ''}
          </div>
        ))}
      </div>
    </div>
  );
};
`;

    return code;
  }

  /**
   * Generates React chart code
   */
  private generateReactChartCode(_config: RateLimitDashboardConfig): string {
    return `
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metric.history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="currentUsage" stroke="#8884d8" />
                  <Line type="monotone" dataKey="blockedRequests" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>`;
  }

  /**
   * Generates Vue component
   */
  private generateVueComponent(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    const ts = config.includeTypeScript;
    let code = '';

    code += `${ts ? 'const ' : ''}export default${ts ? ' defineComponent(' : ' {'}
  name: '${this.pascalCase(dashboardName)}',
  ${ts ? 'setup()' : ''}
    const metricsData = ${ts ? 'ref<RateLimitMetric[]>([])' : 'ref([])'};
    const loading = ${ts ? 'ref<boolean>(true)' : 'ref(true)'};
    const error = ${ts ? 'ref<string | null>(null)' : 'ref(null)'};
    const autoRefresh = ${ts ? 'ref<boolean>' : 'ref'}(${config.includeRealtimeUpdates});

    let interval: number | null = null;

    const fetchData = async () => {
      try {
        loading.value = true;
        const data = await ${dashboardName}Service.getMetrics();
        metricsData.value = data;
        error.value = null;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to fetch metrics';
      } finally {
        loading.value = false;
      }
    };

    const toggleAutoRefresh = () => {
      autoRefresh.value = !autoRefresh.value;
      if (autoRefresh.value) {
        fetchData();
        interval = setInterval(fetchData, 5000);
      } else if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    ${config.includeExport ? `
    const handleExport = async () => {
      try {
        await ${dashboardName}Service.exportMetrics(metricsData.value);
        alert('Metrics exported successfully');
      } catch (err) {
        alert('Failed to export metrics');
      }
    };
    ` : ''}

    onMounted(() => {
      fetchData();
      if (autoRefresh.value) {
        interval = setInterval(fetchData, 5000);
      }
    });

    onUnmounted(() => {
      if (interval) clearInterval(interval);
    });

    return {
      metricsData,
      loading,
      error,
      autoRefresh,
      toggleAutoRefresh,
      ${config.includeExport ? 'handleExport,' : ''}
    };
  }${ts ? ')' : ''};
`;

    return code;
  }

  /**
   * Generates Angular component
   */
  private generateAngularComponent(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    let code = '';

    code += `@Component({
  selector: 'app-${this.kebabCase(dashboardName)}',
  template: \`
<div class="${this.kebabCase(dashboardName)}">
  <div class="dashboard-header">
    <h1>Rate Limit Dashboard</h1>
    <div class="controls">
      <button (click)="toggleAutoRefresh()">
        {{ autoRefresh ? 'Disable' : 'Enable' }} Auto-Refresh
      </button>
      ${config.includeExport ? '<button (click)="handleExport()">Export</button>' : ''}
    </div>
  </div>

  <div *ngIf="loading" class="loading">Loading...</div>
  <div *ngIf="error" class="error">Error: {{ error }}</div>

  <div *ngIf="!loading && !error" class="metrics-grid">
    <div *ngFor="let metric of metricsData" class="metric-card">
      <h3>{{ metric.name }}</h3>
      <p>Endpoint: {{ metric.endpoint }}</p>
      <div class="metric-stats">
        <div>
          <span class="label">Current Usage:</span>
          <span class="value">{{ metric.currentUsage }} / {{ metric.maxRequests }}</span>
        </div>
        <div>
          <span class="label">Blocked Requests:</span>
          <span class="value blocked">{{ metric.blockedRequests }}</span>
        </div>
        <div>
          <span class="label">Violations:</span>
          <span class="value violation">{{ metric.violationCount }}</span>
        </div>
        <div>
          <span class="label">Usage Percentage:</span>
          <span class="value percentage" [class.high]="metric.currentUsage / metric.maxRequests > 0.8">
            {{ ((metric.currentUsage / metric.maxRequests) * 100).toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</div>
\`,
  styles: [\`
    .${this.kebabCase(dashboardName)} { padding: 20px; }
    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .controls button { margin-left: 10px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
    .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
    .metric-stats { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
    .metric-stats > div { display: flex; justify-content: space-between; }
    .label { font-weight: bold; }
    .value.high { color: #f44336; }
    .value.blocked { color: #ff9800; }
    .value.violation { color: #f44336; }
    .loading, .error { text-align: center; padding: 20px; }
    .error { color: #f44336; }
  \`]
})
export class ${this.pascalCase(dashboardName)}Component implements OnInit, OnDestroy {
  metricsData: RateLimitMetric[] = [];
  loading = true;
  error: string | null = null;
  autoRefresh = ${config.includeRealtimeUpdates};
  private interval: any = null;

  constructor(private ${this.camelCase(dashboardName)}Service: ${this.pascalCase(dashboardName)}Service) {}

  ngOnInit(): void {
    this.fetchData();
    if (this.autoRefresh) {
      this.interval = setInterval(() => this.fetchData(), 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private fetchData(): void {
    this.${this.camelCase(dashboardName)}Service.getMetrics().subscribe({
      next: (data) => {
        this.metricsData = data;
        this.loading = false;
        this.error = null;
      },
      error: (err) => {
        this.error = err.message || 'Failed to fetch metrics';
        this.loading = false;
      }
    });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.fetchData();
      this.interval = setInterval(() => this.fetchData(), 5000);
    } else if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  ${config.includeExport ? `
  handleExport(): void {
    this.${this.camelCase(dashboardName)}Service.exportMetrics(this.metricsData).subscribe({
      next: () => alert('Metrics exported successfully'),
      error: () => alert('Failed to export metrics')
    });
  }
  ` : ''}
}
`;

    return code;
  }

  /**
   * Generates Svelte component
   */
  private generateSvelteComponent(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    let code = '';

    code += `<script>
  import { onMount, onDestroy } from 'svelte';
  import { ${dashboardName}Service } from './${dashboardName}Service';
  ${config.includeTypeScript ? `import type { RateLimitMetric } from './${dashboardName}Types';` : ''}

  let metricsData${config.includeTypeScript ? ': RateLimitMetric[]' : ''} = [];
  let loading = true;
  let error${config.includeTypeScript ? ': string | null' : ''} = null;
  let autoRefresh = ${config.includeRealtimeUpdates};
  let interval${config.includeTypeScript ? ': number | null' : ''} = null;

  const fetchData = async () => {
    try {
      loading = true;
      const data = await ${dashboardName}Service.getMetrics();
      metricsData = data;
      error = null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch metrics';
    } finally {
      loading = false;
    }
  };

  const toggleAutoRefresh = () => {
    autoRefresh = !autoRefresh;
    if (autoRefresh) {
      fetchData();
      interval = setInterval(fetchData, 5000);
    } else if (interval) {
      clearInterval(interval);
      interval = null;
    }
  };

  ${config.includeExport ? `
  const handleExport = async () => {
    try {
      await ${dashboardName}Service.exportMetrics(metricsData);
      alert('Metrics exported successfully');
    } catch (err) {
      alert('Failed to export metrics');
    }
  };
  ` : ''}

  onMount(() => {
    fetchData();
    if (autoRefresh) {
      interval = setInterval(fetchData, 5000);
    }
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });
</script>

<div class="${this.kebabCase(dashboardName)}">
  <div class="dashboard-header">
    <h1>Rate Limit Dashboard</h1>
    <div class="controls">
      <button on:click={toggleAutoRefresh}>
        {autoRefresh ? 'Disable' : 'Enable'} Auto-Refresh
      </button>
      ${config.includeExport ? '<button on:click={handleExport}>Export</button>' : ''}
    </div>
  </div>

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if error}
    <div class="error">Error: {error}</div>
  {:else}
    <div class="metrics-grid">
      {#each metricsData as metric (metric.name)}
        <div class="metric-card">
          <h3>{metric.name}</h3>
          <p>Endpoint: {metric.endpoint}</p>
          <div class="metric-stats">
            <div>
              <span class="label">Current Usage:</span>
              <span class="value">{metric.currentUsage} / {metric.maxRequests}</span>
            </div>
            <div>
              <span class="label">Blocked Requests:</span>
              <span class="value blocked">{metric.blockedRequests}</span>
            </div>
            <div>
              <span class="label">Violations:</span>
              <span class="value violation">{metric.violationCount}</span>
            </div>
            <div>
              <span class="label">Usage Percentage:</span>
              <span class="value percentage" class:high={metric.currentUsage / metric.maxRequests > 0.8}>
                {((metric.currentUsage / metric.maxRequests) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .${this.kebabCase(dashboardName)} {
    padding: 20px;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .controls button {
    margin-left: 10px;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .metric-card {
    border: 1px solid #ddd;
    padding: 15px;
    border-radius: 8px;
  }

  .metric-stats {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 15px;
  }

  .metric-stats > div {
    display: flex;
    justify-content: space-between;
  }

  .label {
    font-weight: bold;
  }

  .value.high {
    color: #f44336;
  }

  .value.blocked {
    color: #ff9800;
  }

  .value.violation {
    color: #f44336;
  }

  .loading,
  .error {
    text-align: center;
    padding: 20px;
  }

  .error {
    color: #f44336;
  }
</style>
`;

    return code;
  }

  /**
   * Generates service code
   */
  private generateService(
    dashboardName: string,
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    const ts = config.includeTypeScript;
    let code = '';

    // Add JSDoc if enabled
    if (config.includeJSDoc) {
      code += `/**
 * Service for fetching rate limit metrics
 * Handles API calls to retrieve rate limiting statistics
 */\n\n`;
    }

    code += `class ${this.pascalCase(dashboardName)}Service {
  private readonly baseUrl = '/api/rate-limits';

  async getMetrics()${ts ? ': Promise<RateLimitMetric[]>' : ''} {
    const response = await fetch(this.baseUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch metrics');
    }

    return response.json();
  }

  ${config.includeExport ? `
  async exportMetrics(metrics${ts ? ': RateLimitMetric[]' : ''})${ts ? ': Promise<void>' : ''} {
    const data = JSON.stringify(metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = \`rate-limit-metrics-\${Date.now()}.json\`;
    link.click();
    URL.revokeObjectURL(url);
  }
  ` : ''}
}

export const ${dashboardName}Service = new ${this.pascalCase(dashboardName)}Service();
`;

    return code;
  }

  /**
   * Generates types code
   */
  private generateTypes(
    _metrics: RateLimitMetric[],
    config: RateLimitDashboardConfig,
  ): string {
    if (!config.includeTypeScript) {
      return '';
    }

    let code = '';

    if (config.includeJSDoc) {
      code += `/**
 * Type definitions for rate limit metrics
 */\n\n`;
    }

    code += `export interface RateLimitMetric {
  name: string;
  endpoint: string;
  maxRequests: number;
  windowSize: number;
  currentUsage: number;
  blockedRequests: number;
  violationCount: number;
  history?: MetricHistoryPoint[];
}

export interface MetricHistoryPoint {
  timestamp: string;
  currentUsage: number;
  blockedRequests: number;
}
`;

    return code;
  }

  /**
   * Generates backend routes code
   */
  private generateRoutes(
    _dashboardName: string,
    config: RateLimitDashboardConfig,
  ): string {
    let code = '';

    if (config.includeJSDoc) {
      code += `/**
 * API routes for rate limit dashboard
 * Provides endpoints for fetching metrics
 */\n\n`;
    }

    code += `import express from 'express';

const router = express.Router();

// Mock data storage - replace with your actual implementation
const metricsStore = new Map<string, any>();

// GET /api/rate-limits
router.get('/', (req, res) => {
  const metrics = Array.from(metricsStore.values());
  res.json(metrics);
});

// PUT /api/rate-limits/:metricName
router.put('/:metricName', (req, res) => {
  const { metricName } = req.params;
  const { currentUsage, blockedRequests, violationCount } = req.body;

  const existing = metricsStore.get(metricName) || {};
  const updated = {
    ...existing,
    currentUsage: currentUsage || existing.currentUsage || 0,
    blockedRequests: blockedRequests || existing.blockedRequests || 0,
    violationCount: violationCount || existing.violationCount || 0,
  };

  metricsStore.set(metricName, updated);
  res.json(updated);
});

export default router;
`;

    return code;
  }

  /**
   * Gets file extension for framework
   */
  private getFileExtension(framework: string): string {
    switch (framework) {
      case 'react':
      case 'svelte':
        return 'svelte';
      case 'vue':
        return 'vue';
      case 'angular':
        return 'component.ts';
      default:
        return 'tsx';
    }
  }

  /**
   * Converts string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[-_\s](.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (_, c) => c.toUpperCase());
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    const pascal = this.pascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  /**
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Creates a file with the given content
   */
  public async createFile(filePath: string, content: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
  }
}
