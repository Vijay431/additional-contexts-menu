import * as fs from 'fs/promises';
import * as path from 'path';

export class ProjectFixtures {
  public static async createReactProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-react',
          dependencies: {
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createAngularProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-angular',
          dependencies: {
            '@angular/core': '^16.0.0',
            '@angular/common': '^16.0.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createExpressProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-express',
          dependencies: {
            express: '^4.18.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createNextjsProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-nextjs',
          dependencies: {
            next: '^13.0.0',
            react: '^18.0.0',
            'react-dom': '^18.0.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createVueProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-vue',
          dependencies: {
            vue: '^3.0.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createSvelteProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-svelte',
          dependencies: {
            svelte: '^3.0.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createNestjsProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-nestjs',
          dependencies: {
            '@nestjs/core': '^10.0.0',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createVanillaJSProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-vanilla',
          dependencies: {},
        },
        null,
        2,
      ),
    );
  }

  public static async createTypeScriptProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'tsconfig.json'),
      JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
          },
        },
        null,
        2,
      ),
    );
  }

  public static async createNodeProject(projectPath: string): Promise<void> {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(
        {
          name: 'test-node',
          dependencies: {
            typescript: '^5.0.0',
            '@types/node': '^20.0.0',
          },
        },
        null,
        2,
      ),
    );
  }
}
