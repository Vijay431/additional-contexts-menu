import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface T3StackConfig {
  enabled: boolean;
  outputDirectory: string;
  includeNextjs: boolean;
  includeTypeScript: boolean;
  includeTrpc: boolean;
  includePrisma: boolean;
  includeTailwind: boolean;
  includeNextAuth: boolean;
  includeZod: boolean;
  includeTesting: boolean;
  defaultAppName: string;
  includeDocumentation: boolean;
}

export interface T3StackProjectConfig {
  appName: string;
  outputDirectory: string;
  includeNextjs: boolean;
  includeTypeScript: boolean;
  includeTrpc: boolean;
  includePrisma: boolean;
  includeTailwind: boolean;
  includeNextAuth: boolean;
  includeZod: boolean;
  includeTesting: boolean;
  includeDocumentation: boolean;
  databaseProvider: 'postgresql' | 'mysql' | 'sqlite';
  authProvider: 'next-auth' | 'clerk' | 'none';
}

export interface GeneratedT3StackProject {
  appName: string;
  projectPath: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  commands: string[];
  dependencies: string[];
}

/**
 * Service for generating T3 Stack (TypeScript, tRPC, Prisma, Next.js) application boilerplate
 * with proper setup. Creates configured apps with database auth, API routes, and UI components.
 */
