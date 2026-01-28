import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

export interface NestJSGuardConfig {
  enabled: boolean;
  generateJwtStrategy: boolean;
  generateRolesGuard: boolean;
  generatePermissionsGuard: boolean;
  generateGlobalGuard: boolean;
  generateDecorators: boolean;
  defaultGuardName: string;
  guardDirectory: string;
}

export interface GuardDecorator {
  name: string;
  code: string;
  description: string;
}

export interface GeneratedGuard {
  name: string;
  guardType: 'jwt' | 'roles' | 'permissions' | 'custom';
  guardCode: string;
  decorators: GuardDecorator[];
  imports: string[];
}

export interface GuardGenerationResult {
  guards: GeneratedGuard[];
  strategyCode?: string;
  authModuleCode?: string;
  files: Array<{ name: string; code: string }>;
}

/**
 * Service for generating NestJS guards with JWT validation,
 * role-based access control, and custom permission logic
 */
export class NestJSGuardGeneratorService {
  private static instance: NestJSGuardGeneratorService | undefined;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): NestJSGuardGeneratorService {
    NestJSGuardGeneratorService.instance ??= new NestJSGuardGeneratorService();
    return NestJSGuardGeneratorService.instance;
  }

  /**
   * Generates guards based on user selection
   */
  public async generateGuard(
    workspacePath: string,
    config: NestJSGuardConfig,
  ): Promise<GuardGenerationResult | null> {
    // Ask user which guards to generate
    const guardTypes = await this.selectGuardTypes();
    if (!guardTypes || guardTypes.length === 0) {
      return null;
    }

    const result: GuardGenerationResult = {
      guards: [],
      files: [],
    };

    // Get guard name
    const guardName = await this.getGuardName(config);
    if (!guardName) {
      return null;
    }

    // Generate JWT strategy if needed
    if (guardTypes.includes('jwt') && config.generateJwtStrategy) {
      const strategyCode = this.generateJwtStrategy(guardName, config);
      result.strategyCode = strategyCode;
      result.files.push({ name: `${guardName}.strategy.ts`, code: strategyCode });
    }

    // Generate JWT Guard
    if (guardTypes.includes('jwt')) {
      const jwtGuard = this.generateJwtGuardCode(guardName, config);
      result.guards.push(jwtGuard);
      result.files.push({ name: `${guardName}.guard.ts`, code: jwtGuard.guardCode });
    }

    // Generate Roles Guard
    if (guardTypes.includes('roles')) {
      const rolesGuard = this.generateRolesGuardCode(config);
      result.guards.push(rolesGuard);
      result.files.push({ name: 'roles.guard.ts', code: rolesGuard.guardCode });

      if (config.generateDecorators) {
        const rolesDecorator = this.generateRolesDecorator();
        result.files.push({ name: 'roles.decorator.ts', code: rolesDecorator });
      }
    }

    // Generate Permissions Guard
    if (guardTypes.includes('permissions')) {
      const permissionsGuard = this.generatePermissionsGuardCode(config);
      result.guards.push(permissionsGuard);
      result.files.push({ name: 'permissions.guard.ts', code: permissionsGuard.guardCode });

      if (config.generateDecorators) {
        const permissionsDecorator = this.generatePermissionsDecorator();
        const requirePermissionsDecorator = this.generateRequirePermissionsDecorator();
        result.files.push({ name: 'permissions.decorator.ts', code: permissionsDecorator });
        result.files.push({
          name: 'require-permissions.decorator.ts',
          code: requirePermissionsDecorator,
        });
      }
    }

    // Generate Global Guard configuration
    if (config.generateGlobalGuard && guardTypes.includes('jwt')) {
      const authModuleCode = this.generateAuthModuleCode(guardName, config);
      result.authModuleCode = authModuleCode;
      result.files.push({ name: 'auth.module.ts', code: authModuleCode });
    }

    // Generate user interface if needed
    const userInterface = this.generateUserInterface();
    result.files.push({ name: 'interfaces/user.interface.ts', code: userInterface });

    this.logger.info('NestJS guards generated', {
      guardName,
      guardTypes,
      totalFiles: result.files.length,
    });

    return result;
  }

  /**
   * Prompts user to select which guard types to generate
   */
  private async selectGuardTypes(): Promise<('jwt' | 'roles' | 'permissions')[] | null> {
    const selected = await vscode.window.showQuickPick(
      [
        { label: 'JWT Authentication Guard', value: 'jwt', picked: true },
        { label: 'Roles Guard', value: 'roles', picked: true },
        { label: 'Permissions Guard', value: 'permissions', picked: false },
      ],
      {
        placeHolder: 'Select which guards to generate',
        canPickMany: true,
      },
    );

    return selected ? (selected.map((s) => s.value) as ('jwt' | 'roles' | 'permissions')[]) : null;
  }

  /**
   * Prompts user for guard name
   */
  private async getGuardName(config: NestJSGuardConfig): Promise<string | undefined> {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter guard name (e.g., Jwt, Auth)',
      placeHolder: config.defaultGuardName,
      value: config.defaultGuardName,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Guard name cannot be empty';
        }
        if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          return 'Guard name must start with uppercase letter and contain only letters and numbers';
        }
        return null;
      },
    });
    return input?.trim();
  }

  /**
   * Generates JWT strategy code
   */
  private generateJwtStrategy(guardName: string, config: NestJSGuardConfig): string {
    let code = `import { Injectable, UnauthorizedException } from '@nestjs/common';\n`;
    code += `import { PassportStrategy } from '@nestjs/passport';\n`;
    code += `import { ExtractJwt, Strategy } from 'passport-jwt';\n`;
    code += `import { ConfigService } from '@nestjs/config';\n`;
    code += `import { UserService } from '../user/user.service';\n`;
    code += `import { User } from './interfaces/user.interface';\n\n`;

    code += `@Injectable()\n`;
    code += `export class ${guardName}Strategy extends PassportStrategy(Strategy) {\n`;
    code += `  constructor(\n`;
    code += `    private configService: ConfigService,\n`;
    code += `    private userService: UserService,\n`;
    code += `  ) {\n`;
    code += `    super({\n`;
    code += `      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),\n`;
    code += `      ignoreExpiration: false,\n`;
    code += `      secretOrKey: configService.get<string>('JWT_SECRET'),\n`;
    code += `    });\n`;
    code += `  }\n\n`;

    code += `  async validate(payload: { sub: string; email: string }): Promise<User> {\n`;
    code += `    const user = await this.userService.findById(payload.sub);\n`;
    code += `    if (!user) {\n`;
    code += `      throw new UnauthorizedException();\n`;
    code += `    }\n`;
    code += `    return user;\n`;
    code += `  }\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates JWT guard code
   */
  private generateJwtGuardCode(guardName: string, config: NestJSGuardConfig): GeneratedGuard {
    let code = `import { Injectable } from '@nestjs/common';\n`;
    code += `import { AuthGuard } from '@nestjs/passport';\n\n`;

    code += `@Injectable()\n`;
    code += `export class ${guardName}Guard extends AuthGuard('${this.camelCase(guardName)}') {}\n`;

    return {
      name: guardName,
      guardType: 'jwt',
      guardCode: code,
      decorators: [],
      imports: ['@nestjs/common', '@nestjs/passport'],
    };
  }

  /**
   * Generates roles guard code
   */
  private generateRolesGuardCode(config: NestJSGuardConfig): GeneratedGuard {
    let code = `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';\n`;
    code += `import { Reflector } from '@nestjs/core';\n\n`;

    code += `@Injectable()\n`;
    code += `export class RolesGuard implements CanActivate {\n`;
    code += `  constructor(private reflector: Reflector) {}\n\n`;

    code += `  canActivate(context: ExecutionContext): boolean {\n`;
    code += `    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [\n`;
    code += `      context.getHandler(),\n`;
    code += `      context.getClass(),\n`;
    code += `    ]);\n\n`;

    code += `    if (!requiredRoles) {\n`;
    code += `      return true;\n`;
    code += `    }\n\n`;

    code += `    const { user } = context.switchToHttp().getRequest();\n`;
    code += `    return requiredRoles.some((role) => user.roles?.includes(role));\n`;
    code += `  }\n`;
    code += `}\n`;

    return {
      name: 'Roles',
      guardType: 'roles',
      guardCode: code,
      decorators: [],
      imports: ['@nestjs/common', '@nestjs/core'],
    };
  }

  /**
   * Generates permissions guard code
   */
  private generatePermissionsGuardCode(config: NestJSGuardConfig): GeneratedGuard {
    let code = `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';\n`;
    code += `import { Reflector } from '@nestjs/core';\n`;
    code += `import { UserPermission } from './interfaces/user.interface';\n\n`;

    code += `@Injectable()\n`;
    code += `export class PermissionsGuard implements CanActivate {\n`;
    code += `  constructor(private reflector: Reflector) {}\n\n`;

    code += `  canActivate(context: ExecutionContext): boolean {\n`;
    code += `    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(\n`;
    code += `      'permissions',\n`;
    code += `      [context.getHandler(), context.getClass()],\n`;
    code += `    );\n\n`;

    code += `    if (!requiredPermissions) {\n`;
    code += `      return true;\n`;
    code += `    }\n\n`;

    code += `    const { user } = context.switchToHttp().getRequest();\n`;
    code += `    return this.hasPermission(user.permissions, requiredPermissions);\n`;
    code += `  }\n\n`;

    code += `  private hasPermission(\n`;
    code += `    userPermissions: UserPermission[],\n`;
    code += `    requiredPermissions: string[],\n`;
    code += `  ): boolean {\n`;
    code += `    if (!userPermissions) {\n`;
    code += `      return false;\n`;
    code += `    }\n\n`;

    code += `    return requiredPermissions.every((required) =>\n`;
    code += `      userPermissions.some(\n`;
    code += `        (permission) =>\n`;
    code += `          permission.resource === required.split(':')[0] &&\n`;
    code += `          permission.actions.includes(required.split(':')[1]),\n`;
    code += `      ),\n`;
    code += `    );\n`;
    code += `  }\n`;
    code += `}\n`;

    return {
      name: 'Permissions',
      guardType: 'permissions',
      guardCode: code,
      decorators: [],
      imports: ['@nestjs/common', '@nestjs/core'],
    };
  }

  /**
   * Generates roles decorator
   */
  private generateRolesDecorator(): string {
    let code = `import { SetMetadata } from '@nestjs/common';\n\n`;

    code += `export const Roles = (...roles: string[]) => SetMetadata('roles', roles);\n`;

    return code;
  }

  /**
   * Generates permissions decorator
   */
  private generatePermissionsDecorator(): string {
    let code = `import { SetMetadata } from '@nestjs/common';\n\n`;

    code += `export const Permissions = (...permissions: string[]) =>\n`;
    code += `  SetMetadata('permissions', permissions);\n`;

    return code;
  }

  /**
   * Generates require permissions decorator
   */
  private generateRequirePermissionsDecorator(): string {
    let code = `import { SetMetadata } from '@nestjs/common';\n\n`;

    code += `export const RequirePermissions = (\n`;
    code += `  resource: string,\n`;
    code += `  ...actions: string[]\n`;
    code += `) => {\n`;
    code += `  const permissions = actions.map((action) => \`\${resource}:\${action}\`);\n`;
    code += `  return SetMetadata('permissions', permissions);\n`;
    code += `};\n`;

    return code;
  }

  /**
   * Generates user interface
   */
  private generateUserInterface(): string {
    let code = `export interface UserPermission {\n`;
    code += `  resource: string;\n`;
    code += `  actions: string[];\n`;
    code += `}\n\n`;

    code += `export interface User {\n`;
    code += `  id: string;\n`;
    code += `  email: string;\n`;
    code += `  roles?: string[];\n`;
    code += `  permissions?: UserPermission[];\n`;
    code += `}\n`;

    return code;
  }

  /**
   * Generates auth module code for global guard setup
   */
  private generateAuthModuleCode(guardName: string, config: NestJSGuardConfig): string {
    let code = `import { Module } from '@nestjs/common';\n`;
    code += `import { JwtModule } from '@nestjs/jwt';\n`;
    code += `import { PassportModule } from '@nestjs/passport';\n`;
    code += `import { ConfigModule, ConfigService } from '@nestjs/config';\n`;
    code += `import { ${guardName}Strategy } from './${this.kebabCase(guardName)}.strategy';\n`;
    code += `import { ${guardName}Guard } from './${this.kebabCase(guardName)}.guard';\n`;
    code += `import { UserService } from '../user/user.service';\n\n`;

    code += `@Module({\n`;
    code += `  imports: [\n`;
    code += `    PassportModule,\n`;
    code += `    JwtModule.registerAsync({\n`;
    code += `      imports: [ConfigModule],\n`;
    code += `      useFactory: async (configService: ConfigService) => ({\n`;
    code += `        secret: configService.get<string>('JWT_SECRET'),\n`;
    code += `        signOptions: {\n`;
    code += `          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d'),\n`;
    code += `        },\n`;
    code += `      }),\n`;
    code += `      inject: [ConfigService],\n`;
    code += `    }),\n`;
    code += `  ],\n`;
    code += `  providers: [${guardName}Strategy, ${guardName}Guard],\n`;
    code += `  exports: [${guardName}Strategy, ${guardName}Guard],\n`;
    code += `})\n`;
    code += `export class AuthModule {}\n`;

    return code;
  }

  /**
   * Creates guard files at the specified path
   */
  public async createGuardFiles(
    workspacePath: string,
    guardDirectory: string,
    result: GuardGenerationResult,
  ): Promise<string[]> {
    const createdFiles: string[] = [];
    const basePath = path.join(workspacePath, guardDirectory);

    // Create directory if it doesn't exist
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(basePath));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(basePath));
    }

    // Create interfaces directory
    const interfacesPath = path.join(basePath, 'interfaces');
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(interfacesPath));
    } catch {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(interfacesPath));
    }

    // Write each file
    for (const file of result.files) {
      const filePath = path.join(basePath, file.name);
      const uri = vscode.Uri.file(filePath);

      // Create nested directories if needed
      const directory = path.dirname(filePath);
      try {
        await vscode.workspace.fs.stat(vscode.Uri.file(directory));
      } catch {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory));
      }

      await vscode.workspace.fs.writeFile(uri, Buffer.from(file.code, 'utf-8'));
      createdFiles.push(filePath);
    }

    this.logger.info('Guard files created', {
      count: createdFiles.length,
      directory: basePath,
    });

    return createdFiles;
  }

  /**
   * Converts string to camelCase
   */
  private camelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Converts string to kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  /**
   * Escapes string for use in template literals
   */
  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'");
  }
}
