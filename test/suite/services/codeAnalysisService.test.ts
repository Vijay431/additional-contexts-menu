import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeAnalysisService } from '../../../src/services/codeAnalysisService';
import { TestSetup, TestHelpers } from '../utils/testSetup';

suite('CodeAnalysisService Tests', () => {
  let codeAnalysisService: CodeAnalysisService;

  setup(() => {
    TestSetup.setup();
    codeAnalysisService = TestSetup.createCodeAnalysisService();
  });

  teardown(() => {
    TestSetup.teardown();
  });

  suite('Function Declaration Detection', () => {
    test('should find function declaration', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'testFunction');
      assert.strictEqual(result?.type, 'function');
    });

    test('should find exported function declaration', async () => {
      const code = `export function exportedFunction() {
  return 42;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'exportedFunction');
      assert.strictEqual(result?.isExported, true);
    });

    test('should find async function declaration', async () => {
      const code = `async function asyncFunction() {
  await Promise.resolve();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'asyncFunction');
      assert.strictEqual(result?.type, 'async');
    });
  });

  suite('Arrow Function Detection', () => {
    test('should find arrow function', async () => {
      const code = `const arrowFunction = () => {
  const x = 1;
  return x;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'arrowFunction');
      assert.strictEqual(result?.type, 'arrow');
    });

    test('should find arrow function with async', async () => {
      const code = `const asyncArrow = async () => {
  await Promise.resolve();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'asyncArrow');
      assert.strictEqual(result?.type, 'async');
    });

    test('should find single expression arrow function', async () => {
      const code = `const singleExpression = () => 42;`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(0, 25);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'singleExpression');
      assert.strictEqual(result?.type, 'arrow');
    });
  });

  suite('Method Detection', () => {
    test('should find class method', async () => {
      const code = `class TestClass {
  testMethod() {
    return true;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'testMethod');
      assert.strictEqual(result?.type, 'method');
    });

    test('should find async class method', async () => {
      const code = `class TestClass {
  async asyncMethod() {
    await Promise.resolve();
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'asyncMethod');
      assert.strictEqual(result?.type, 'async');
    });

    test('should find object method', async () => {
      const code = `const obj = {
  method() {
    return true;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'method');
      assert.strictEqual(result?.type, 'method');
    });
  });

  suite('React Component Detection', () => {
    test('should find functional component', async () => {
      const code = `const MyComponent = () => {
  return <div>Hello</div>;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'MyComponent');
      assert.strictEqual(result?.type, 'component');
    });

    test('should find function component', async () => {
      const code = `function MyComponent() {
  return <div>Hello</div>;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'MyComponent');
      assert.strictEqual(result?.type, 'function');
    });
  });

  suite('React Hook Detection', () => {
    test('should find custom hook', async () => {
      const code = `const useCustom = () => {
  const [state, setState] = useState(0);
  return state;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'useCustom');
      assert.strictEqual(result?.type, 'hook');
    });

    test('should find async custom hook', async () => {
      const code = `const useAsync = async () => {
  await Promise.resolve();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'useAsync');
      assert.strictEqual(result?.type, 'hook');
    });
  });

  suite('Function Boundaries', () => {
    test('should detect correct function start line', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.startLine, 1);
    });

    test('should detect correct function end line', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.endLine, 3);
    });

    test('should handle nested functions', async () => {
      const code = `function outerFunction() {
  function innerFunction() {
    return true;
  }
  return false;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const innerPosition = new vscode.Position(2, 0);
      const outerPosition = new vscode.Position(1, 0);

      const innerResult = await codeAnalysisService.findFunctionAtPosition(document, innerPosition);
      const outerResult = await codeAnalysisService.findFunctionAtPosition(document, outerPosition);

      assert.ok(innerResult);
      assert.strictEqual(innerResult?.name, 'innerFunction');

      assert.ok(outerResult);
      assert.strictEqual(outerResult?.name, 'outerFunction');
    });

    test('should handle multiple nested braces', async () => {
      const code = `function complexFunction() {
  if (true) {
    if (false) {
      return true;
    }
  }
  return false;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(3, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'complexFunction');
      assert.strictEqual(result?.endLine, 8);
    });
  });

  suite('Edge Cases and Special Characters', () => {
    test('should handle braces in strings', async () => {
      const code = `function stringWithBraces() {
  const str = '{}';
  return str;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.endLine, 4);
    });

    test('should handle braces in template literals', async () => {
      const code = `function templateLiteral() {
  const tpl = \`value: \${value}\`;
  return tpl;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.endLine, 4);
    });

    test('should handle single-line comments', async () => {
      const code = `function withComments() {
  // const x = { value: 1 };
  return true;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.endLine, 4);
    });

    test('should handle multi-line comments', async () => {
      const code = `function multiLineComment() {
  /*
  const x = { value: 1 };
  */
  return true;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.endLine, 6);
    });

    test('should handle escaped quotes', async () => {
      const code = `function escapedQuotes() {
  const str = 'test\\'s string';
  return str;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.endLine, 4);
    });

    test('should handle decorator annotations', async () => {
      const code = `class TestClass {
  @decorator
  decoratedMethod() {
    return true;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(3, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'decoratedMethod');
      assert.strictEqual(result?.hasDecorators, true);
    });
  });

  suite('Position Detection', () => {
    test('should return null when position is outside any function', async () => {
      const code = `function testFunction() {
  console.log('test');
}

const x = 42;`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(5, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.strictEqual(result, null);
    });

    test('should detect position at function start', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(0, 9);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'testFunction');
    });

    test('should detect position in function body', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 15);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'testFunction');
    });

    test('should detect position at function end', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'testFunction');
    });
  });

  suite('Import Extraction', () => {
    test('should extract named imports', () => {
      const code = `import { Component } from 'react';
import { useState, useEffect } from 'react';`;

      const imports = codeAnalysisService.extractImports(code, 'typescript');

      assert.strictEqual(imports.length, 2);
      assert.ok(imports[0]?.includes("import { Component }"));
      assert.ok(imports[1]?.includes("import { useState, useEffect }"));
    });

    test('should extract default imports', () => {
      const code = `import React from 'react';
import Logger from './logger';`;

      const imports = codeAnalysisService.extractImports(code, 'typescript');

      assert.strictEqual(imports.length, 2);
      assert.ok(imports[0]?.includes("import React"));
      assert.ok(imports[1]?.includes("import Logger"));
    });

    test('should extract namespace imports', () => {
      const code = `import * as React from 'react';
import * as Utils from './utils';`;

      const imports = codeAnalysisService.extractImports(code, 'typescript');

      assert.strictEqual(imports.length, 2);
      assert.ok(imports[0]?.includes("import * as React"));
      assert.ok(imports[1]?.includes("import * as Utils"));
    });

    test('should extract mixed imports', () => {
      const code = `import React, { useState } from 'react';
import { Helper } from './helper';`;

      const imports = codeAnalysisService.extractImports(code, 'typescript');

      assert.strictEqual(imports.length, 2);
    });

    test('should return empty array when no imports', () => {
      const code = `const x = 42;
function test() {}`;

      const imports = codeAnalysisService.extractImports(code, 'typescript');

      assert.strictEqual(imports.length, 0);
    });
  });

  suite('Error Handling', () => {
    test('should handle empty document', async () => {
      const code = '';
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(0, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.strictEqual(result, null);
    });

    test('should handle document with only whitespace', async () => {
      const code = '   \n\n   \n';
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(0, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.strictEqual(result, null);
    });

    test('should handle invalid position gracefully', async () => {
      const code = `function testFunction() {
  console.log('test');
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(100, 100);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.strictEqual(result, null);
    });
  });

  suite('Function Text Extraction', () => {
    test('should extract full function text', async () => {
      const code = `function testFunction() {
  const x = 1;
  return x;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.ok(result?.fullText.includes('function testFunction'));
      assert.ok(result?.fullText.includes('const x = 1'));
      assert.ok(result?.fullText.includes('return x'));
    });

    test('should include function signature in full text', async () => {
      const code = `const arrow = (param: string) => {
  return param;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.ok(result?.fullText.includes('const arrow'));
      assert.ok(result?.fullText.includes('(param: string)'));
    });
  });

  suite('Integration Tests', () => {
    test('should complete full workflow for complex file', async () => {
      const code = `import { Component } from 'react';

// Utility function
function utilityFunction() {
  return true;
}

export class MyComponent extends Component {
  render() {
    return <div>Hello</div>;
  }
}

const useHook = () => {
  const [state, setState] = useState(0);
  return state;
};

export default MyComponent;`;

      const document = TestHelpers.createMockDocument(code, 'test.tsx');

      // Test utility function detection
      const utilityPos = new vscode.Position(4, 0);
      const utilityResult = await codeAnalysisService.findFunctionAtPosition(document, utilityPos);
      assert.ok(utilityResult);
      assert.strictEqual(utilityResult?.name, 'utilityFunction');

      // Test hook detection
      const hookPos = new vscode.Position(14, 0);
      const hookResult = await codeAnalysisService.findFunctionAtPosition(document, hookPos);
      assert.ok(hookResult);
      assert.strictEqual(hookResult?.name, 'useHook');

      // Test import extraction
      const imports = codeAnalysisService.extractImports(code, 'typescriptreact');
      assert.ok(imports.length > 0);
      assert.ok(imports.some(imp => imp.includes('Component')));
    });

    test('should handle real-world TypeScript code', async () => {
      const code = `interface User {
  id: number;
  name: string;
}

export async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  const data = await response.json();
  return data;
}

const useUser = (id: number) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUser(id).then(setUser);
  }, [id]);

  return user;
};`;

      const document = TestHelpers.createMockDocument(code, 'test.ts');

      // Test async function detection
      const fetchPos = new vscode.Position(6, 0);
      const fetchResult = await codeAnalysisService.findFunctionAtPosition(document, fetchPos);
      assert.ok(fetchResult);
      assert.strictEqual(fetchResult?.name, 'fetchUser');
      assert.strictEqual(fetchResult?.type, 'async');
      assert.strictEqual(fetchResult?.isExported, true);

      // Test hook detection
      const hookPos = new vscode.Position(13, 0);
      const hookResult = await codeAnalysisService.findFunctionAtPosition(document, hookPos);
      assert.ok(hookResult);
      assert.strictEqual(hookResult?.name, 'useUser');
    });
  });

  suite('Advanced Arrow Function Tests', () => {
    test('should find arrow function with multiple parameters', async () => {
      const code = `const multiParam = (a: number, b: string, c: boolean) => {
  return a + b + c;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'multiParam');
      assert.strictEqual(result?.type, 'arrow');
    });

    test('should find arrow function with default parameters', async () => {
      const code = `const withDefaults = (x = 10, y = 20) => {
  return x + y;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'withDefaults');
      assert.strictEqual(result?.type, 'arrow');
    });

    test('should find arrow function with destructured object parameter', async () => {
      const code = `const withDestructuring = ({ name, age }) => {
  return name + age;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'withDestructuring');
      assert.strictEqual(result?.type, 'arrow');
    });

    test('should find arrow function with rest parameter', async () => {
      const code = `const withRest = (...args: number[]) => {
  return args.reduce((sum, n) => sum + n, 0);
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'withRest');
      assert.strictEqual(result?.type, 'arrow');
    });

    test('should find typed arrow function', async () => {
      const code = `const typed: (x: number) => string = (x) => {
  return x.toString();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'typed');
      assert.strictEqual(result?.type, 'arrow');
    });

    test('should find async arrow with error handling', async () => {
      const code = `const fetchWithErrorHandling = async (url: string) => {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    console.error(err);
    throw err;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'fetchWithErrorHandling');
      assert.strictEqual(result?.type, 'async');
    });
  });

  suite('Advanced Function Declaration Tests', () => {
    test('should find function with multiple parameters', async () => {
      const code = `function multiParam(a: string, b: number, c: boolean): void {
  console.log(a, b, c);
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'multiParam');
      assert.strictEqual(result?.type, 'function');
    });

    test('should find function with default parameters', async () => {
      const code = `function withDefaults(x = 5, y = 'test') {
  return x + y;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'withDefaults');
      assert.strictEqual(result?.type, 'function');
    });

    test('should find function with return type annotation', async () => {
      const code = `function typedReturn(): number {
  return 42;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'typedReturn');
      assert.strictEqual(result?.type, 'function');
    });

    test('should find function with rest parameter', async () => {
      const code = `function sumAll(...numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0);
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'sumAll');
      assert.strictEqual(result?.type, 'function');
    });

    test('should find function with destructured parameter', async () => {
      const code = `function destructured({ name, age }: { name: string; age: number }) {
  return name + age;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'destructured');
      assert.strictEqual(result?.type, 'function');
    });

    test('should find generator function', async () => {
      const code = `function* generateNumbers() {
  let i = 0;
  while (i < 3) {
    yield i++;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'generateNumbers');
      assert.strictEqual(result?.type, 'function');
    });
  });

  suite('Advanced Class Method Tests', () => {
    test('should find static method', async () => {
      const code = `class TestClass {
  static staticMethod() {
    return 'static';
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'staticMethod');
      assert.strictEqual(result?.type, 'method');
    });

    test('should find getter', async () => {
      const code = `class TestClass {
  private _value = 0;

  get value() {
    return this._value;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(4, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'value');
      assert.strictEqual(result?.type, 'method');
    });

    test('should find setter', async () => {
      const code = `class TestClass {
  private _value = 0;

  set value(val: number) {
    this._value = val;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(4, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'value');
      assert.strictEqual(result?.type, 'method');
    });

    test('should find private method', async () => {
      const code = `class TestClass {
  private privateMethod() {
    return true;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'privateMethod');
      assert.strictEqual(result?.type, 'method');
    });

    test('should find method with parameter properties', async () => {
      const code = `class TestClass {
  constructor(public name: string, private age: number) {}
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'constructor');
    });

    test('should find method with complex parameters', async () => {
      const code = `class TestClass {
  complexMethod(name: string, age: number, active = true): string {
    return name + age + active;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'complexMethod');
      assert.strictEqual(result?.type, 'method');
    });

    test('should find async static method', async () => {
      const code = `class TestClass {
  static async asyncStatic() {
    await Promise.resolve();
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'asyncStatic');
      assert.strictEqual(result?.type, 'async');
    });
  });

  suite('Advanced React Component Tests', () => {
    test('should find component with props interface', async () => {
      const code = `interface Props {
  title: string;
}

const TitleComponent = ({ title }: Props) => {
  return <div>{title}</div>;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(4, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'TitleComponent');
      assert.strictEqual(result?.type, 'component');
    });

    test('should find component with multiple hooks', async () => {
      const code = `import { useState, useEffect, useMemo } from 'react';

const ComplexComponent = () => {
  const [count, setCount] = useState(0);
  const doubled = useMemo(() => count * 2, [count]);

  useEffect(() => {
    console.log(count);
  }, [count]);

  return <div>{doubled}</div>;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(2, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'ComplexComponent');
      assert.strictEqual(result?.type, 'component');
    });

    test('should find async component', async () => {
      const code = `const AsyncComponent = async () => {
  const data = await fetchData();
  return <div>{data}</div>;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'AsyncComponent');
      assert.strictEqual(result?.type, 'async');
    });

    test('should find exported default component', async () => {
      const code = `export default function DefaultExport() {
  return <div>Default</div>;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'DefaultExport');
      assert.strictEqual(result?.isExported, true);
    });
  });

  suite('Async Function Variations', () => {
    test('should find async function with multiple awaits', async () => {
      const code = `async function multipleAwait() {
  const a = await Promise.resolve(1);
  const b = await Promise.resolve(2);
  return a + b;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'multipleAwait');
      assert.strictEqual(result?.type, 'async');
    });

    test('should find async function with promise return type', async () => {
      const code = `async function withPromiseReturn(): Promise<number> {
  return 42;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'withPromiseReturn');
      assert.strictEqual(result?.type, 'async');
    });

    test('should find async function with callback', async () => {
      const code = `async function withCallback(cb: () => void) {
  await Promise.resolve();
  cb();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'withCallback');
      assert.strictEqual(result?.type, 'async');
    });

    test('should find async arrow with try-catch-finally', async () => {
      const code = `const robustAsync = async () => {
  try {
    return await riskyOperation();
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    cleanup();
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'robustAsync');
      assert.strictEqual(result?.type, 'async');
    });
  });

  suite('Advanced Edge Cases - Nested Braces', () => {
    test('should handle deeply nested functions (5 levels)', async () => {
      const code = `function level1() {
  function level2() {
    function level3() {
      function level4() {
        function level5() {
          return 'deepest';
        }
        return level5();
      }
      return level4();
    }
    return level3();
  }
  return level2();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const level5Pos = new vscode.Position(5, 0);
      const level1Pos = new vscode.Position(1, 0);

      const level5Result = await codeAnalysisService.findFunctionAtPosition(document, level5Pos);
      const level1Result = await codeAnalysisService.findFunctionAtPosition(document, level1Pos);

      assert.ok(level5Result);
      assert.strictEqual(level5Result?.name, 'level5');
      assert.strictEqual(level5Result?.endLine, 7);

      assert.ok(level1Result);
      assert.strictEqual(level1Result?.name, 'level1');
      assert.strictEqual(level1Result?.endLine, 17);
    });

    test('should handle nested object literals with braces', async () => {
      const code = `function complexObject() {
  const config = {
    database: {
      host: 'localhost',
      port: 5432,
      credentials: {
        username: 'user',
        password: 'pass'
      }
    },
    server: {
      endpoints: {
        api: '/api/v1',
        admin: '/admin'
      }
    }
  };
  return config;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'complexObject');
      assert.strictEqual(result?.endLine, 21);
    });

    test('should handle nested arrays with object literals', async () => {
      const code = `function nestedArrays() {
  const data = [
    {
      id: 1,
      items: [
        { name: 'item1', value: 10 },
        { name: 'item2', value: 20 }
      ]
    },
    {
      id: 2,
      items: [
        { name: 'item3', value: 30 }
      ]
    }
  ];
  return data;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'nestedArrays');
      assert.strictEqual(result?.endLine, 21);
    });

    test('should handle nested try-catch-finally blocks', async () => {
      const code = `async function nestedErrorHandling() {
  try {
    try {
      await riskyOperation1();
    } catch (err1) {
      throw new Error('Wrapped 1');
    }
  } catch (err2) {
    try {
      await riskyOperation2();
    } catch (err3) {
      throw new Error('Wrapped 2');
    }
  } finally {
    cleanup();
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'nestedErrorHandling');
      assert.strictEqual(result?.endLine, 19);
    });

    test('should handle nested switch statements with braces', async () => {
      const code = `function nestedSwitches(value: number) {
  switch (value) {
    case 1:
      switch (value) {
        case 1:
          return '1-1';
        case 2:
          return '1-2';
      }
      break;
    case 2:
      switch (value) {
        case 1:
          return '2-1';
        default:
          return '2-default';
      }
  }
  return 'unknown';
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'nestedSwitches');
      assert.strictEqual(result?.endLine, 23);
    });

    test('should handle nested class with methods', async () => {
      const code = `function outerFunction() {
  class InnerClass {
    method1() {
      if (true) {
        return 'method1';
      }
    }

    method2() {
      try {
        return 'method2';
      } catch (e) {
        return 'error';
      }
    }
  }

  return new InnerClass();
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'outerFunction');
      assert.strictEqual(result?.endLine, 23);
    });
  });

  suite('Advanced Edge Cases - Braces in Strings', () => {
    test('should handle braces in single quoted strings', async () => {
      const code = `function singleQuoteBraces() {
  const str1 = 'This has { braces } in it';
  const str2 = 'Nested {{ braces }}';
  const str3 = 'Unbalanced { braces';
  const str4 = 'Unbalanced braces }';
  return str1;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'singleQuoteBraces');
      assert.strictEqual(result?.endLine, 7);
    });

    test('should handle braces in double quoted strings', async () => {
      const code = `function doubleQuoteBraces() {
  const str1 = "This has { braces } in it";
  const str2 = "Nested {{ braces }}";
  const json = "{\"key\": \"value\", \"nested\": {\"a\": 1}}";
  return str1;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'doubleQuoteBraces');
      assert.strictEqual(result?.endLine, 6);
    });

    test('should handle braces in template literals', async () => {
      const code = `function templateLiteralBraces() {
  const value = 42;
  const tpl1 = \`Result: {value}\`;
  const tpl2 = \`Nested \{\{ braces \}\}\`;
  const tpl3 = \`Expression \${value} with { braces }\`;
  const tpl4 = \`Complex \${(() => {
    return '{ nested }';
  })()}\`;
  return tpl1;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'templateLiteralBraces');
      assert.strictEqual(result?.endLine, 10);
    });

    test('should handle escaped quotes with braces', async () => {
      const code = `function escapedQuotesWithBraces() {
  const str1 = 'don\\'t { count } this';
  const str2 = "say \\"hello { world }\\"";
  const str3 = \`template with { braces }\`;
  return str1;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'escapedQuotesWithBraces');
      assert.strictEqual(result?.endLine, 6);
    });

    test('should handle mixed quote types with braces', async () => {
      const code = `function mixedQuotesWithBraces() {
  const single = '{ single }';
  const double = "{ double }";
  const template = \`{ template }\`;
  const mixed = "mix 'single' { and } \"double\"";
  return mixed;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'mixedQuotesWithBraces');
      assert.strictEqual(result?.endLine, 7);
    });

    test('should handle regex literals with braces', async () => {
      const code = `function regexWithBraces() {
  const regex1 = /\{.*\}/g;
  const regex2 = /\{\{d+\}\}/;
  const regex3 = new RegExp('{.*}', 'g');
  return regex1;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'regexWithBraces');
      assert.strictEqual(result?.endLine, 6);
    });
  });

  suite('Advanced Edge Cases - Braces in Comments', () => {
    test('should handle braces in single-line comments', async () => {
      const code = `function singleLineCommentBraces() {
  // This is a comment with { braces }
  const x = 1; // Comment { with } braces
  // Multiple { { { nested } } }
  return x; // End comment
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'singleLineCommentBraces');
      assert.strictEqual(result?.endLine, 6);
    });

    test('should handle braces in multi-line comments', async () => {
      const code = `function multiLineCommentBraces() {
  /*
   * Multi-line comment with { braces }
   * Nested { { { } } }
   * More { complex } structures
   */
  const x = 1;
  /* Another { comment } with { braces } */
  return x;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'multiLineCommentBraces');
      assert.strictEqual(result?.endLine, 11);
    });

    test('should handle comments inside nested structures', async () => {
      const code = `function commentsInNestedStructures() {
  if (true) {
    // Comment { with } braces
    const obj = {
      // Another { comment }
      key: 'value',
      nested: {
        // Deep { comment }
        value: 42
      }
    };
    return obj;
  }
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'commentsInNestedStructures');
      assert.strictEqual(result?.endLine, 15);
    });

    test('should handle trailing comments with braces', async () => {
      const code = `function trailingComments() {
  const obj = { key: 'value' }; // Comment { with } braces
  const arr = [1, 2, 3]; // Array { comment }
  return obj; /* End { comment } */
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'trailingComments');
      assert.strictEqual(result?.endLine, 5);
    });

    test('should handle comment-like strings', async () => {
      const code = `function commentLikeStrings() {
  const str1 = 'This is // not a comment { with } braces';
  const str2 = "This is /* not */ a comment";
  const str3 = \`Not // a comment \${'or /* this */'} { either }\`;
  return str1;
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'commentLikeStrings');
      assert.strictEqual(result?.endLine, 6);
    });
  });

  suite('Advanced Edge Cases - Complex Scenarios', () => {
    test('should handle real-world complex function', async () => {
      const code = `async function fetchDataAndProcess(config: { url: string; options: {} }) {
    // Configuration with nested braces
    const requestConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${config.apiKey}\`
      },
      body: JSON.stringify({
        query: '{ users { id name } }', // GraphQL query
        variables: { limit: 10 }
      })
    };

    try {
      const response = await fetch(config.url, requestConfig);

      if (!response.ok) {
        // Error handling with comment { braces }
        throw new Error(\`HTTP { \${response.status} }\`);
      }

      // Process response
      const data = await response.json();
      const items = data.items.map((item: { id: number }) => ({
        ...item,
        processed: true
      }));

      /* Return processed items
       * with multi-line { comment }
       * containing { braces }
       */
      return items;
    } catch (error) {
      console.error('Error { in } processing:', error);
      throw error;
    }
  }`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'fetchDataAndProcess');
      assert.strictEqual(result?.endLine, 50);
    });

    test('should handle JSX with braces and strings', async () => {
      const code = `function JSXComponent() {
  const items = ['{ item1 }', '{ item2 }'];

  return (
    <div className="container { class }">
      {/* Comment { with } braces */}
      {items.map(item => (
        <span key={item}>
          {item} {/* Inline { comment } */}
        </span>
      ))}
    </div>
  );
}`;
      const document = TestHelpers.createMockDocument(code, 'test.tsx');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'JSXComponent');
      assert.strictEqual(result?.endLine, 16);
    });

    test('should handle function with all edge cases combined', async () => {
      const code = `function allEdgeCases() {
  // Single-line { comment }
  /* Multi-line
     { comment } with braces */

  const strings = {
    single: '{ single }',
    double: "{ double }",
    template: \`{ template }\`,
    mixed: "mix 'single' and \"double\" { braces }"
  };

  const nested = {
    level1: {
      level2: {
        level3: {
          value: 'deep'
        }
      }
    }
  };

  /* Comment before array */ const arr = [
    { id: 1, name: 'Item {1}' },
    { id: 2, data: { nested: '{ value }' } }
  ];

  return { strings, nested, arr };
}`;
      const document = TestHelpers.createMockDocument(code, 'test.ts');
      const position = new vscode.Position(1, 0);

      const result = await codeAnalysisService.findFunctionAtPosition(document, position);

      assert.ok(result);
      assert.strictEqual(result?.name, 'allEdgeCases');
      assert.strictEqual(result?.endLine, 33);
    });
  });
});
