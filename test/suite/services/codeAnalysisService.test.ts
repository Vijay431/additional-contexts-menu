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
});
