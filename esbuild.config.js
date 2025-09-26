const esbuild = require('esbuild');
const { readFileSync, writeFileSync } = require('fs');

/** @type {import('esbuild').BuildOptions} */
const createConfig = (isProduction = false) => ({
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node16',
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
});

// Build function with comprehensive reporting
async function build(production = false) {
  try {
    console.log(`🚀 Building in ${production ? 'production' : 'development'} mode...`);

    const config = createConfig(production);
    const result = await esbuild.build(config);

    if (result.metafile) {
      // Write metafile for analysis
      writeFileSync('./dist/meta.json', JSON.stringify(result.metafile, null, 2));

      // Calculate bundle metrics
      const stats = readFileSync('./dist/extension.js');
      const sizeKB = (stats.length / 1024).toFixed(2);
      const targetKB = 50;

      console.log(`✅ Build completed successfully!`);
      console.log(`📦 Bundle size: ${sizeKB} KB`);

      // Target verification
      if (parseFloat(sizeKB) > targetKB) {
        console.log(
          `⚠️  Bundle exceeds ${targetKB}KB target by ${(parseFloat(sizeKB) - targetKB).toFixed(2)}KB`,
        );
      } else {
        console.log(
          `✨ Bundle is ${(targetKB - parseFloat(sizeKB)).toFixed(2)}KB under ${targetKB}KB target!`,
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
async function watch() {
  console.log('👀 Starting watch mode...');

  const config = createConfig(false);
  const context = await esbuild.context({
    ...config,
    plugins: [
      ...config.plugins,
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
module.exports = { createConfig, build, watch };

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const isProduction = args.includes('--production') || process.env.NODE_ENV === 'production';
  const isWatch = args.includes('--watch');

  if (isWatch) {
    watch().catch(console.error);
  } else {
    build(isProduction).catch(console.error);
  }
}
