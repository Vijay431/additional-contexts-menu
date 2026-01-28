import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface TransitionVariant {
  name: string;
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'flip' | 'custom';
  enter: string;
  exit: string;
}

export interface TransitionGeneratorOptions {
  transitionType: 'css' | 'framer-motion' | 'both';
  componentDirectory: string;
  includeTypeScript: boolean;
  includeVariants: boolean;
  includeStagger: boolean;
  includeHover: boolean;
  includeTap: boolean;
  includeDrag: boolean;
  transitionName: string;
  exportType: 'named' | 'default';
  animationDuration?: number;
  easing?: string;
}

export interface TransitionPreset {
  name: string;
  description: string;
  variants: TransitionVariant[];
  duration: number;
  easing: string;
}

export interface GeneratedTransition {
  transitionName: string;
  transitionCode: string;
  cssCode?: string;
  framerMotionCode?: string;
  componentFilePath: string;
  cssFilePath?: string;
  hasTypeScript: boolean;
  transitionType: 'css' | 'framer-motion' | 'both';
  presets: TransitionPreset[];
}

/**
 * Service for generating React transition animations for route and state changes
 */
export class ReactTransitionGeneratorService {
  private static instance: ReactTransitionGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactTransitionGeneratorService {
    ReactTransitionGeneratorService.instance ??= new ReactTransitionGeneratorService();
    return ReactTransitionGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React transition animations
   */
  public async generateTransition(
    document: vscode.TextDocument,
    options: TransitionGeneratorOptions,
  ): Promise<GeneratedTransition> {
    // Generate transition code based on type
    let transitionCode = '';
    let cssCode: string | undefined;
    let framerMotionCode: string | undefined;

    if (options.transitionType === 'css' || options.transitionType === 'both') {
      cssCode = this.generateCSSTransition(options);
      transitionCode += cssCode;
    }

    if (options.transitionType === 'framer-motion' || options.transitionType === 'both') {
      framerMotionCode = this.generateFramerMotionTransition(options);
      if (options.transitionType === 'both') {
        transitionCode += '\n\n' + framerMotionCode;
      } else {
        transitionCode = framerMotionCode;
      }
    }

    // Generate presets
    const presets = this.generatePresets(options);

    // Determine file paths
    const componentFilePath = this.calculateComponentFilePath(document.fileName, options);
    const cssFilePath =
      options.transitionType === 'css' || options.transitionType === 'both'
        ? this.calculateCSSFilePath(document.fileName, options)
        : undefined;

    this.logger.info('React Transition generated', {
      transitionName: options.transitionName,
      transitionType: options.transitionType,
      hasTypeScript: options.includeTypeScript,
      includesVariants: options.includeVariants,
    });

    return {
      transitionName: options.transitionName,
      transitionCode,
      cssCode,
      framerMotionCode,
      componentFilePath,
      cssFilePath,
      hasTypeScript: options.includeTypeScript,
      transitionType: options.transitionType,
      presets,
    };
  }

  /**
   * Generates CSS-based transition animations
   */
  private generateCSSTransition(options: TransitionGeneratorOptions): string {
    const ts = options.includeTypeScript;
    const duration = options.animationDuration || 300;
    const easing = options.easing || 'ease-in-out';

    let code = this.generateCSSImports(options);

    // Generate component interface
    if (ts) {
      code += `\ninterface ${options.transitionName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      code += `  in?: boolean;\n`;
      code += `  timeout?: number;\n`;
      code += `  className?: string;\n`;
      code += `}\n\n`;
    }

    // Generate component
    code += `export ${options.exportType === 'default' ? 'default' : 'const'} ${options.transitionName}: ${ts ? `React.FC<${options.transitionName}Props>` : 'React.FC'} = ({\n`;
    code += `  children,\n`;
    code += `  in: inProp = true,\n`;
    code += `  timeout = ${duration},\n`;
    code += `  className = '',\n`;
    code += `}) => {\n`;
    code += `  const [mounted, setMounted] = React.useState(inProp);\n`;
    code += `  const [exiting, setExiting] = React.useState(false);\n\n`;

    code += `  React.useEffect(() => {\n`;
    code += `    if (inProp && !mounted) {\n`;
    code += `      setMounted(true);\n`;
    code += `    } else if (!inProp && mounted && !exiting) {\n`;
    code += `      setExiting(true);\n`;
    code += `      const timer = setTimeout(() => {\n`;
    code += `        setMounted(false);\n`;
    code += `        setExiting(false);\n`;
    code += `      }, timeout);\n`;
    code += `      return () => clearTimeout(timer);\n`;
    code += `    }\n`;
    code += `  }, [inProp, mounted, exiting, timeout]);\n\n`;

    code += `  const classes = [\n`;
    code += `    '${this.toKebabCase(options.transitionName)}',\n`;
    code += `    mounted ? '${this.toKebabCase(options.transitionName)}--enter' : '',\n`;
    code += `    exiting ? '${this.toKebabCase(options.transitionName)}--exit' : '',\n`;
    code += `    className\n`;
    code += `  ].filter(Boolean).join(' ');\n\n`;

    code += `  return mounted ? (\n`;
    code += `    <div className={classes}>\n`;
    code += `      {children}\n`;
    code += `    </div>\n`;
    code += `  ) : null;\n`;
    code += `};\n`;

    // Add CSS animation classes
    code += `\n/* CSS Animation Classes */\n`;
    code += `.${this.toKebabCase(options.transitionName)} {\n`;
    code += `  transition: all ${duration}ms ${easing};\n`;
    code += `}\n\n`;

    code += `.${this.toKebabCase(options.transitionName)}--enter {\n`;
    code += `  opacity: 0;\n`;
    code += `  transform: translateY(-20px);\n`;
    code += `}\n\n`;

    code += `.${this.toKebabCase(options.transitionName)}--enter-active {\n`;
    code += `  opacity: 1;\n`;
    code += `  transform: translateY(0);\n`;
    code += `}\n\n`;

    code += `.${this.toKebabCase(options.transitionName)}--exit {\n`;
    code += `  opacity: 1;\n`;
    code += `  transform: translateY(0);\n`;
    code += `}\n\n`;

    code += `.${this.toKebabCase(options.transitionName)}--exit-active {\n`;
    code += `  opacity: 0;\n`;
    code += `  transform: translateY(20px);\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates Framer Motion transition animations
   */
  private generateFramerMotionTransition(options: TransitionGeneratorOptions): string {
    const ts = options.includeTypeScript;
    const duration = (options.animationDuration || 300) / 1000; // Convert to seconds
    const easing = options.easing || 'easeInOut';

    let code = this.generateFramerMotionImports(options);

    // Generate transition variants
    if (options.includeVariants) {
      code += this.generateVariants(options, duration, easing);
    }

    // Generate component interface
    if (ts) {
      code += `\ninterface ${options.transitionName}Props {\n`;
      code += `  children: React.ReactNode;\n`;
      if (options.includeVariants) {
        code += `  variants?: Variants;\n`;
      }
      code += `  className?: string;\n`;
      code += `}\n\n`;
    }

    // Generate component
    code += `export ${options.exportType === 'default' ? 'default' : 'const'} ${options.transitionName}: ${ts ? `React.FC<${options.transitionName}Props>` : 'React.FC'} = ({\n`;
    code += `  children,\n`;
    if (options.includeVariants) {
      code += `  variants = ${options.transitionName}Variants,\n`;
    }
    code += `  className = '',\n`;
    code += `}) => {\n`;
    code += `  return (\n`;
    code += `    <MotionDiv\n`;
    code += `      className={className}\n`;
    if (options.includeVariants) {
      code += `      variants={variants}\n`;
      code += `      initial="hidden"\n`;
      code += `      animate="visible"\n`;
      code += `      exit="hidden"\n`;
    }
    if (options.includeStagger) {
      code += `      transition={{\n`;
      code += `        staggerChildren: 0.1,\n`;
      code += `        delayChildren: 0.2,\n`;
      code += `      }}\n`;
    } else {
      code += `      transition={{\n`;
      code += `        duration: ${duration},\n`;
      code += `        ease: "${this.normalizeEasing(easing)}",\n`;
      code += `      }}\n`;
    }
    if (options.includeHover) {
      code += `      whileHover={{ scale: 1.05 }}\n`;
    }
    if (options.includeTap) {
      code += `      whileTap={{ scale: 0.95 }}\n`;
    }
    if (options.includeDrag) {
      code += `      drag\n`;
      code += `      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}\n`;
      code += `      dragElastic={1}\n`;
    }
    code += `    >\n`;
    code += `      {children}\n`;
    code += `    </MotionDiv>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates transition variants
   */
  private generateVariants(options: TransitionGeneratorOptions, duration: number, easing: string): string {
    const ts = options.includeTypeScript;
    let code = '';

    if (ts) {
      code += `interface Variant {\n`;
      code += `  opacity?: number;\n`;
      code += `  x?: number | string;\n`;
      code += `  y?: number | string;\n`;
      code += `  scale?: number;\n`;
      code += `  rotate?: number;\n`;
      code += `  transition?: {\n`;
      code += `    duration?: number;\n`;
      code += `    ease?: string;\n`;
      code += `    delay?: number;\n`;
      code += `  };\n`;
      code += `}\n\n`;
      code += `interface Variants {\n`;
      code += `  hidden: Variant;\n`;
      code += `  visible: Variant;\n`;
      code += `}\n\n`;
    }

    code += `const ${options.transitionName}Variants: Variants = {\n`;
    code += `  hidden: {\n`;
    code += `    opacity: 0,\n`;
    code += `    y: -20,\n`;
    code += `  },\n`;
    code += `  visible: {\n`;
    code += `    opacity: 1,\n`;
    code += `    y: 0,\n`;
    code += `    transition: {\n`;
    code += `      duration: ${duration},\n`;
    code += `      ease: "${this.normalizeEasing(easing)}",\n`;
    code += `    },\n`;
    code += `  },\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates CSS imports
   */
  private generateCSSImports(options: TransitionGeneratorOptions): string {
    return `import React from 'react';\n`;
  }

  /**
   * Generates Framer Motion imports
   */
  private generateFramerMotionImports(options: TransitionGeneratorOptions): string {
    let imports = `import React from 'react';\n`;
    imports += `import { motion } from 'framer-motion';\n\n`;
    imports += `// Alias for motion.div\n`;
    imports += `const MotionDiv = motion.div;\n`;
    return imports;
  }

  /**
   * Generates transition presets
   */
  private generatePresets(options: TransitionGeneratorOptions): TransitionPreset[] {
    const duration = options.animationDuration || 300;
    const easing = options.easing || 'ease-in-out';

    return [
      {
        name: 'Fade',
        description: 'Simple fade in/out animation',
        variants: [
          {
            name: 'fade',
            type: 'fade',
            enter: 'opacity: 0',
            exit: 'opacity: 1',
          },
        ],
        duration,
        easing,
      },
      {
        name: 'Slide',
        description: 'Slide in from different directions',
        variants: [
          {
            name: 'slideUp',
            type: 'slide',
            enter: 'transform: translateY(100%)',
            exit: 'transform: translateY(-100%)',
          },
          {
            name: 'slideDown',
            type: 'slide',
            enter: 'transform: translateY(-100%)',
            exit: 'transform: translateY(100%)',
          },
          {
            name: 'slideLeft',
            type: 'slide',
            enter: 'transform: translateX(100%)',
            exit: 'transform: translateX(-100%)',
          },
          {
            name: 'slideRight',
            type: 'slide',
            enter: 'transform: translateX(-100%)',
            exit: 'transform: translateX(100%)',
          },
        ],
        duration,
        easing,
      },
      {
        name: 'Scale',
        description: 'Scale up/down animation',
        variants: [
          {
            name: 'scale',
            type: 'scale',
            enter: 'transform: scale(0)',
            exit: 'transform: scale(1)',
          },
        ],
        duration,
        easing,
      },
      {
        name: 'Rotate',
        description: 'Rotation animation',
        variants: [
          {
            name: 'rotate',
            type: 'rotate',
            enter: 'transform: rotate(-180deg) scale(0)',
            exit: 'transform: rotate(0) scale(1)',
          },
        ],
        duration,
        easing,
      },
      {
        name: 'Flip',
        description: '3D flip animation',
        variants: [
          {
            name: 'flip',
            type: 'flip',
            enter: 'transform: perspective(400px) rotateY(90deg)',
            exit: 'transform: perspective(400px) rotateY(0deg)',
          },
        ],
        duration,
        easing,
      },
    ];
  }

  /**
   * Calculates component file path
   */
  private calculateComponentFilePath(sourceFilePath: string, options: TransitionGeneratorOptions): string {
    const sourceDir = path.dirname(sourceFilePath);
    const componentDirectory = options.componentDirectory || 'components/transitions';

    const ext = options.includeTypeScript ? '.tsx' : '.jsx';
    const fileName = `${options.transitionName}${ext}`;

    return path.join(sourceDir, componentDirectory, fileName);
  }

  /**
   * Calculates CSS file path
   */
  private calculateCSSFilePath(sourceFilePath: string, options: TransitionGeneratorOptions): string {
    const sourceDir = path.dirname(sourceFilePath);
    const componentDirectory = options.componentDirectory || 'components/transitions';

    const fileName = `${options.transitionName}.module.css`;

    return path.join(sourceDir, componentDirectory, fileName);
  }

  /**
   * Converts PascalCase to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Normalizes easing function names
   */
  private normalizeEasing(easing: string): string {
    const easingMap: Record<string, string> = {
      'ease-in-out': 'easeInOut',
      'ease-in': 'easeIn',
      'ease-out': 'easeOut',
      linear: 'linear',
    };

    return easingMap[easing] || easing;
  }

  /**
   * Creates the transition file at the specified path
   */
  public async createTransitionFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Transition file created', { filePath });
  }

  /**
   * Creates the CSS file at the specified path
   */
  public async createCSSFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Transition CSS file created', { filePath });
  }

  /**
   * Checks if a transition file already exists
   */
  public async transitionFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generator options from user
   */
  public async getGeneratorOptions(): Promise<TransitionGeneratorOptions | undefined> {
    // Ask for transition type
    const transitionType = await vscode.window.showQuickPick(
      [
        {
          label: 'CSS Transitions',
          description: 'Pure CSS animations with React state',
          value: 'css',
        },
        {
          label: 'Framer Motion',
          description: 'Production-ready motion library for React',
          value: 'framer-motion',
        },
        {
          label: 'Both',
          description: 'Generate both CSS and Framer Motion versions',
          value: 'both',
        },
      ],
      {
        placeHolder: 'Select transition type',
      },
    );

    if (!transitionType) {
      return undefined;
    }

    // Ask for transition name
    const transitionName = await vscode.window.showInputBox({
      prompt: 'Enter transition component name',
      placeHolder: 'PageTransition',
      value: 'PageTransition',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Transition name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Transition name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!transitionName) {
      return undefined;
    }

    // Ask about TypeScript
    const includeTypeScript = await this.askYesNoQuestion('Use TypeScript?', true);

    // Ask for component directory
    const componentDirectory = await vscode.window.showInputBox({
      prompt: 'Enter components directory',
      placeHolder: 'components/transitions',
      value: 'components/transitions',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Directory cannot be empty';
        }
        return null;
      },
    });

    if (!componentDirectory) {
      return undefined;
    }

    // Ask for export type
    const exportType = await vscode.window.showQuickPick(
      [
        { label: 'Named Export', description: "export const TransitionName = () => {}", value: 'named' },
        { label: 'Default Export', description: 'export default () => {}', value: 'default' },
      ],
      {
        placeHolder: 'Select export type',
      },
    );

    if (!exportType) {
      return undefined;
    }

    // Ask for animation duration
    const durationInput = await vscode.window.showInputBox({
      prompt: 'Enter animation duration (ms)',
      placeHolder: '300',
      value: '300',
      validateInput: (value) => {
        const num = Number.parseInt(value, 10);
        if (Number.isNaN(num) || num < 0) {
          return 'Please enter a valid number';
        }
        return null;
      },
    });

    const animationDuration = durationInput ? Number.parseInt(durationInput, 10) : 300;

    // Ask for easing function
    const easing = await vscode.window.showQuickPick(
      [
        { label: 'Ease In Out', description: 'Slow start and end', value: 'ease-in-out' },
        { label: 'Ease In', description: 'Slow start', value: 'ease-in' },
        { label: 'Ease Out', description: 'Slow end', value: 'ease-out' },
        { label: 'Linear', description: 'Constant speed', value: 'linear' },
      ],
      {
        placeHolder: 'Select easing function',
      },
    );

    if (!easing) {
      return undefined;
    }

    // Ask for Framer Motion specific features if needed
    let includeVariants = false;
    let includeStagger = false;
    let includeHover = false;
    let includeTap = false;
    let includeDrag = false;

    if (transitionType.value === 'framer-motion' || transitionType.value === 'both') {
      const features = await vscode.window.showQuickPick(
        [
          { label: 'Variants', description: 'Include animation variants', picked: true },
          { label: 'Stagger', description: 'Include stagger children animation', picked: false },
          { label: 'Hover', description: 'Include hover effects', picked: false },
          { label: 'Tap', description: 'Include tap effects', picked: false },
          { label: 'Drag', description: 'Include drag gesture', picked: false },
        ],
        {
          placeHolder: 'Select Framer Motion features',
          canPickMany: true,
        },
      );

      if (features) {
        includeVariants = features.some((f) => f.label === 'Variants');
        includeStagger = features.some((f) => f.label === 'Stagger');
        includeHover = features.some((f) => f.label === 'Hover');
        includeTap = features.some((f) => f.label === 'Tap');
        includeDrag = features.some((f) => f.label === 'Drag');
      }
    }

    return {
      transitionType: transitionType.value as 'css' | 'framer-motion' | 'both',
      componentDirectory: componentDirectory.trim(),
      includeTypeScript,
      includeVariants,
      includeStagger,
      includeHover,
      includeTap,
      includeDrag,
      transitionName: transitionName.trim(),
      exportType: exportType.value as 'named' | 'default',
      animationDuration,
      easing: easing.value,
    };
  }

  /**
   * Helper to ask yes/no questions
   */
  private async askYesNoQuestion(question: string, defaultValue: boolean): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes', description: '', value: true },
        { label: 'No', description: '', value: false },
      ],
      {
        placeHolder: question,
      },
    );

    return choice?.value ?? defaultValue;
  }
}
