import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface ReactVirtualListGeneratorOptions {
  componentName: string;
  componentDirectory: string;
  includeTypeScript: boolean;
  listType: 'fixed-size' | 'variable-size' | 'grid';
  itemHeight?: number;
  itemCount?: number;
  includeScrollToIndex: boolean;
  includeScrollToItem: boolean;
  generateTypes: boolean;
  customItemComponent?: string;
  overscanRowCount?: number;
  direction?: 'vertical' | 'horizontal';
}

export interface VirtualListProperty {
  name: string;
  type: string;
  isRequired: boolean;
  isReadonly: boolean;
  description?: string;
}

export interface GeneratedVirtualListComponent {
  componentName: string;
  componentCode: string;
  typesCode?: string;
  componentFilePath: string;
  properties: VirtualListProperty[];
  listType: 'fixed-size' | 'variable-size' | 'grid';
}

/**
 * Service for generating virtualized list components using react-window
 * Generates optimized lists for large datasets with dynamic item sizes
 */
export class ReactVirtualListGeneratorService {
  private static instance: ReactVirtualListGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): ReactVirtualListGeneratorService {
    ReactVirtualListGeneratorService.instance ??= new ReactVirtualListGeneratorService();
    return ReactVirtualListGeneratorService.instance;
  }

  /**
   * Main entry point: Generates virtual list component from selected code or user input
   */
  public async generateVirtualListComponent(
    document: vscode.TextDocument,
    selection: vscode.Selection,
    options: ReactVirtualListGeneratorOptions,
  ): Promise<GeneratedVirtualListComponent> {
    const selectedText = document.getText(selection);

    // Parse properties from selection or use defaults
    const properties = selectedText.trim()
      ? this.parsePropertiesFromCode(selectedText)
      : this.getDefaultProperties();

    // Generate component code
    const componentCode = this.generateComponentCode(options.componentName, properties, options);

    // Generate types if enabled
    let typesCode: string | undefined;
    if (options.generateTypes) {
      typesCode = this.generateTypesCode(options.componentName, properties, options);
    }

    // Determine component file path
    const componentFilePath = this.calculateComponentFilePath(
      document.fileName,
      options.componentName,
      options,
    );

    this.logger.info('React virtual list component generated', {
      componentName: options.componentName,
      listType: options.listType,
      propertyCount: properties.length,
    });

    return {
      componentName: options.componentName,
      componentCode,
      typesCode,
      componentFilePath,
      properties,
      listType: options.listType,
    };
  }

  /**
   * Parses properties from selected code (interface, type, or props)
   */
  private parsePropertiesFromCode(code: string): VirtualListProperty[] {
    const properties: VirtualListProperty[] = [];
    const trimmedCode = code.trim();

    // Try to parse as TypeScript interface (without 's' flag for ES5 compatibility)
    const interfaceMatch = trimmedCode.match(/(?:export\s+)?interface\s+(\w+)\s*{([\s\S]*?)^}/m);
    if (interfaceMatch) {
      return this.parsePropertiesFromInterfaceBody(interfaceMatch[2]);
    }

    // Try to parse as TypeScript type
    const typeMatch = trimmedCode.match(/(?:export\s+)?type\s+(\w+)\s*=\s*{([\s\S]*?)^}/m);
    if (typeMatch) {
      return this.parsePropertiesFromInterfaceBody(typeMatch[2]);
    }

    return properties;
  }

  /**
   * Parses properties from interface/type body
   */
  private parsePropertiesFromInterfaceBody(body: string): VirtualListProperty[] {
    const properties: VirtualListProperty[] = [];
    const lines = body.split(';').map((line) => line.trim());

    for (const line of lines) {
      if (!line || line.startsWith('//') || line.startsWith('*')) {
        continue;
      }

      // Match: name: type, or name?: type, or readonly name: type
      const readonlyMatch = line.match(/readonly\s+(\w+)\s*\?\s*:\s*(.+)/);
      const optionalMatch = line.match(/(\w+)\s*\?\s*:\s*(.+)/);
      const requiredMatch = line.match(/(\w+)\s*:\s*(.+)/);

      if (readonlyMatch) {
        properties.push({
          name: readonlyMatch[1],
          type: readonlyMatch[2].trim(),
          isRequired: false,
          isReadonly: true,
        });
      } else if (optionalMatch) {
        properties.push({
          name: optionalMatch[1],
          type: optionalMatch[2].trim(),
          isRequired: false,
          isReadonly: false,
        });
      } else if (requiredMatch) {
        properties.push({
          name: requiredMatch[1],
          type: requiredMatch[2].trim(),
          isRequired: true,
          isReadonly: false,
        });
      }
    }

    return properties;
  }

  /**
   * Gets default properties for virtual list component
   */
  private getDefaultProperties(): VirtualListProperty[] {
    return [
      {
        name: 'items',
        type: 'T[]',
        isRequired: true,
        isReadonly: false,
        description: 'Array of items to render',
      },
      {
        name: 'itemSize',
        type: 'number | ((index: number, data: any) => number)',
        isRequired: false,
        isReadonly: false,
        description: 'Fixed item height or function to calculate dynamic item size',
      },
      {
        name: 'height',
        type: 'number',
        isRequired: true,
        isReadonly: false,
        description: 'Height of the list container',
      },
      {
        name: 'width',
        type: 'number | string',
        isRequired: false,
        isReadonly: false,
        description: 'Width of the list container',
      },
      {
        name: 'renderItem',
        type: '(props: { index: number; style: React.CSSProperties; data: any }) => React.ReactNode',
        isRequired: true,
        isReadonly: false,
        description: 'Function to render each item',
      },
    ];
  }

  /**
   * Generates the virtual list component code
   */
  private generateComponentCode(
    componentName: string,
    properties: VirtualListProperty[],
    options: ReactVirtualListGeneratorOptions,
  ): string {
    let code = this.generateImports(options);
    code += '\n';

    // Add JSDoc comment
    code += this.generateComponentJSDoc(componentName, properties, options);

    // Generate types if enabled
    if (options.generateTypes && options.includeTypeScript) {
      const typesInterface = this.generateTypesInterface(componentName, properties, options);
      code += typesInterface;
      code += '\n';
    }

    // Generate component
    code += this.generateComponentFunction(componentName, properties, options);

    return code;
  }

  /**
   * Generates types code
   */
  private generateTypesCode(
    componentName: string,
    properties: VirtualListProperty[],
    options: ReactVirtualListGeneratorOptions,
  ): string {
    let code = this.generateImports(options);
    code += '\n';

    const typesInterface = this.generateTypesInterface(componentName, properties, options);
    code += typesInterface;

    return code;
  }

  /**
   * Generates import statements
   */
  private generateImports(options: ReactVirtualListGeneratorOptions): string {
    let imports = "import React, { useRef, useCallback, forwardRef } from 'react';\n";

    if (options.listType === 'fixed-size') {
      imports += "import { FixedSizeList, ListChildComponentProps, areEqual } from 'react-window';\n";
    } else if (options.listType === 'variable-size') {
      imports += "import { VariableSizeList, ListChildComponentProps } from 'react-window';\n";
    } else if (options.listType === 'grid') {
      imports += "import { FixedSizeGrid, GridChildComponentProps } from 'react-window';\n";
    }

    if (options.includeTypeScript) {
      imports += '\n';
    }

    return imports;
  }

  /**
   * Generates JSDoc comment for component
   */
  private generateComponentJSDoc(
    componentName: string,
    properties: VirtualListProperty[],
    options: ReactVirtualListGeneratorOptions,
  ): string {
    let code = `/**\n`;
    code += ` * Virtualized ${options.listType} list component for ${componentName}\n`;
    code += ` *\n`;
    code += ` * Optimized for rendering large lists with react-window\n`;
    code += ` * Uses windowing technique to render only visible items\n`;
    code += ` *\n`;

    if (properties.length > 0) {
      for (const prop of properties) {
        const optional = prop.isRequired ? '' : ' (optional)';
        const readonly = prop.isReadonly ? ' (readonly)' : '';
        const desc = prop.description || prop.name;
        code += ` * @property {${prop.type}} ${prop.name}${optional}${readonly} - ${desc}\n`;
      }
    }

    code += ` */\n`;
    return code;
  }

  /**
   * Generates types interface
   */
  private generateTypesInterface(
    componentName: string,
    properties: VirtualListProperty[],
    options: ReactVirtualListGeneratorOptions,
  ): string {
    let code = '';

    if (options.listType === 'grid') {
      code += `export interface ${componentName}Props<T = any> {\n`;
      code += `  /** Array of items to render */\n`;
      code += `  items: T[][];\n`;
      code += `  /** Number of columns in the grid */\n`;
      code += `  columnCount: number;\n`;
      code += `  /** Height of the grid container */\n`;
      code += `  height: number;\n`;
      code += `  /** Width of the grid container */\n`;
      code += `  width: number;\n`;
      code += `  /** Fixed height of each row */\n`;
      code += `  rowHeight: number;\n`;
      code += `  /** Fixed width of each column */\n`;
      code += `  columnWidth: number;\n`;
      code += `  /** Function to render each item */\n`;
      code += `  renderItem: (props: GridChildComponentProps) => React.ReactNode;\n`;

      if (options.includeScrollToIndex) {
        code += `  /** Initial scroll index */\n`;
        code += `  scrollToIndex?: number;\n`;
      }
    } else {
      code += `export interface ${componentName}Props<T = any> {\n`;
      code += `  /** Array of items to render */\n`;
      code += `  items: T[];\n`;

      if (options.listType === 'fixed-size') {
        code += `  /** Fixed height of each item */\n`;
        code += `  itemSize: number;\n`;
      } else {
        code += `  /** Function to calculate item height */\n`;
        code += `  getItemSize: (index: number) => number;\n`;
      }

      const direction = options.direction || 'vertical';
      if (direction === 'vertical') {
        code += `  /** Height of the list container */\n`;
        code += `  height: number;\n`;
        code += `  /** Width of the list container (optional) */\n`;
        code += `  width?: number | string;\n`;
      } else {
        code += `  /** Height of the list container (optional) */\n`;
        code += `  height?: number | string;\n`;
        code += `  /** Width of the list container */\n`;
        code += `  width: number;\n`;
      }

      code += `  /** Function to render each item */\n`;
      code += `  renderItem: (props: ListChildComponentProps) => React.ReactNode;\n`;

      if (options.includeScrollToIndex) {
        code += `  /** Initial scroll index */\n`;
        code += `  scrollToIndex?: number;\n`;
      }

      if (options.overscanRowCount) {
        code += `  /** Number of items to render above/below visible area */\n`;
        code += `  overscanRowCount?: number;\n`;
      }
    }

    code += `}\n`;
    return code;
  }

  /**
   * Generates the component function
   */
  private generateComponentFunction(
    componentName: string,
    properties: VirtualListProperty[],
    options: ReactVirtualListGeneratorOptions,
  ): string {
    const direction = options.direction || 'vertical';
    let code = '';

    if (options.listType === 'grid') {
      code += this.generateGridComponent(componentName, options);
    } else if (options.listType === 'variable-size') {
      code += this.generateVariableSizeComponent(componentName, options, direction);
    } else {
      code += this.generateFixedSizeComponent(componentName, options, direction);
    }

    return code;
  }

  /**
   * Generates fixed-size list component
   */
  private generateFixedSizeComponent(
    componentName: string,
    options: ReactVirtualListGeneratorOptions,
    direction: 'vertical' | 'horizontal',
  ): string {
    const heightProp = direction === 'vertical' ? 'height' : 'width';
    const widthProp = direction === 'vertical' ? 'width' : 'height';

    let code = `export const ${componentName} = forwardRef<any, ${componentName}Props>(\n`;
    code += `  ({ items, itemSize, ${heightProp}, ${widthProp}, renderItem, scrollToIndex, overscanRowCount }, ref) => {\n`;
    code += `    const listRef = useRef<any>(ref);\n\n`;

    // Expose scrollToIndex method if enabled
    if (options.includeScrollToItem) {
      code += `    const scrollToItem = useCallback((index: number) => {\n`;
      code += `      listRef.current?.scrollToItem(index);\n`;
      code += `    }, []);\n\n`;
      code += `    // Expose scrollToItem via ref\n`;
      code += `    React.useImperativeHandle(ref, () => ({ scrollToItem }), [scrollToItem]);\n\n`;
    }

    // Render item wrapper
    code += `    const ItemRenderer = useCallback(\n`;
    code += `      ({ index, style, data }: ListChildComponentProps) => {\n`;
    code += `        return (\n`;
    code += `          <div style={style}>\n`;
    code += `            {renderItem({ index, style, data })}\n`;
    code += `          </div>\n`;
    code += `        );\n`;
    code += `      },\n`;
    code += `      [renderItem]\n`;
    code += `    );\n\n`;

    code += `    return (\n`;
    code += `      <FixedSizeList\n`;
    code += `        ref={listRef}\n`;
    code += `        itemCount={items.length}\n`;
    code += `        itemSize={itemSize}\n`;
    code += `        ${heightProp}={${heightProp}}\n`;
    code += `        ${widthProp}={${widthProp} || '100%'}\n`;
    code += `        itemData={items}\n`;
    if (direction === 'horizontal') {
      code += `        layout="horizontal"\n`;
    }
    code += `        overscanCount={overscanRowCount || ${options.overscanRowCount || 3}}\n`;
    code += `      >\n`;
    code += `        {ItemRenderer}\n`;
    code += `      </FixedSizeList>\n`;
    code += `    );\n`;
    code += `  }\n`;
    code += `);\n\n`;

    code += `${componentName}.displayName = '${componentName}';\n`;

    return code;
  }

  /**
   * Generates variable-size list component
   */
  private generateVariableSizeComponent(
    componentName: string,
    options: ReactVirtualListGeneratorOptions,
    direction: 'vertical' | 'horizontal',
  ): string {
    const heightProp = direction === 'vertical' ? 'height' : 'width';
    const widthProp = direction === 'vertical' ? 'width' : 'height';

    let code = `export const ${componentName} = forwardRef<any, ${componentName}Props>(\n`;
    code += `  ({ items, getItemSize, ${heightProp}, ${widthProp}, renderItem, scrollToIndex, overscanRowCount }, ref) => {\n`;
    code += `    const listRef = useRef<any>(ref);\n`;
    code += `    const itemSizeCache = useRef<{ [key: number]: number }>({});\n\n`;

    // Memoized getItemSize
    code += `    const cachedGetItemSize = useCallback(\n`;
    code += `      (index: number) => {\n`;
    code += `        if (itemSizeCache.current[index] === undefined) {\n`;
    code += `          itemSizeCache.current[index] = getItemSize(index);\n`;
    code += `        }\n`;
    code += `        return itemSizeCache.current[index];\n`;
    code += `      },\n`;
    code += `      [getItemSize]\n`;
    code += `    );\n\n`;

    // Expose scrollToIndex method if enabled
    if (options.includeScrollToItem) {
      code += `    const scrollToItem = useCallback((index: number) => {\n`;
      code += `      listRef.current?.scrollToItem(index);\n`;
      code += `    }, []);\n\n`;
      code += `    // Expose scrollToItem via ref\n`;
    code += `    React.useImperativeHandle(ref, () => ({ scrollToItem }), [scrollToItem]);\n\n`;
    }

    // Render item wrapper
    code += `    const ItemRenderer = useCallback(\n`;
    code += `      ({ index, style, data }: ListChildComponentProps) => {\n`;
    code += `        return (\n`;
    code += `          <div style={style}>\n`;
    code += `            {renderItem({ index, style, data })}\n`;
    code += `          </div>\n`;
    code += `        );\n`;
    code += `      },\n`;
    code += `      [renderItem]\n`;
    code += `    );\n\n`;

    code += `    return (\n`;
    code += `      <VariableSizeList\n`;
    code += `        ref={listRef}\n`;
    code += `        itemCount={items.length}\n`;
    code += `        itemSize={cachedGetItemSize}\n`;
    code += `        ${heightProp}={${heightProp}}\n`;
    code += `        ${widthProp}={${widthProp} || '100%'}\n`;
    code += `        itemData={items}\n`;
    if (direction === 'horizontal') {
      code += `        layout="horizontal"\n`;
    }
    code += `        overscanCount={overscanRowCount || ${options.overscanRowCount || 3}}\n`;
    code += `      >\n`;
    code += `        {ItemRenderer}\n`;
    code += `      </VariableSizeList>\n`;
    code += `    );\n`;
    code += `  }\n`;
    code += `);\n\n`;

    code += `${componentName}.displayName = '${componentName}';\n`;

    return code;
  }

  /**
   * Generates grid component
   */
  private generateGridComponent(componentName: string, options: ReactVirtualListGeneratorOptions): string {
    let code = `export const ${componentName} = forwardRef<any, ${componentName}Props>(\n`;
    code += `  ({ items, columnCount, height, width, rowHeight, columnWidth, renderItem }, ref) => {\n`;
    code += `    const gridRef = useRef<any>(ref);\n\n`;

    // Expose scrollToIndex method if enabled
    if (options.includeScrollToItem) {
      code += `    const scrollToItem = useCallback((rowIndex: number, columnIndex: number) => {\n`;
      code += `      gridRef.current?.scrollToItem({ rowIndex, columnIndex });\n`;
      code += `    }, []);\n\n`;
      code += `    // Expose scrollToItem via ref\n`;
      code += `    React.useImperativeHandle(ref, () => ({ scrollToItem }), [scrollToItem]);\n\n`;
    }

    // Render item wrapper
    code += `    const ItemRenderer = useCallback(\n`;
    code += `      ({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {\n`;
    code += `        return (\n`;
    code += `          <div style={style}>\n`;
    code += `            {renderItem({ columnIndex, rowIndex, style, data })}\n`;
    code += `          </div>\n`;
    code += `        );\n`;
    code += `      },\n`;
    code += `      [renderItem]\n`;
    code += `    );\n\n`;

    code += `    return (\n`;
    code += `      <FixedSizeGrid\n`;
    code += `        ref={gridRef}\n`;
    code += `        columnCount={columnCount}\n`;
    code += `        columnWidth={columnWidth}\n`;
    code += `        height={height}\n`;
    code += `        rowCount={items.length}\n`;
    code += `        rowHeight={rowHeight}\n`;
    code += `        width={width}\n`;
    code += `        itemData={items}\n`;
    code += `      >\n`;
    code += `        {ItemRenderer}\n`;
    code += `      </FixedSizeGrid>\n`;
    code += `    );\n`;
    code += `  }\n`;
    code += `);\n\n`;

    code += `${componentName}.displayName = '${componentName}';\n`;

    return code;
  }

  /**
   * Calculates component file path
   */
  private calculateComponentFilePath(
    sourceFilePath: string,
    componentName: string,
    options: ReactVirtualListGeneratorOptions,
  ): string {
    const sourceDir = path.dirname(sourceFilePath);
    const componentDirectory = options.componentDirectory || 'components';

    const ext = options.includeTypeScript ? '.tsx' : '.jsx';
    const componentFileName = `${componentName}${ext}`;
    return path.join(sourceDir, componentDirectory, componentFileName);
  }

  /**
   * Creates the component file at the specified path
   */
  public async createComponentFile(filePath: string, code: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const directory = path.dirname(filePath);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(directory));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
    }

    // Write component file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(code, 'utf-8'));
    this.logger.info('React virtual list component file created', { filePath });
  }

  /**
   * Checks if a component file already exists
   */
  public async componentFileExists(filePath: string): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets generation options from user
   */
  public async getGeneratorOptions(
    defaultComponentName?: string,
  ): Promise<ReactVirtualListGeneratorOptions | undefined> {
    // Ask for component name
    const componentName = await vscode.window.showInputBox({
      prompt: 'Enter component name',
      placeHolder: 'VirtualList',
      value: defaultComponentName || 'VirtualList',
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

    // Ask for directory
    const componentDirectory = await vscode.window.showInputBox({
      prompt: 'Enter components directory name',
      placeHolder: 'components',
      value: 'components',
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

    // Ask for list type
    const listType = await vscode.window.showQuickPick(
      [
        { label: 'Fixed Size', description: 'List with fixed item size', value: 'fixed-size' },
        { label: 'Variable Size', description: 'List with dynamic item sizes', value: 'variable-size' },
        { label: 'Grid', description: 'Two-dimensional grid layout', value: 'grid' },
      ],
      {
        placeHolder: 'Select list type',
      },
    );

    if (!listType) {
      return undefined;
    }

    // Ask for direction (only for non-grid lists)
    let direction: 'vertical' | 'horizontal' = 'vertical';
    if (listType.value !== 'grid') {
      const directionPick = await vscode.window.showQuickPick(
        [
          { label: 'Vertical', description: 'Vertical scrolling list', value: 'vertical' },
          { label: 'Horizontal', description: 'Horizontal scrolling list', value: 'horizontal' },
        ],
        {
          placeHolder: 'Select scrolling direction',
        },
      );

      if (directionPick) {
        direction = directionPick.value as 'vertical' | 'horizontal';
      }
    }

    // Ask for features
    const features = await vscode.window.showQuickPick(
      [
        { label: 'Include TypeScript', description: 'Generate TypeScript code', picked: true },
        {
          label: 'Include ScrollToIndex',
          description: 'Add scroll to specific index functionality',
          picked: false,
        },
        {
          label: 'Include ScrollToItem Method',
          description: 'Expose scrollToItem method via ref',
          picked: false,
        },
        { label: 'Generate Types', description: 'Generate separate types file', picked: true },
      ],
      {
        placeHolder: 'Select features to include',
        canPickMany: true,
      },
    );

    if (!features) {
      return undefined;
    }

    const featureLabels = features.map((f) => f.label);

    // Ask for overscan count
    const overscanInput = await vscode.window.showInputBox({
      prompt: 'Enter overscan row count (items to render above/below visible area)',
      placeHolder: '3',
      value: '3',
      validateInput: (value) => {
        const num = Number.parseInt(value);
        if (Number.isNaN(num) || num < 0) {
          return 'Overscan count must be a non-negative number';
        }
        return null;
      },
    });

    const overscanRowCount = overscanInput ? Number.parseInt(overscanInput) : 3;

    return {
      componentName: componentName.trim(),
      componentDirectory: componentDirectory.trim(),
      includeTypeScript: featureLabels.includes('Include TypeScript'),
      listType: listType.value as 'fixed-size' | 'variable-size' | 'grid',
      includeScrollToIndex: featureLabels.includes('Include ScrollToIndex'),
      includeScrollToItem: featureLabels.includes('Include ScrollToItem Method'),
      generateTypes: featureLabels.includes('Generate Types'),
      overscanRowCount,
      direction,
    };
  }
}