export class T3StackGeneratorService {
  private static instance: T3StackGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): T3StackGeneratorService {
    T3StackGeneratorService.instance ??= new T3StackGeneratorService();
    return T3StackGeneratorService.instance;
  }

  /**
   * Generates a T3 Stack application based on user input
   */
  public async generateT3Stack(config: T3StackConfig): Promise<GeneratedT3StackProject | null> {
    // Get project configuration from user
    const projectConfig = await this.collectProjectConfig(config);
    if (!projectConfig) {
      return null;
    }

    // Generate project structure
    const project = await this.generateProject(projectConfig);
    if (!project) {
      return null;
    }

    // Write files to workspace
    await this.createProjectFiles(project.files);

    this.logger.info('T3 Stack project generated', {
      appName: projectConfig.appName,
      filesCount: project.files.length,
    });

    return project;
  }

  /**
   * Collects project configuration from user
   */
  private async collectProjectConfig(config: T3StackConfig): Promise<T3StackProjectConfig | null> {
    // Get app name
    const appName = await this.getAppName(config.defaultAppName);
    if (!appName) {
      return null;
    }

    // Get output directory
    const outputDirectory = await this.getOutputDirectory(config.outputDirectory, appName);
    if (!outputDirectory) {
      return null;
    }

    // Confirm T3 Stack features
    const features = await this.selectFeatures(config);
    if (!features) {
      return null;
    }

    // Get database provider
    const databaseProvider = await this.selectDatabaseProvider();
    if (!databaseProvider) {
      return null;
    }

    // Get auth provider
    const authProvider = await this.selectAuthProvider();
    if (!authProvider) {
      return null;
    }

    return {
      appName,
      outputDirectory,
      includeNextjs: features.includeNextjs,
      includeTypeScript: features.includeTypeScript,
      includeTrpc: features.includeTrpc,
      includePrisma: features.includePrisma,
      includeTailwind: features.includeTailwind,
      includeNextAuth: features.includeNextAuth,
      includeZod: features.includeZod,
      includeTesting: features.includeTesting,
      includeDocumentation: features.includeDocumentation,
      databaseProvider,
      authProvider,
    };
  }

  /**
   * Gets app name from user
   */
  private async getAppName(defaultAppName: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter application name',
      placeHolder: defaultAppName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Application name cannot be empty';
        }
        if (!/^[a-z][a-z0-9-]*$/i.test(value)) {
          return 'Application name must start with a letter and contain only letters, numbers, and hyphens';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Gets output directory from user
   */
  private async getOutputDirectory(
    defaultDirectory: string,
    appName: string,
  ): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter output directory (relative to workspace root)',
      placeHolder: path.join(defaultDirectory, appName),
      value: path.join(defaultDirectory, appName),
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Output directory cannot be empty';
        }
        return null;
      },
    });
    return input?.trim() || undefined;
  }

  /**
   * Selects T3 Stack features
   */
  private async selectFeatures(config: T3StackConfig): Promise<{
    includeNextjs: boolean;
    includeTypeScript: boolean;
    includeTrpc: boolean;
    includePrisma: boolean;
    includeTailwind: boolean;
    includeNextAuth: boolean;
    includeZod: boolean;
    includeTesting: boolean;
    includeDocumentation: boolean;
  } | null> {
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Next.js', picked: config.includeNextjs, value: 'includeNextjs' },
        { label: 'TypeScript', picked: config.includeTypeScript, value: 'includeTypeScript' },
        { label: 'tRPC', picked: config.includeTrpc, value: 'includeTrpc' },
        { label: 'Prisma', picked: config.includePrisma, value: 'includePrisma' },
        { label: 'Tailwind CSS', picked: config.includeTailwind, value: 'includeTailwind' },
        { label: 'NextAuth.js', picked: config.includeNextAuth, value: 'includeNextAuth' },
        { label: 'Zod', picked: config.includeZod, value: 'includeZod' },
        { label: 'Testing', picked: config.includeTesting, value: 'includeTesting' },
        { label: 'Documentation', picked: config.includeDocumentation, value: 'includeDocumentation' },
      ],
      {
        placeHolder: 'Select T3 Stack features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return null;
    }

    const selected = new Set(features.map((f) => f.value));

    return {
      includeNextjs: selected.has('includeNextjs'),
      includeTypeScript: selected.has('includeTypeScript'),
      includeTrpc: selected.has('includeTrpc'),
      includePrisma: selected.has('includePrisma'),
      includeTailwind: selected.has('includeTailwind'),
      includeNextAuth: selected.has('includeNextAuth'),
      includeZod: selected.has('includeZod'),
      includeTesting: selected.has('includeTesting'),
      includeDocumentation: selected.has('includeDocumentation'),
    };
  }

  /**
   * Selects database provider
   */
  private async selectDatabaseProvider(): Promise<'postgresql' | 'mysql' | 'sqlite' | null> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'PostgreSQL',
          value: 'postgresql',
          description: 'Recommended for production',
        },
        { label: 'MySQL', value: 'mysql', description: 'Popular relational database' },
        { label: 'SQLite', value: 'sqlite', description: 'Lightweight, file-based database' },
      ],
      {
        placeHolder: 'Select database provider',
      },
    );

    return (choice?.value as 'postgresql' | 'mysql' | 'sqlite') || null;
  }

  /**
   * Selects auth provider
   */
  private async selectAuthProvider(): Promise<'next-auth' | 'clerk' | 'none' | null> {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'NextAuth.js',
          value: 'next-auth',
          description: 'Authentication for Next.js',
        },
        {
          label: 'Clerk',
          value: 'clerk',
          description: 'Complete authentication platform',
        },
        { label: 'None', value: 'none', description: 'No authentication' },
      ],
      {
        placeHolder: 'Select authentication provider',
      },
    );

    return (choice?.value as 'next-auth' | 'clerk' | 'none') || null;
  }

  /**
   * Generates the project structure and files
   */
  private async generateProject(
    projectConfig: T3StackProjectConfig,
  ): Promise<GeneratedT3StackProject | null> {
    const files: Array<{ path: string; content: string }> = [];
    const dependencies: string[] = [];
    const commands: string[] = [];

    const { appName, outputDirectory } = projectConfig;

    // Generate package.json
    files.push({
      path: path.join(outputDirectory, 'package.json'),
      content: this.generatePackageJson(projectConfig),
    });

    // Generate tsconfig.json
    if (projectConfig.includeTypeScript) {
      files.push({
        path: path.join(outputDirectory, 'tsconfig.json'),
        content: this.generateTsConfig(),
      });
    }

    // Generate Next.js configuration
    if (projectConfig.includeNextjs) {
      files.push({
        path: path.join(outputDirectory, 'next.config.js'),
        content: this.generateNextConfig(),
      });

      // Generate app directory structure
      files.push({
        path: path.join(outputDirectory, 'src/pages/_app.tsx'),
        content: this.generateAppTsx(projectConfig),
      });

      files.push({
        path: path.join(outputDirectory, 'src/pages/index.tsx'),
        content: this.generateIndexTsx(projectConfig),
      });
    }

    // Generate tRPC setup
    if (projectConfig.includeTrpc) {
      files.push({
        path: path.join(outputDirectory, 'src/server/router/index.ts'),
        content: this.generateRouterIndex(projectConfig),
      });

      files.push({
        path: path.join(outputDirectory, 'src/server/router/example.ts'),
        content: this.generateExampleRouter(projectConfig),
      });

      files.push({
        path: path.join(outputDirectory, 'src/server/trpc.ts'),
        content: this.generateTrpcSetup(projectConfig),
      });
    }

    // Generate Prisma setup
    if (projectConfig.includePrisma) {
      files.push({
        path: path.join(outputDirectory, 'prisma/schema.prisma'),
        content: this.generatePrismaSchema(projectConfig),
      });

      files.push({
        path: path.join(outputDirectory, 'src/server/prisma.ts'),
        content: this.generatePrismaClient(projectConfig),
      });
    }

    // Generate Tailwind configuration
    if (projectConfig.includeTailwind) {
      files.push({
        path: path.join(outputDirectory, 'tailwind.config.ts'),
        content: this.generateTailwindConfig(),
      });

      files.push({
        path: path.join(outputDirectory, 'postcss.config.js'),
        content: this.generatePostcssConfig(),
      });

      files.push({
        path: path.join(outputDirectory, 'src/styles/globals.css'),
        content: this.generateGlobalsCss(),
      });
    }

    // Generate NextAuth setup
    if (projectConfig.includeNextAuth && projectConfig.authProvider === 'next-auth') {
      files.push({
        path: path.join(outputDirectory, 'src/pages/api/auth/[...nextauth].ts'),
        content: this.generateNextAuthConfig(projectConfig),
      });
    }

    // Generate Zod schemas
    if (projectConfig.includeZod) {
      files.push({
        path: path.join(outputDirectory, 'src/server/common/schemas.ts'),
        content: this.generateZodSchemas(projectConfig),
      });
    }

    // Generate test setup
    if (projectConfig.includeTesting) {
      files.push({
        path: path.join(outputDirectory, 'jest.config.js'),
        content: this.generateJestConfig(),
      });

      files.push({
        path: path.join(outputDirectory, 'src/utils/__tests__/example.test.ts'),
        content: this.generateExampleTest(projectConfig),
      });
    }

    // Generate .env.example
    files.push({
      path: path.join(outputDirectory, '.env.example'),
      content: this.generateEnvExample(projectConfig),
    });

    // Generate .gitignore
    files.push({
      path: path.join(outputDirectory, '.gitignore'),
      content: this.generateGitignore(),
    });

    // Generate README
    if (projectConfig.includeDocumentation) {
      files.push({
        path: path.join(outputDirectory, 'README.md'),
        content: this.generateReadme(projectConfig),
      });
    }

    // Collect dependencies
    if (projectConfig.includeNextjs) {
      dependencies.push('next', 'react', 'react-dom');
    }
    if (projectConfig.includeTypeScript) {
      dependencies.push('@types/react', '@types/node', 'typescript');
    }
    if (projectConfig.includeTrpc) {
      dependencies.push('@trpc/server', '@trpc/client', '@trpc/react-query', '@tanstack/react-query');
    }
    if (projectConfig.includePrisma) {
      dependencies.push('@prisma/client');
    }
    if (projectConfig.includeTailwind) {
      dependencies.push('tailwindcss', 'autoprefixer', 'postcss');
    }
    if (projectConfig.includeNextAuth && projectConfig.authProvider === 'next-auth') {
      dependencies.push('next-auth');
    }
    if (projectConfig.includeZod) {
      dependencies.push('zod');
    }
    if (projectConfig.includeTesting) {
      dependencies.push('@testing-library/react', '@testing-library/jest-dom', 'jest');
    }

    // Generate setup commands
    commands.push('npm install');
    if (projectConfig.includePrisma) {
      commands.push('npx prisma generate');
      commands.push('npx prisma db push');
    }

    return {
      appName,
      projectPath: outputDirectory,
      files,
      commands,
      dependencies,
    };
  }

  /**
   * Generates package.json
   */
  private generatePackageJson(projectConfig: T3StackProjectConfig): string {
    const packageJson: Record<string, unknown> = {
      name: projectConfig.appName,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint',
      },
      dependencies: {},
      devDependencies: {},
    };

    // Add dependencies
    if (projectConfig.includeNextjs) {
      packageJson['dependencies'] = {
        ...(packageJson['dependencies'] as Record<string, string>),
        next: '^14.0.0',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
      };
    }

    if (projectConfig.includeTrpc) {
      packageJson['dependencies'] = {
        ...(packageJson['dependencies'] as Record<string, string>),
        '@trpc/server': '^10.0.0',
        '@trpc/client': '^10.0.0',
        '@trpc/react-query': '^10.0.0',
        '@tanstack/react-query': '^5.0.0',
        superjson: '^2.0.0',
      };
    }

    if (projectConfig.includePrisma) {
      packageJson['dependencies'] = {
        ...(packageJson['dependencies'] as Record<string, string>),
        '@prisma/client': '^5.0.0',
      };
      packageJson['devDependencies'] = {
        ...(packageJson['devDependencies'] as Record<string, string>),
        prisma: '^5.0.0',
      };
    }

    if (projectConfig.includeTailwind) {
      packageJson['devDependencies'] = {
        ...(packageJson['devDependencies'] as Record<string, string>),
        tailwindcss: '^3.3.0',
        autoprefixer: '^10.4.0',
        postcss: '^8.4.0',
      };
    }

    if (projectConfig.includeNextAuth && projectConfig.authProvider === 'next-auth') {
      packageJson['dependencies'] = {
        ...(packageJson['dependencies'] as Record<string, string>),
        'next-auth': '^4.24.0',
      };
    }

    if (projectConfig.includeZod) {
      packageJson['dependencies'] = {
        ...(packageJson['dependencies'] as Record<string, string>),
        zod: '^3.22.0',
      };
    }

    if (projectConfig.includeTypeScript) {
      packageJson['devDependencies'] = {
        ...(packageJson['devDependencies'] as Record<string, string>),
        '@types/node': '^20.0.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        typescript: '^5.0.0',
      };
    }

    if (projectConfig.includeTesting) {
      packageJson['devDependencies'] = {
        ...(packageJson['devDependencies'] as Record<string, string>),
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.0.0',
        '@testing-library/user-event': '^14.5.0',
        jest: '^29.7.0',
        'jest-environment-jsdom': '^29.7.0',
      };
    }

    return JSON.stringify(packageJson, null, 2);
  }

  /**
   * Generates tsconfig.json
   */
  private generateTsConfig(): string {
    return JSON.stringify(
      {
        compilerOptions: {
          target: 'es2017',
          lib: ['dom', 'dom.iterable', 'esnext'],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: 'esnext',
          moduleResolution: 'bundler',
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: 'preserve',
          incremental: true,
          plugins: [
            {
              name: 'next',
            },
          ],
          paths: {
            '@/*': ['./src/*'],
          },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2,
    );
  }

  /**
   * Generates next.config.js
   */
  private generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['ui'],

  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
`;
  }

  /**
   * Generates _app.tsx
   */
  private generateAppTsx(projectConfig: T3StackProjectConfig): string {
    let imports = `import type { AppType } from "next/app";
import { api } from "~/utils/api";`;

    if (projectConfig.includeTrpc) {
      imports += `\nimport { withTRPC } from "@trpc/next";`;
    }

    if (projectConfig.includeTailwind) {
      imports += `\nimport "~/styles/globals.css";`;
    }

    let code = `${imports}\n\n`;

    if (projectConfig.includeTrpc) {
      code += `const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <Component {...pageProps} />
  );
};

