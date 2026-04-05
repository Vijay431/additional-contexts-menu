#!/usr/bin/env tsx

import * as esbuild from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Ensure dist directory exists
if (!existsSync('./dist')) {
  mkdirSync('./dist', { recursive: true });
}

// Lazy-loaded services that will be built separately
const lazyServices = [
  'src/services/enumGeneratorService.ts',
  'src/services/envFileGeneratorService.ts',
  'src/services/cronJobTimerGeneratorService.ts',
];

// Create external patterns for lazy services
const lazyServiceExternals = lazyServices.map((s) => s.replace('src/', '').replace('.ts', ''));

const createConfig = (isProduction = false): esbuild.BuildOptions => ({
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './dist/extension.js',
  external: ['vscode', 'typescript', ...lazyServiceExternals],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: isProduction ? false : 'inline',
  minify: isProduction,
  treeShaking: true,
  mainFields: ['module', 'main'],
  conditions: ['node'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
  },
  // VS Code extension optimizations
  keepNames: false,
  legalComments: 'none',
  drop: isProduction ? ['console', 'debugger'] : [],
  metafile: true,
  plugins: [],
  // Additional production optimizations for bundle size reduction
  ...(isProduction && {
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    ignoreAnnotations: true,
  }),
});

// Build lazy-loaded services as separate files
async function buildLazyServices(isProduction: boolean): Promise<void> {
  console.log('📦 Building lazy-loaded services...');

  for (const service of lazyServices) {
    const serviceName = service.split('/').pop()?.replace('.ts', '') || 'service';
    const outfile = `./dist/lazy/${serviceName}.js`;

    // Ensure lazy directory exists
    if (!existsSync('./dist/lazy')) {
      mkdirSync('./dist/lazy', { recursive: true });
    }

    const config: esbuild.BuildOptions = {
      entryPoints: [service],
      bundle: true,
      outfile,
      external: ['vscode', 'typescript'],
      format: 'cjs',
      platform: 'node',
      target: 'node20',
      sourcemap: false,
      minify: isProduction,
      treeShaking: true,
      mainFields: ['module', 'main'],
      conditions: ['node'],
      keepNames: false,
      legalComments: 'none',
      ...(isProduction && {
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
      }),
    };

    try {
      await esbuild.build(config);
      console.log(`  ✓ Built ${serviceName}.js`);
    } catch (error) {
      console.error(`  ✗ Failed to build ${serviceName}:`, error);
      throw error;
    }
  }
}

// Build function with comprehensive reporting
async function build(production = false): Promise<void> {
  try {
    console.log(`🚀 Building in ${production ? 'production' : 'development'} mode...`);

    // Build lazy services first
    await buildLazyServices(production);

    // Build main extension
    const config = createConfig(production);
    const result = await esbuild.build(config);

    if (result.metafile) {
      // Write metafile for analysis
      writeFileSync('./dist/meta.json', JSON.stringify(result.metafile, null, 2));

      // Calculate bundle metrics
      const stats = readFileSync('./dist/extension.js');
      const sizeKB = (stats.length / 1024).toFixed(2);
      // Target: 100KB for main bundle (accounts for TypeScript Compiler API for AST-based function detection)
      // This is still very aggressive - most VS Code extensions are 1-5 MB
      // VS Code Marketplace limit is 50 MB for the entire VSIX package
      const coreTargetKB = 100;
      const lazyTargetKB = 50;

      console.log('✅ Build completed successfully!');
      console.log(`📦 Main bundle size: ${sizeKB} KB`);

      // Calculate lazy services total
      let lazyTotal = 0;
      for (const service of lazyServices) {
        const serviceName = service.split('/').pop()?.replace('.ts', '') || 'service';
        const lazyFile = `./dist/lazy/${serviceName}.js`;
        if (existsSync(lazyFile)) {
          const lazyStats = readFileSync(lazyFile);
          const lazySize = lazyStats.length / 1024;
          lazyTotal += lazySize;
          console.log(`  └─ ${serviceName}.js: ${lazySize.toFixed(2)} KB`);
        }
      }
      console.log(`📦 Lazy services total: ${lazyTotal.toFixed(2)} KB`);
      console.log(`📦 Total size: ${(parseFloat(sizeKB) + lazyTotal).toFixed(2)} KB`);

      // Target verification with more realistic goals
      const totalSize = parseFloat(sizeKB) + lazyTotal;
      const totalTarget = coreTargetKB + lazyTargetKB;

      if (parseFloat(sizeKB) > coreTargetKB) {
        console.log(
          `⚠️  Main bundle exceeds ${coreTargetKB}KB target by ${(parseFloat(sizeKB) - coreTargetKB).toFixed(2)}KB`,
        );
      } else {
        console.log(
          `✨ Main bundle is ${(coreTargetKB - parseFloat(sizeKB)).toFixed(2)}KB under ${coreTargetKB}KB target!`,
        );
      }

      if (totalSize > totalTarget) {
        console.log(
          `⚠️  Total bundle exceeds ${totalTarget}KB target by ${(totalSize - totalTarget).toFixed(2)}KB`,
        );
      }

      // Bundle analysis summary
      const inputs = Object.keys(result.metafile.inputs).length;
      const outputs = Object.keys(result.metafile.outputs).length;
      console.log(`📋 Bundle analysis: ${inputs} input files, ${outputs} output files`);
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Watch function for development
async function watch(): Promise<void> {
  console.log('👀 Starting watch mode...');

  const config = createConfig(false);
  const context = await esbuild.context({
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      {
        name: 'watch-plugin',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log('🔄 Rebuild completed at', new Date().toLocaleTimeString());
            }
          });
        },
      },
    ],
  });

  await context.watch();
}

// Export for external use
export { build, createConfig, watch };

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const isProduction = args.includes('--production') || process.env['NODE_ENV'] === 'production';
  const isWatch = args.includes('--watch');

  if (isWatch) {
    watch().catch(console.error);
  } else {
    build(isProduction).catch(console.error);
  }
}
