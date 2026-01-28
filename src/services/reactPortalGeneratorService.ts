import * as path from 'path';

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ReactPortalGeneratorOptions {
  portalType: 'modal' | 'tooltip' | 'custom';
  componentName: string;
  includeTypeScript: boolean;
  includeZIndexManagement: boolean;
  includeEventPropagationHandling: boolean;
  includeCloseOnEscape: boolean;
  includeCloseOnOutsideClick: boolean;
  portalContainerId?: string;
  zIndex?: number;
  defaultClassName?: string;
}

export interface PortalProperty {
  name: string;
  type: string;
  isRequired: boolean;
  description?: string;
}

export interface GeneratedReactPortal {
  componentName: string;
  portalType: 'modal' | 'tooltip' | 'custom';
  portalCode: string;
  hookCode?: string;
  containerSetupCode?: string;
  filePath: string;
  hasTypeScript: boolean;
  properties: PortalProperty[];
}

/**
 * Service for generating React Portal components with z-index management
 * and event propagation handling
 */
export class ReactPortalGeneratorService {
  private static instance: ReactPortalGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactPortalGeneratorService {
    ReactPortalGeneratorService.instance ??= new ReactPortalGeneratorService();
    return ReactPortalGeneratorService.instance;
  }

  /**
   * Main entry point: Generates React Portal component
   */
  public async generateReactPortal(
    document: vscode.TextDocument,
    options: ReactPortalGeneratorOptions,
  ): Promise<GeneratedReactPortal> {
    // Determine properties based on portal type
    const properties = this.getPropertiesForPortalType(options);

    // Generate the portal component code
    const portalCode = this.generatePortalCode(options, properties);

    // Generate hook if needed
    let hookCode: string | undefined;
    if (options.includeCloseOnEscape || options.includeCloseOnOutsideClick) {
      hookCode = this.generatePortalHook(options);
    }

    // Generate container setup code
    let containerSetupCode: string | undefined;
    if (options.portalType !== 'custom') {
      containerSetupCode = this.generateContainerSetupCode(options);
    }

    // Determine file path
    const filePath = this.calculateFilePath(document.fileName, options);

    this.logger.info('React Portal component generated', {
      componentName: options.componentName,
      portalType: options.portalType,
      hasTypeScript: options.includeTypeScript,
    });

    return {
      componentName: options.componentName,
      portalType: options.portalType,
      portalCode,
      hookCode,
      containerSetupCode,
      filePath,
      hasTypeScript: options.includeTypeScript,
      properties,
    };
  }

  /**
   * Gets properties for different portal types
   */
  private getPropertiesForPortalType(
    options: ReactPortalGeneratorOptions,
  ): PortalProperty[] {
    const baseProperties: PortalProperty[] = [
      {
        name: 'children',
        type: 'React.ReactNode',
        isRequired: true,
        description: 'Content to render inside the portal',
      },
      {
        name: 'isOpen',
        type: 'boolean',
        isRequired: true,
        description: 'Whether the portal is currently open',
      },
    ];

    const typeSpecificProperties: Record<
      Exclude<ReactPortalGeneratorOptions['portalType'], 'custom'>,
      PortalProperty[]
    > = {
      modal: [
        {
          name: 'onClose',
          type: '() => void',
          isRequired: false,
          description: 'Callback when the modal should close',
        },
        {
          name: 'className',
          type: 'string',
          isRequired: false,
          description: 'Additional CSS classes for the modal',
        },
        {
          name: 'closeOnEscape',
          type: 'boolean',
          isRequired: false,
          description: 'Close modal when Escape key is pressed',
        },
        {
          name: 'closeOnOutsideClick',
          type: 'boolean',
          isRequired: false,
          description: 'Close modal when clicking outside',
        },
      ],
      tooltip: [
        {
          name: 'content',
          type: 'React.ReactNode',
          isRequired: true,
          description: 'Tooltip content',
        },
        {
          name: 'placement',
          type: "'top' | 'bottom' | 'left' | 'right'",
          isRequired: false,
          description: 'Tooltip position relative to target',
        },
        {
          name: 'className',
          type: 'string',
          isRequired: false,
          description: 'Additional CSS classes for the tooltip',
        },
        {
          name: 'delay',
          type: 'number',
          isRequired: false,
          description: 'Delay in milliseconds before showing tooltip',
        },
      ],
    };

    return [
      ...baseProperties,
      ...(options.portalType === 'custom'
        ? []
        : typeSpecificProperties[options.portalType]),
    ];
  }

