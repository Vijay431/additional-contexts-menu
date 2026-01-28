import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface SvelteActionParameter {
  name: string;
  typeName: string;
  isRequired: boolean;
  defaultValue?: string;
  description?: string;
}

export interface SvelteActionImport {
  name: string;
  source: string;
  type: 'dom' | 'event' | 'utility' | 'custom';
}

export interface GeneratedSvelteAction {
  name: string;
  actionCode: string;
  importPath: string;
  parameters: SvelteActionParameter[];
  imports: SvelteActionImport[];
  actionType: 'dom' | 'event' | 'directive' | 'custom';
  hasCleanup: boolean;
}

export interface ActionTemplate {
  name: string;
  actionType: 'dom' | 'event' | 'directive' | 'custom';
  description: string;
  parameters: SvelteActionParameter[];
  imports: SvelteActionImport[];
  hasCleanup: boolean;
  codeTemplate: string;
}

/**
 * Service for generating reusable Svelte actions with TypeScript typing and parameter support
 */
export class SvelteActionGeneratorService {
  private static instance: SvelteActionGeneratorService | undefined;
  private logger: Logger;

  // Common Svelte action templates
  private readonly actionTemplates: ActionTemplate[] = [
    {
      name: 'clickOutside',
      actionType: 'event',
      description: 'Detects clicks outside an element',
      parameters: [
        {
          name: 'onClickOutside',
          typeName: '(event: MouseEvent) => void',
          isRequired: true,
          description: 'Callback function when click is detected outside',
        },
        {
          name: 'ignoreElements',
          typeName: 'HTMLElement[]',
          isRequired: false,
          description: 'Elements to ignore when detecting outside clicks',
        },
      ],
      imports: [],
      hasCleanup: true,
      codeTemplate: `
function clickOutside(node: HTMLElement, params: { onClickOutside: (event: MouseEvent) => void; ignoreElements?: HTMLElement[] }) {
	const { onClickOutside, ignoreElements = [] } = params;

	const handleClick = (event: MouseEvent) => {
		if (!node.contains(event.target as Node) && !ignoreElements.some(el => el.contains(event.target as Node))) {
			onClickOutside(event);
		}
	};

	document.addEventListener('click', handleClick, true);

	return {
		update(newParams: { onClickOutside: (event: MouseEvent) => void; ignoreElements?: HTMLElement[] }) {
			const { onClickOutside: newOnClickOutside, ignoreElements: newIgnoreElements = [] } = newParams;
			// Update would re-attach the listener with new callback
		},
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
}
`,
    },
    {
      name: 'viewport',
      actionType: 'dom',
      description: 'Tracks element visibility in viewport',
      parameters: [
        {
          name: 'onEnter',
          typeName: '(entry: IntersectionObserverEntry) => void',
          isRequired: false,
          description: 'Callback when element enters viewport',
        },
        {
          name: 'onLeave',
          typeName: '(entry: IntersectionObserverEntry) => void',
          isRequired: false,
          description: 'Callback when element leaves viewport',
        },
        {
          name: 'threshold',
          typeName: 'number',
          isRequired: false,
          defaultValue: '0.5',
          description: 'Intersection threshold (0-1)',
        },
        {
          name: 'rootMargin',
          typeName: 'string',
          isRequired: false,
          defaultValue: "'0px'",
          description: 'Margin around the root element',
        },
      ],
      imports: [],
      hasCleanup: true,
      codeTemplate: `
function viewport(node: HTMLElement, params: { onEnter?: (entry: IntersectionObserverEntry) => void; onLeave?: (entry: IntersectionObserverEntry) => void; threshold?: number; rootMargin?: string }) {
	const { onEnter, onLeave, threshold = 0.5, rootMargin = '0px' } = params;

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting && onEnter) {
					onEnter(entry);
				} else if (!entry.isIntersecting && onLeave) {
					onLeave(entry);
				}
			});
		},
		{ threshold, rootMargin }
	);

	observer.observe(node);

	return {
		update(newParams: { onEnter?: (entry: IntersectionObserverEntry) => void; onLeave?: (entry: IntersectionObserverEntry) => void; threshold?: number; rootMargin?: string }) {
			observer.disconnect();
			const { onEnter: newOnEnter, onLeave: newOnLeave, threshold: newThreshold = 0.5, rootMargin: newRootMargin = '0px' } = newParams;
			// Recreate observer with new parameters
		},
		destroy() {
			observer.disconnect();
		}
	};
}
`,
    },
    {
      name: 'focusTrap',
      actionType: 'dom',
      description: 'Traps focus within an element (useful for modals)',
      parameters: [
        {
          name: 'active',
          typeName: 'boolean',
          isRequired: false,
          defaultValue: 'true',
          description: 'Whether focus trap is active',
        },
        {
          name: 'onEscape',
          typeName: '(event: KeyboardEvent) => void',
          isRequired: false,
          description: 'Callback when Escape key is pressed',
        },
      ],
      imports: [],
      hasCleanup: true,
      codeTemplate: `
function focusTrap(node: HTMLElement, params: { active?: boolean; onEscape?: (event: KeyboardEvent) => void }) {
	const { active = true, onEscape } = params;
	let previousFocus: HTMLElement | null = null;
	const focusableElements = node.querySelectorAll(
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
	) as NodeListOf<HTMLElement>;
	const firstElement = focusableElements[0];
	const lastElement = focusableElements[focusableElements.length - 1];

	const handleFocus = (event: KeyboardEvent) => {
		if (!active) return;

		if (event.key === 'Tab') {
			if (event.shiftKey) {
				if (document.activeElement === firstElement) {
					event.preventDefault();
					lastElement.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					event.preventDefault();
					firstElement.focus();
				}
			}
		}

		if (event.key === 'Escape' && onEscape) {
			onEscape(event);
		}
	};

	if (active) {
		previousFocus = document.activeElement as HTMLElement;
		firstElement?.focus();
	}

	document.addEventListener('keydown', handleFocus);

	return {
		update(newParams: { active?: boolean; onEscape?: (event: KeyboardEvent) => void }) {
			const { active: newActive } = newParams;
			if (newActive && !previousFocus) {
				previousFocus = document.activeElement as HTMLElement;
				firstElement?.focus();
			}
		},
		destroy() {
			document.removeEventListener('keydown', handleFocus);
			previousFocus?.focus();
		}
	};
}
`,
    },
    {
      name: 'longPress',
      actionType: 'event',
      description: 'Detects long press gestures on an element',
      parameters: [
        {
          name: 'onLongPress',
          typeName: '(event: PointerEvent) => void',
          isRequired: true,
          description: 'Callback when long press is detected',
        },
        {
          name: 'duration',
          typeName: 'number',
          isRequired: false,
          defaultValue: '500',
          description: 'Duration in ms for long press',
        },
      ],
      imports: [],
      hasCleanup: true,
      codeTemplate: `
function longPress(node: HTMLElement, params: { onLongPress: (event: PointerEvent) => void; duration?: number }) {
	const { onLongPress, duration = 500 } = params;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const handlePointerDown = (event: PointerEvent) => {
		timer = setTimeout(() => {
			onLongPress(event);
		}, duration);
	};

	const handlePointerUp = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};

	const handlePointerLeave = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	};

	node.addEventListener('pointerdown', handlePointerDown);
	node.addEventListener('pointerup', handlePointerUp);
	node.addEventListener('pointerleave', handlePointerLeave);

	return {
		destroy() {
			if (timer) clearTimeout(timer);
			node.removeEventListener('pointerdown', handlePointerDown);
			node.removeEventListener('pointerup', handlePointerUp);
			node.removeEventListener('pointerleave', handlePointerLeave);
		}
	};
}
`,
    },
    {
      name: 'tooltip',
      actionType: 'directive',
      description: 'Adds tooltip functionality to an element',
      parameters: [
        {
          name: 'text',
          typeName: 'string',
          isRequired: true,
          description: 'Tooltip text content',
        },
        {
          name: 'position',
          typeName: "'top' | 'bottom' | 'left' | 'right'",
          isRequired: false,
          defaultValue: "'top'",
          description: 'Tooltip position',
        },
        {
          name: 'offset',
          typeName: 'number',
          isRequired: false,
          defaultValue: '10',
          description: 'Distance from element in pixels',
        },
      ],
      imports: [],
      hasCleanup: true,
      codeTemplate: `
function tooltip(node: HTMLElement, params: { text: string; position?: 'top' | 'bottom' | 'left' | 'right'; offset?: number }) {
	const { text, position = 'top', offset = 10 } = params;

	let tooltipEl: HTMLDivElement | null = null;

	const createTooltip = () => {
		tooltipEl = document.createElement('div');
		tooltipEl.textContent = text;
		tooltipEl.className = 'svelte-tooltip';
		tooltipEl.style.position = 'absolute';
		tooltipEl.style.zIndex = '1000';
		tooltipEl.style.padding = '0.5rem';
		tooltipEl.style.background = '#333';
		tooltipEl.style.color = '#fff';
		tooltipEl.style.borderRadius = '0.25rem';
		tooltipEl.style.fontSize = '0.875rem';
		tooltipEl.style.whiteSpace = 'nowrap';
		document.body.appendChild(tooltipEl);
		positionTooltip();
	};

	const positionTooltip = () => {
		if (!tooltipEl) return;

		const rect = node.getBoundingClientRect();
		const tooltipRect = tooltipEl.getBoundingClientRect();

		let top = 0;
		let left = 0;

		switch (position) {
			case 'top':
				top = rect.top - tooltipRect.height - offset;
				left = rect.left + (rect.width - tooltipRect.width) / 2;
				break;
			case 'bottom':
				top = rect.bottom + offset;
				left = rect.left + (rect.width - tooltipRect.width) / 2;
				break;
			case 'left':
				top = rect.top + (rect.height - tooltipRect.height) / 2;
				left = rect.left - tooltipRect.width - offset;
				break;
			case 'right':
				top = rect.top + (rect.height - tooltipRect.height) / 2;
				left = rect.right + offset;
				break;
		}

		tooltipEl.style.top = \`\${top}px\`;
		tooltipEl.style.left = \`\${left}px\`;
	};

	const handleMouseEnter = () => {
		createTooltip();
	};

	const handleMouseLeave = () => {
		if (tooltipEl) {
			tooltipEl.remove();
			tooltipEl = null;
		}
	};

	node.addEventListener('mouseenter', handleMouseEnter);
	node.addEventListener('mouseleave', handleMouseLeave);

	return {
		update(newParams: { text: string; position?: 'top' | 'bottom' | 'left' | 'right'; offset?: number }) {
			const { text: newText } = newParams;
			if (tooltipEl) {
				tooltipEl.textContent = newText;
				positionTooltip();
			}
		},
		destroy() {
			if (tooltipEl) {
				tooltipEl.remove();
			}
			node.removeEventListener('mouseenter', handleMouseEnter);
			node.removeEventListener('mouseleave', handleMouseLeave);
		}
	};
}
`,
    },
  ];

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): SvelteActionGeneratorService {
    SvelteActionGeneratorService.instance ??= new SvelteActionGeneratorService();
    return SvelteActionGeneratorService.instance;
  }

  /**
   * Shows available action templates and lets user select one
   */
  public async selectActionTemplate(): Promise<ActionTemplate | undefined> {
    const items = this.actionTemplates.map((template) => ({
      label: template.name,
      description: template.description,
      template,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a Svelte action template to generate',
    });

    return selected?.template;
  }

  /**
   * Generates a Svelte action with TypeScript typing
   */
  public async generateAction(
    document: vscode.TextDocument,
  ): Promise<GeneratedSvelteAction | undefined> {
    // Let user select a template
    const selectedTemplate = await this.selectActionTemplate();
    if (!selectedTemplate) {
      return undefined;
    }

    // Prompt for custom action name or use template name
    const actionName = await this.getActionName(selectedTemplate.name);
    if (!actionName) {
      return undefined;
    }

    // Generate action code
    const actionCode = this.generateActionCode(actionName, selectedTemplate);

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, actionName);

    this.logger.info('Svelte action generated', {
      actionName,
      actionType: selectedTemplate.actionType,
      parameterCount: selectedTemplate.parameters.length,
      hasCleanup: selectedTemplate.hasCleanup,
    });

    return {
      name: actionName,
      actionCode,
      importPath,
      parameters: selectedTemplate.parameters,
      imports: selectedTemplate.imports,
      actionType: selectedTemplate.actionType,
      hasCleanup: selectedTemplate.hasCleanup,
    };
  }

  /**
   * Generates a custom Svelte action based on user input
   */
  public async generateCustomAction(
    document: vscode.TextDocument,
  ): Promise<GeneratedSvelteAction | undefined> {
    // Get action name
    const actionName = await this.getActionName();
    if (!actionName) {
      return undefined;
    }

    // Get action type
    const actionType = await this.getActionType();
    if (!actionType) {
      return undefined;
    }

    // Get parameters
    const parameters = await this.getParameters();
    if (!parameters) {
      return undefined;
    }

    // Ask if cleanup is needed
    const hasCleanup = await this.getCleanupPreference();

    // Generate action code
    const actionCode = this.generateCustomActionCode(
      actionName,
      actionType,
      parameters,
      hasCleanup,
    );

    // Determine import path
    const importPath = this.calculateImportPath(document.fileName, actionName);

    this.logger.info('Custom Svelte action generated', {
      actionName,
      actionType,
      parameterCount: parameters.length,
      hasCleanup,
    });

    return {
      name: actionName,
      actionCode,
      importPath,
      parameters,
      imports: [],
      actionType,
      hasCleanup,
    };
  }

  /**
   * Prompts user for action name
   */
  private async getActionName(defaultName?: string): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter action name (e.g., clickOutside, focusTrap, tooltip)',
      placeHolder: defaultName || 'myAction',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Action name cannot be empty';
        }
        if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
          return 'Action name must start with lowercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Prompts user for action type
   */
  private async getActionType(): Promise<'dom' | 'event' | 'directive' | 'custom' | undefined> {
    const items = [
      {
        label: 'DOM Manipulation',
        description: 'Actions that manipulate DOM elements',
        value: 'dom' as const,
      },
      {
        label: 'Event Handling',
        description: 'Actions that handle events',
        value: 'event' as const,
      },
      {
        label: 'Directive',
        description: 'Directive-like actions (e.g., tooltips, popovers)',
        value: 'directive' as const,
      },
      { label: 'Custom', description: 'Custom action logic', value: 'custom' as const },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select action type',
    });

    return selected?.value;
  }

  /**
   * Prompts user for action parameters
   */
  private async getParameters(): Promise<SvelteActionParameter[] | undefined> {
    const parameters: SvelteActionParameter[] = [];
    let addMore = true;

    while (addMore) {
      const name = await vscode.window.showInputBox({
        prompt: `Enter parameter name (${parameters.length + 1})`,
        placeHolder: 'myParam',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Parameter name cannot be empty';
          }
          if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
            return 'Parameter name must start with lowercase letter';
          }
          if (parameters.some((p) => p.name === value)) {
            return 'Parameter name already exists';
          }
          return null;
        },
      });

      if (!name) {
        break; // User cancelled or finished
      }

      const typeName = await vscode.window.showInputBox({
        prompt: `Enter parameter type for "${name}"`,
        placeHolder: 'string | number | boolean | () => void',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Type cannot be empty';
          }
          return null;
        },
      });

      if (!typeName) {
        break;
      }

      const isRequired = await vscode.window.showQuickPick(
        [
          { label: 'Required', value: true },
          { label: 'Optional', value: false },
        ],
        {
          placeHolder: `Is "${name}" required or optional?`,
        },
      );

      if (isRequired === undefined) {
        break;
      }

      let defaultValue: string | undefined;
      if (!isRequired.value) {
        defaultValue = await vscode.window.showInputBox({
          prompt: `Enter default value for "${name}"`,
          placeHolder: 'undefined',
        });
      }

      const param: SvelteActionParameter = {
        name: name.trim(),
        typeName: typeName!.trim(),
        isRequired: isRequired.value,
      };

      if (defaultValue !== undefined) {
        param.defaultValue = defaultValue;
      }

      parameters.push(param);

      // Ask if user wants to add more parameters
      const continueChoice = await vscode.window.showQuickPick(
        [
          { label: 'Add another parameter', value: true },
          { label: 'Done', value: false },
        ],
        {
          placeHolder: 'Add more parameters?',
        },
      );

      if (!continueChoice || !continueChoice.value) {
        addMore = false;
      }
    }

    return parameters;
  }

  /**
   * Asks user if cleanup is needed
   */
  private async getCleanupPreference(): Promise<boolean> {
    const choice = await vscode.window.showQuickPick(
      [
        { label: 'Yes - needs cleanup (remove event listeners, observers, etc.)', value: true },
        { label: 'No - no cleanup needed', value: false },
      ],
      {
        placeHolder: 'Does this action need cleanup?',
      },
    );

    return choice?.value ?? true;
  }

  /**
   * Generates action code from template
   */
  private generateActionCode(actionName: string, template: ActionTemplate): string {
    let code = '';

    // Add TypeScript interfaces for parameters
    if (template.parameters.length > 0) {
      const interfaceName = this.pascalCase(actionName) + 'Params';
      code += `interface ${interfaceName} {\n`;
      for (const param of template.parameters) {
        const optional = param.isRequired ? '' : '?';
        const description = param.description ? ` // ${param.description}` : '';
        // Note: TypeScript interfaces don't support default values
        // Default values are handled in the action function itself
        void param.defaultValue; // Acknowledge the property exists
        code += `\t${param.name}${optional}: ${param.typeName};${description}\n`;
      }
      code += '}\n\n';
    }

    // Replace the function name in the template code
    const processedCode = template.codeTemplate.replace(
      /function \w+\(/,
      `function ${actionName}(`,
    );

    code += processedCode;

    return code;
  }

  /**
   * Generates custom action code
   */
  private generateCustomActionCode(
    actionName: string,
    actionType: 'dom' | 'event' | 'directive' | 'custom',
    parameters: SvelteActionParameter[],
    hasCleanup: boolean,
  ): string {
    let code = '';

    // Add TypeScript interfaces for parameters
    if (parameters.length > 0) {
      const interfaceName = this.pascalCase(actionName) + 'Params';
      code += `interface ${interfaceName} {\n`;
      for (const param of parameters) {
        const optional = param.isRequired ? '' : '?';
        const defaultVal = param.defaultValue ? ` = ${param.defaultValue}` : '';
        code += `\t${param.name}${optional}: ${param.typeName};${defaultVal}\n`;
      }
      code += '}\n\n';
    }

    // Generate function signature
    if (parameters.length > 0) {
      const interfaceName = this.pascalCase(actionName) + 'Params';
      code += `function ${actionName}(node: HTMLElement, params: ${interfaceName}) {\n`;
    } else {
      code += `function ${actionName}(node: HTMLElement) {\n`;
    }

    // Add TODO comment for implementation
    const comments: Record<string, string> = {
      dom: '// Add your DOM manipulation logic here',
      event:
        '// Add your event handling logic here\n// Example: node.addEventListener("click", handler);',
      directive:
        '// Add your directive logic here\n// Common patterns: modify node attributes, styles, or content',
      custom: '// Add your custom action logic here',
    };

    code += `\t${comments[actionType]}\n`;

    // Add return object for actions with cleanup
    if (hasCleanup) {
      code += '\n';
      code += '\treturn {\n';
      code += '\t\tupdate(newParams: any) {\n';
      code += '\t\t\t// Update logic when parameters change\n';
      if (parameters.length > 0) {
        code += '\t\t\t// TODO: Implement update with newParams\n';
      }
      code += '\t\t},\n';
      code += '\t\tdestroy() {\n';
      code += '\t\t\t// Cleanup logic: remove event listeners, observers, etc.\n';
      code += '\t\t}\n';
      code += '\t};\n';
    }

    code += '}\n';

    return code;
  }

  /**
   * Converts string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/\s/g, '');
  }

  /**
   * Calculates the relative import path for the new action
   */
  private calculateImportPath(sourceFilePath: string, actionName: string): string {
    const sourceDir = path.dirname(sourceFilePath);
    const actionsDir = path.join(sourceDir, 'actions');
    return path.join(actionsDir, `${actionName}.ts`);
  }

  /**
   * Creates the action file at the specified path
   */
  public async createActionFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write action file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('Svelte action file created', { filePath });
  }

  /**
   * Generates action usage example for Svelte components
   */
  public generateActionUsage(actionName: string, parameters: SvelteActionParameter[]): string {
    if (parameters.length === 0) {
      return `use:${actionName}`;
    }

    const requiredParams = parameters.filter((p) => p.isRequired);
    const optionalParams = parameters.filter((p) => !p.isRequired);

    let usage = `use:${actionName}={{\n`;

    for (const param of requiredParams) {
      usage += `  ${param.name}: ${param.name},\n`;
    }

    for (const param of optionalParams) {
      const defaultVal = param.defaultValue ?? 'undefined';
      usage += `  ${param.name}: ${defaultVal},\n`;
    }

    usage += '}}';

    return usage;
  }

  /**
   * Gets all available action templates
   */
  public getActionTemplates(): ActionTemplate[] {
    return this.actionTemplates;
  }
}
