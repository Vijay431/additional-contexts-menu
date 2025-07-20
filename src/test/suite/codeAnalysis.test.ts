import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { CodeAnalysisService } from '../../services/codeAnalysisService';

suite('CodeAnalysisService Tests', () => {
  let codeAnalysisService: CodeAnalysisService;
  let tempDir: string;

  setup(async () => {
    codeAnalysisService = CodeAnalysisService.getInstance();
    tempDir = path.join(__dirname, '../temp-test-files');
    await fs.ensureDir(tempDir);
  });

  teardown(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  async function createTestDocument(
    fileName: string,
    content: string
  ): Promise<vscode.TextDocument> {
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, content);
    const uri = vscode.Uri.file(filePath);
    return await vscode.workspace.openTextDocument(uri);
  }

  test('Should detect React functional component', async () => {
    const content = `
import React from 'react';

export default function UserProfile({ userId }: { userId: number }) {
  return (
    <div className="user-profile">
      <h1>User Profile</h1>
    </div>
  );
}`;

    const document = await createTestDocument('test-component.tsx', content);
    const position = new vscode.Position(3, 10); // Inside function declaration

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'UserProfile');
    assert.strictEqual(functionInfo.type, 'component');
    assert.strictEqual(functionInfo.isExported, true);
    assert.ok(functionInfo.fullText.includes('function UserProfile'));
  });

  test('Should detect React arrow component', async () => {
    const content = `
import React from 'react';

export const UserCard = ({ user }: { user: User }) => {
  return (
    <div className="user-card">
      <span>{user.name}</span>
    </div>
  );
};`;

    const document = await createTestDocument('test-arrow.tsx', content);
    const position = new vscode.Position(3, 15); // Inside arrow function

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'UserCard');
    assert.strictEqual(functionInfo.type, 'component');
    assert.strictEqual(functionInfo.isExported, true);
  });

  test('Should detect React custom hook', async () => {
    const content = `
import { useState, useEffect } from 'react';

export const useUserData = (userId: number) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);

  return { user };
};`;

    const document = await createTestDocument('test-hook.tsx', content);
    const position = new vscode.Position(3, 20); // Inside hook function

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'useUserData');
    assert.strictEqual(functionInfo.type, 'hook');
    assert.strictEqual(functionInfo.isExported, true);
  });

  test('Should detect Express route handler', async () => {
    const content = `
import express from 'express';

router.get('/users', async (req, res) => {
  try {
    const users = await getUsersFromDatabase();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});`;

    const document = await createTestDocument('test-route.ts', content);
    const position = new vscode.Position(3, 25); // Inside route handler

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.type, 'async');
    assert.ok(functionInfo.fullText.includes('async (req, res)'));
  });

  test('Should detect Angular service method', async () => {
    const content = `
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }
}`;

    const document = await createTestDocument('test-service.ts', content);
    const position = new vscode.Position(7, 5); // Inside getUsers method

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'getUsers');
    assert.strictEqual(functionInfo.type, 'method');
    assert.strictEqual(functionInfo.isExported, false); // Method inside class
  });

  test('Should detect async function', async () => {
    const content = `
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}`;

    const document = await createTestDocument('test-async.ts', content);
    const position = new vscode.Position(1, 10); // Inside async function

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'fetchUser');
    assert.strictEqual(functionInfo.type, 'async');
    assert.strictEqual(functionInfo.isExported, false);
  });

  test('Should detect exported function', async () => {
    const content = `
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
}`;

    const document = await createTestDocument('test-export.ts', content);
    const position = new vscode.Position(1, 10); // Inside exported function

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'validateEmail');
    assert.strictEqual(functionInfo.type, 'function');
    assert.strictEqual(functionInfo.isExported, true);
  });

  test('Should return null when no function found', async () => {
    const content = `
const someVariable = 'hello world';
const anotherVariable = 42;
`;

    const document = await createTestDocument('test-no-function.ts', content);
    const position = new vscode.Position(1, 5); // Not inside any function

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.strictEqual(functionInfo, null);
  });

  test('Should extract imports from code', async () => {
    const content = `
import React, { useState, useEffect } from 'react';
import { User } from '../types/user';
import * as utils from '../utils';
`;

    const imports = codeAnalysisService.extractImports(content, 'typescript');

    assert.strictEqual(imports.length, 3);
    assert.ok(imports.some((imp) => imp.includes('import React')));
    assert.ok(imports.some((imp) => imp.includes('import { User }')));
    assert.ok(imports.some((imp) => imp.includes('import * as utils')));
  });

  test('Should handle malformed code gracefully', async () => {
    const content = `
this is not valid javascript code {[
function incomplete(
`;

    const document = await createTestDocument('test-malformed.ts', content);
    const position = new vscode.Position(1, 5);

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    // Should not throw error and return null
    assert.strictEqual(functionInfo, null);
  });

  test('Should detect function with decorators', async () => {
    const content = `
class TestClass {
  @Injectable()
  @Param('id')
  async getUser(id: string) {
    return await this.userService.findById(id);
  }
}`;

    const document = await createTestDocument('test-decorators.ts', content);
    const position = new vscode.Position(4, 10); // Inside decorated method

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'getUser');
    assert.strictEqual(functionInfo.type, 'method');
    assert.strictEqual(functionInfo.hasDecorators, true);
  });

  test('Should detect object method', async () => {
    const content = `
const userUtils = {
  formatName(user: User): string {
    return \`\${user.firstName} \${user.lastName}\`;
  },
  
  async fetchUserData(id: number) {
    const response = await fetch(\`/api/users/\${id}\`);
    return response.json();
  }
};`;

    const document = await createTestDocument('test-object-method.ts', content);
    const position = new vscode.Position(2, 10); // Inside formatName method

    const functionInfo = await codeAnalysisService.findFunctionAtPosition(document, position);

    assert.ok(functionInfo);
    assert.strictEqual(functionInfo.name, 'formatName');
    assert.strictEqual(functionInfo.type, 'method');
  });
});