  /**
   * Generates the portal component code
   */
  private generatePortalCode(
    options: ReactPortalGeneratorOptions,
    properties: PortalProperty[],
  ): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Generate imports
    code += this.generateImports(options);

    // Generate props interface for TypeScript
    if (ts) {
      code += this.generatePropsInterface(options, properties);
    }

    // Generate JSDoc comment
    code += this.generateJSDoc(options, properties);

    // Generate component
    if (options.portalType === 'modal') {
      code += this.generateModalPortal(options, ts);
    } else if (options.portalType === 'tooltip') {
      code += this.generateTooltipPortal(options, ts);
    } else {
      code += this.generateCustomPortal(options, ts);
    }

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(options: ReactPortalGeneratorOptions): string {
    let imports = "import React, { useEffect, useRef, useState } from 'react';\n";
    imports += "import { createPortal } from 'react-dom';\n";

    if (options.includeCloseOnEscape || options.includeCloseOnOutsideClick) {
      imports += `import { usePortal } from './usePortal';\n`;
    }

    return imports + '\n';
  }

  /**
   * Generates props interface
   */
  private generatePropsInterface(
    options: ReactPortalGeneratorOptions,
    properties: PortalProperty[],
  ): string {
    let code = `interface ${options.componentName}Props {\n`;

    for (const prop of properties) {
      const optional = prop.isRequired ? '' : '?';
      code += `  ${prop.name}${optional}: ${prop.type};\n`;
    }

    if (options.includeZIndexManagement) {
      code += `  zIndex?: number;\n`;
    }

    code += `}\n\n`;

    return code;
  }

  /**
   * Generates JSDoc comment
   */
  private generateJSDoc(
    options: ReactPortalGeneratorOptions,
    properties: PortalProperty[],
  ): string {
    let code = `/**\n`;
    code += ` * ${options.componentName} - ${options.portalType} portal component\n`;
    code += ` *\n`;

    if (properties.length > 0) {
      code += ` * Props:\n`;
      for (const prop of properties) {
        const optional = prop.isRequired ? '' : ' (optional)';
        code += ` * @param {${prop.type}} ${prop.name}${optional} - ${prop.description || prop.name}\n`;
      }
    }

    code += ` */\n`;

    return code;
  }