export default api.withTRPC(MyApp);`;
    } else {
      code += `const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <Component {...pageProps} />
  );
};

export default MyApp;`;
    }

    return code;
  }

  /**
   * Generates index.tsx
   */
  private generateIndexTsx(projectConfig: T3StackProjectConfig): string {
    let imports = `import type { NextPage } from "next";`;

    if (projectConfig.includeTrpc) {
      imports += `\nimport { api } from "~/utils/api";`;
    }

    imports += `\nimport Head from "next/head";`;

    if (projectConfig.includeTailwind) {
      imports += `\nimport { HiHome } from "react-icons/hi";`;
    }

    let code = `${imports}\n\n`;

    if (projectConfig.includeTrpc) {
      code += `const Home: NextPage = () => {
  const hello = api.example.hello.useQuery({ text: "from tRPC" });

  return (
    <>
      <Head>
        <title>${projectConfig.appName}</title>
        <meta name="description" content="Generated by T3 Stack" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            ${projectConfig.appName}
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <div className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 text-white hover:bg-white/20">
              <h3 className="text-2xl font-bold">tRPC</h3>
              <div className="text-lg">
                {hello.data ? (
                  <p>{hello.data.greeting}</p>
                ) : (
                  <p>Loading...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Home;`;
    } else {
      code += `const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>${projectConfig.appName}</title>
        <meta name="description" content="Generated by T3 Stack" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            ${projectConfig.appName}
          </h1>
        </div>
      </main>
    </>
  );
};

export default Home;`;
    }

    return code;
  }

  /**
   * Generates router index
   */
  private generateRouterIndex(_projectConfig: T3StackProjectConfig): string {
    return `import { createTRPCRouter } from "~/server/trpc";
import { exampleRouter } from "~/server/router/example";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
});

export type AppRouter = typeof appRouter;
`;
  }

  /**
   * Generates example router
   */
  private generateExampleRouter(_projectConfig: T3StackProjectConfig): string {
    return `import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/trpc";

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: \`Hello \${input.text}!\`,
      };
    }),
});
`;
  }

  /**
   * Generates tRPC setup
   */
  private generateTrpcSetup(_projectConfig: T3StackProjectConfig): string {
    return `import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { type Context } from "~/server/context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          shape.data.code === "BAD_REQUEST" &&
          shape.data.zodError instanceof Error
            ? shape.data.zodError
            : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
`;
  }

  /**
   * Generates Prisma schema
   */
  private generatePrismaSchema(projectConfig: T3StackProjectConfig): string {
    return `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${projectConfig.databaseProvider}"
  url      = env("DATABASE_URL")
}

model Example {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;
  }

  /**
   * Generates Prisma client
   */
  private generatePrismaClient(_projectConfig: T3StackProjectConfig): string {
    return `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`;
  }

  /**
   * Generates Tailwind config
   */
  private generateTailwindConfig(): string {
    return `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
`;
  }

  /**
   * Generates PostCSS config
   */
  private generatePostcssConfig(): string {
    return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
  }

  /**
   * Generates globals.css
   */
  private generateGlobalsCss(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
`;
  }

  /**
   * Generates NextAuth config
   */
  private generateNextAuthConfig(_projectConfig: T3StackProjectConfig): string {
    return `import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "~/server/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Add your providers here
  ],
};

export default NextAuth(authOptions);
`;
  }

  /**
   * Generates Zod schemas
   */
  private generateZodSchemas(_projectConfig: T3StackProjectConfig): string {
    return `import { z } from "zod";

export const exampleSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Example = z.infer<typeof exampleSchema>;
`;
  }

  /**
   * Generates Jest config
   */
  private generateJestConfig(): string {
    return `const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
`;
  }

  /**
   * Generates example test
   */
  private generateExampleTest(_projectConfig: T3StackProjectConfig): string {
    return `import { describe, it, expect } from "@jest/globals";

describe("Example Test", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
`;
  }

  /**
   * Generates .env.example
   */
  private generateEnvExample(projectConfig: T3StackProjectConfig): string {
    let env = `# Database
DATABASE_URL="${
      projectConfig.databaseProvider === 'sqlite'
        ? 'file:./dev.db'
        : projectConfig.databaseProvider === 'postgresql'
          ? 'postgresql://user:password@localhost:5432/mydb'
          : 'mysql://user:password@localhost:3306/mydb'
    }"
`;

    if (projectConfig.includeNextAuth && projectConfig.authProvider === 'next-auth') {
      env += `
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"
`;
    }

    return env;
  }

  /**
   * Generates .gitignore
   */
  private generateGitignore(): string {
    return `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# prisma
/prisma/migrations
`;
  }

  /**
   * Generates README
   */
  private generateReadme(projectConfig: T3StackProjectConfig): string {
    let readme = `# ${projectConfig.appName}

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with \`create-t3-app\`.

## What's inside?

This project uses the following technologies:

`;

    if (projectConfig.includeNextjs) {
      readme += `- [Next.js](https://nextjs.org/) - React framework\n`;
    }
    if (projectConfig.includeTypeScript) {
      readme += `- [TypeScript](https://www.typescriptlang.org/) - Type safety\n`;
    }
    if (projectConfig.includeTrpc) {
      readme += `- [tRPC](https://trpc.io/) - End-to-end typesafety APIs\n`;
    }
    if (projectConfig.includePrisma) {
      readme += `- [Prisma](https://www.prisma.io/) - Database ORM\n`;
    }
    if (projectConfig.includeTailwind) {
      readme += `- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS\n`;
    }
    if (projectConfig.includeNextAuth && projectConfig.authProvider === 'next-auth') {
      readme += `- [NextAuth.js](https://next-auth.js.org/) - Authentication\n`;
    }

    readme += `
## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

3. Set up the database:
   \`\`\`bash
   npx prisma generate
   npx prisma db push
   \`\`\`

4. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the result.

## Learn More

- [T3 Stack Docs](https://create.t3.gg/)
- [Next.js Docs](https://nextjs.org/docs)
`;

    return readme;
  }

  /**
   * Creates the project files
   */
  private async createProjectFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const workspacePath = vscode.workspace.workspaceFolders[0]?.uri.fsPath;
    if (!workspacePath) {
      vscode.window.showErrorMessage('Unable to determine workspace path');
      return;
    }

    for (const file of files) {
      const fullPath = path.join(workspacePath, file.path);
      const directory = path.dirname(fullPath);

      // Create directory if it doesn't exist
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(directory));
      } catch {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
      }

      // Write file
      await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(file.content, 'utf-8'));

      this.logger.info('T3 Stack file created', { filePath: file.path });
    }

    vscode.window.showInformationMessage(`T3 Stack project created with ${files.length} files`);
  }
}