  /**
   * Generates modal portal component
   */
  private generateModalPortal(
    options: ReactPortalGeneratorOptions,
    ts: boolean,
  ): string {
    const props = ts ? `: ${options.componentName}Props` : '';
    const zIndex = options.zIndex ?? 1000;

    let code = `export const ${options.componentName} = ({\n`;
    code += `  children,\n`;
    code += `  isOpen,\n`;
    code += `  onClose,\n`;
    code += `  className = '',\n`;
    code += `  closeOnEscape = true,\n`;
    code += `  closeOnOutsideClick = true,\n`;
    code += `  zIndex = ${zIndex},\n`;
    code += `}${props}) => {\n`;

    // Use hook for event handling
    if (options.includeEventPropagationHandling) {
      code += `  const portalRef = useRef<HTMLDivElement>(null);\n\n`;
      code += `  const { handleKeyDown, handleMouseDown } = usePortal({\n`;
      code += `    isOpen,\n`;
      code += `    onClose,\n`;
      code += `    closeOnEscape,\n`;
      code += `    closeOnOutsideClick,\n`;
      code += `    portalRef,\n`;
      code += `  });\n\n`;
    }

    // Render nothing if not open
    code += `  if (!isOpen) return null;\n\n`;

    // Create portal
    const containerId = options.portalContainerId || 'modal-root';
    code += `  return createPortal(\n`;
    code += `    <div\n`;
    code += `      ref=${options.includeEventPropagationHandling ? 'portalRef' : 'undefined'}\n`;
    code += `      className="${options.defaultClassName || 'modal-overlay'} ${className}"\n`;
    code += `      style={{ zIndex }}\n`;
    if (options.includeEventPropagationHandling) {
      code += `      onMouseDown={handleMouseDown}\n`;
      code += `      onKeyDown={handleKeyDown}\n`;
    }
    code += `    >\n`;
    code += `      <div className="modal-content">\n`;
    code += `        {children}\n`;
    code += `      </div>\n`;
    code += `    </div>,\n`;
    code += `    document.getElementById('${containerId}') || document.body\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates tooltip portal component
   */
  private generateTooltipPortal(
    options: ReactPortalGeneratorOptions,
    ts: boolean,
  ): string {
    const props = ts ? `: ${options.componentName}Props` : '';
    const zIndex = options.zIndex ?? 1001;

    let code = `export const ${options.componentName} = ({\n`;
    code += `  children,\n`;
    code += `  isOpen,\n`;
    code += `  content,\n`;
    code += `  placement = 'top',\n`;
    code += `  className = '',\n`;
    code += `  delay = 0,\n`;
    code += `  zIndex = ${zIndex},\n`;
    code += `}${props}) => {\n`;

    code += `  const [isVisible, setIsVisible] = useState(isOpen);\n`;
    code += `  const timeoutRef = useRef<NodeJS.Timeout>();\n\n`;

    // Handle delay
    code += `  useEffect(() => {\n`;
    code += `    if (delay > 0) {\n`;
    code += `      timeoutRef.current = setTimeout(() => {\n`;
    code += `        setIsVisible(isOpen);\n`;
    code += `      }, delay);\n`;
    code += `    } else {\n`;
    code += `      setIsVisible(isOpen);\n`;
    code += `    }\n\n`;
    code += `    return () => {\n`;
    code += `      if (timeoutRef.current) {\n`;
    code += `        clearTimeout(timeoutRef.current);\n`;
    code += `      }\n`;
    code += `    };\n`;
    code += `  }, [isOpen, delay]);\n\n`;

    // Render nothing if not visible
    code += `  if (!isVisible) return <>{children}</>;\n\n`;

    // Create portal
    const containerId = options.portalContainerId || 'tooltip-root';
    code += `  return (\n`;
    code += `    <>\n`;
    code += `      {children}\n`;
    code += `      {createPortal(\n`;
    code += `        <div\n`;
    code += `          className="${options.defaultClassName || 'tooltip'} ${className} tooltip-${placement}"\n`;
    code += `          style={{ zIndex }}\n`;
    code += `          role="tooltip"\n`;
    code += `        >\n`;
    code += `          {content}\n`;
    code += `        </div>,\n`;
    code += `        document.getElementById('${containerId}') || document.body\n`;
    code += `      )}\n`;
    code += `    </>\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates custom portal component
   */
  private generateCustomPortal(
    options: ReactPortalGeneratorOptions,
    ts: boolean,
  ): string {
    const props = ts ? `: ${options.componentName}Props` : '';
    const zIndex = options.zIndex ?? 1000;

    let code = `export const ${options.componentName} = ({\n`;
    code += `  children,\n`;
    code += `  isOpen,\n`;
    code += `  zIndex = ${zIndex},\n`;
    code += `}${props}) => {\n`;

    // Render nothing if not open
    code += `  if (!isOpen) return null;\n\n`;

    // Create portal
    const containerId = options.portalContainerId || 'portal-root';
    code += `  return createPortal(\n`;
    code += `    <div style={{ zIndex }}>\n`;
    code += `      {children}\n`;
    code += `    </div>,\n`;
    code += `    document.getElementById('${containerId}') || document.body\n`;
    code += `  );\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates the portal hook for event handling
   */
  private generatePortalHook(options: ReactPortalGeneratorOptions): string {
    const ts = options.includeTypeScript;
    let code = '';

    // Hook imports
    code += `import { useEffect, useRef } from 'react';\n\n`;

    // Hook interface for TypeScript
    if (ts) {
      code += `interface UsePortalOptions {\n`;
      code += `  isOpen: boolean;\n`;
      code += `  onClose?: () => void;\n`;
      code += `  closeOnEscape?: boolean;\n`;
      code += `  closeOnOutsideClick?: boolean;\n`;
      code += `  portalRef: React.RefObject<HTMLDivElement>;\n`;
      code += `}\n\n`;

      code += `interface UsePortalReturn {\n`;
      code += `  handleKeyDown: (e: React.KeyboardEvent) => void;\n`;
      code += `  handleMouseDown: (e: React.MouseEvent) => void;\n`;
      code += `}\n\n`;
    }

    // Hook implementation
    code += `export const usePortal = ({\n`;
    code += `  isOpen,\n`;
    code += `  onClose,\n`;
    code += `  closeOnEscape = true,\n`;
    code += `  closeOnOutsideClick = true,\n`;
    code += `  portalRef,\n`;
    code += `}${ts ? ': UsePortalOptions' : ''})${ts ? ': UsePortalReturn' : ''} => {\n`;

    // Escape key handler
    if (options.includeCloseOnEscape) {
      code += `  const handleKeyDown = ${ts ? `(e: React.KeyboardEvent) => ` : ''}(e) => {\n`;
      code += `    if (closeOnEscape && isOpen && e.key === 'Escape' && onClose) {\n`;
      code += `      e.stopPropagation();\n`;
      code += `      onClose();\n`;
      code += `    }\n`;
      code += `  };\n\n`;
    } else {
      code += `  const handleKeyDown = ${ts ? `() => void` : '()'} => {};\n\n`;
    }

    // Outside click handler
    if (options.includeCloseOnOutsideClick) {
      code += `  const handleMouseDown = ${ts ? `(e: React.MouseEvent) => ` : ''}(e) => {\n`;
      code += `    if (\n`;
      code += `      closeOnOutsideClick &&\n`;
      code += `      isOpen &&\n`;
      code += `      portalRef.current &&\n`;
      code += `      !portalRef.current.contains(e.target as Node)\n`;
      code += `    ) {\n`;
      code += `      e.stopPropagation();\n`;
      code += `      if (onClose) {\n`;
      code += `        onClose();\n`;
      code += `      }\n`;
      code += `    }\n`;
      code += `  };\n\n`;
    } else {
      code += `  const handleMouseDown = ${ts ? `() => void` : '()'} => {};\n\n`;
    }

    code += `  return {\n`;
    code += `    handleKeyDown,\n`;
    code += `    handleMouseDown,\n`;
    code += `  };\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates container setup code
   */
  private generateContainerSetupCode(options: ReactPortalGeneratorOptions): string {
    const containerId = options.portalContainerId || `${options.portalType}-root`;
    let code = `// Portal Container Setup\n`;
    code += `// Add this to your root HTML file (e.g., index.html or _document.tsx):\n\n`;
    code += `// In your HTML/Template:\n`;
    code += `// <div id="${containerId}"></div>\n\n`;

    if (options.portalType === 'modal') {
      code += `// Recommended CSS:\n`;
      code += `// .modal-overlay {\n`;
      code += `//   position: fixed;\n`;
      code += `//   top: 0;\n`;
      code += `//   left: 0;\n`;
      code += `//   right: 0;\n`;
      code += `//   bottom: 0;\n`;
      code += `//   display: flex;\n`;
      code += `//   align-items: center;\n`;
      code += `//   justify-content: center;\n`;
      code += `//   background-color: rgba(0, 0, 0, 0.5);\n`;
      code += `// }\n`;
      code += `//\n`;
      code += `// .modal-content {\n`;
      code += `//   background: white;\n`;
      code += `//   padding: 20px;\n`;
      code += `//   border-radius: 8px;\n`;
      code += `//   max-width: 500px;\n`;
      code += `// }\n`;
    } else if (options.portalType === 'tooltip') {
      code += `// Recommended CSS:\n`;
      code += `// .tooltip {\n`;
      code += `//   position: fixed;\n`;
      code += `//   padding: 8px 12px;\n`;
      code += `//   background: #333;\n`;
      code += `//   color: white;\n`;
      code += `//   border-radius: 4px;\n`;
      code += `//   font-size: 14px;\n`;
      code += `//   z-index: 1001;\n`;
      code += `// }\n`;
      code += `//\n`;
      code += `// .tooltip-top { bottom: 100%; left: 50%; transform: translateX(-50%); }\n`;
      code += `// .tooltip-bottom { top: 100%; left: 50%; transform: translateX(-50%); }\n`;
      code += `// .tooltip-left { right: 100%; top: 50%; transform: translateY(-50%); }\n`;
      code += `// .tooltip-right { left: 100%; top: 50%; transform: translateY(-50%); }\n`;
    }

    return code;
  }

  /**
   * Calculates file path for the portal component
   */
  private calculateFilePath(
    sourceFilePath: string,
    options: ReactPortalGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const ext = options.includeTypeScript ? '.tsx' : '.jsx';
    const fileName = `${options.componentName}${ext}`;
    return path.join(sourceDir, fileName);
  }

  /**
   * Creates the portal component file at the specified path
   */
  public async createPortalFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write portal file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Portal file created', { filePath });
  }

  /**
   * Creates the hook file at the specified path
   */
  public async createHookFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write hook file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Portal hook file created', { filePath });
  }

  /**
   * Checks if a portal file already exists
   */
  public async portalFileExists(filePath: string): Promise<boolean> {
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
  public async getGeneratorOptions(): Promise<ReactPortalGeneratorOptions | undefined> {
    // Step 1: Ask for portal type
    const portalType = await vscode.window.showQuickPick(
      [
        {
          label: 'Modal',
          description: 'Portal for modal dialogs with overlay',
          value: 'modal',
        },
        {
          label: 'Tooltip',
          description: 'Portal for tooltips and popovers',
          value: 'tooltip',
        },
        {
          label: 'Custom',
          description: 'Custom portal implementation',
          value: 'custom',
        },
      ],
      {
        placeHolder: 'Select portal type',
      },
    );

    if (!portalType) {
      return undefined;
    }

    // Step 2: Ask for component name
    const componentName = await vscode.window.showInputBox({
      prompt: 'Enter portal component name',
      placeHolder: portalType.value === 'modal' ? 'Modal' : 'Tooltip',
      value: portalType.value === 'modal' ? 'Modal' : 'Tooltip',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Component name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Component name must start with uppercase letter and contain only alphanumeric characters';
        }
        return null;
      },
    });

    if (!componentName) {
      return undefined;
    }

    // Step 3: Ask about TypeScript
    const includeTypeScript = await this.askYesNoQuestion('Use TypeScript?', true);

    // Step 4: Ask about features
    const features = await vscode.window.showQuickPick(
      [
        {
          label: 'Z-Index Management',
          description: 'Include configurable z-index prop',
          picked: true,
        },
        {
          label: 'Event Propagation Handling',
          description: 'Handle keyboard and mouse events',
          picked: true,
        },
        {
          label: 'Close on Escape',
          description: 'Allow closing with Escape key',
          picked: true,
        },
        {
          label: 'Close on Outside Click',
          description: 'Allow closing by clicking outside',
          picked: true,
        },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    // Step 5: Ask for portal container ID
    const portalContainerId = await vscode.window.showInputBox({
      prompt: 'Enter portal container ID (optional)',
      placeHolder: 'portal-root',
      value: `${portalType.value}-root`,
    });

    // Step 6: Ask for default z-index
    const zIndexInput = await vscode.window.showInputBox({
      prompt: 'Enter default z-index',
      placeHolder: '1000',
      value: '1000',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Z-index cannot be empty';
        }
        if (!/^\d+$/.test(value)) {
          return 'Z-index must be a number';
        }
        return null;
      },
    });

    const zIndex = zIndexInput ? Number.parseInt(zIndexInput, 10) : 1000;

    // Step 7: Ask for default class name
    const defaultClassName = await vscode.window.showInputBox({
      prompt: 'Enter default CSS class name (optional)',
      placeHolder: portalType.value === 'modal' ? 'modal-overlay' : 'tooltip',
    });

    return {
      portalType: portalType.value as 'modal' | 'tooltip' | 'custom',
      componentName: componentName.trim(),
      includeTypeScript,
      includeZIndexManagement: features.some((f) => f.label === 'Z-Index Management'),
      includeEventPropagationHandling: features.some((f) => f.label === 'Event Propagation Handling'),
      includeCloseOnEscape: features.some((f) => f.label === 'Close on Escape'),
      includeCloseOnOutsideClick: features.some((f) => f.label === 'Close on Outside Click'),
      portalContainerId: portalContainerId || undefined,
      zIndex,
      defaultClassName: defaultClassName || undefined,
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
