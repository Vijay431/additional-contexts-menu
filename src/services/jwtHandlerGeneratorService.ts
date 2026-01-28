import * as vscode from 'vscode';

export interface JwtHandlerGenerationResult {
  code: string;
  explanation: string;
  language: string;
  framework: 'express' | 'fastify' | 'standalone';
}

/**
 * Service for generating JWT token handlers with signing, verification, and middleware
 */
export class JwtHandlerGeneratorService {
  private static instance: JwtHandlerGeneratorService | undefined;

  private constructor() {}

  public static getInstance(): JwtHandlerGeneratorService {
    JwtHandlerGeneratorService.instance ??= new JwtHandlerGeneratorService();
    return JwtHandlerGeneratorService.instance;
  }

  /**
   * Generate JWT handler code based on detected framework
   */
  async generate(): Promise<JwtHandlerGenerationResult> {
    const framework = this.detectFramework();

    let code: string;
    let explanation: string;

    if (framework === 'express') {
      code = this.generateExpressJwtHandler();
      explanation = this.getExpressExplanation();
    } else if (framework === 'fastify') {
      code = this.generateFastifyJwtHandler();
      explanation = this.getFastifyExplanation();
    } else {
      // Default to standalone JWT utilities
      code = this.generateStandaloneJwtHandler();
      explanation = this.getStandaloneExplanation();
    }

    return {
      code,
      explanation,
      language: 'typescript',
      framework,
    };
  }

  /**
   * Detect the framework being used (Express or Fastify)
   */
  private detectFramework(): 'express' | 'fastify' | 'standalone' {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return 'standalone';
    }

    const document = editor.document;
    const text = document.getText();

    // Check for Fastify
    if (
      text.includes('fastify') ||
      text.includes('@fastify/jwt') ||
      text.includes('fastify-jwt')
    ) {
      return 'fastify';
    }

    // Check for Express
    if (
      text.includes('express') ||
      text.includes('Router') ||
      text.includes('app.get') ||
      text.includes('app.post')
    ) {
      return 'express';
    }

    return 'standalone';
  }

  /**
   * Generate Express JWT handler with middleware
   */
  private generateExpressJwtHandler(): string {
    return `import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtHandler {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor(config: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
  }) {
    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.accessTokenExpiresIn = config.accessTokenExpiresIn || '15m';
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn || '7d';
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token only
   */
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    return this.generateAccessToken(payload);
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

// Express middleware factory
export const createAuthMiddleware = (jwtHandler: JwtHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const payload = jwtHandler.verifyAccessToken(token);

      // Attach user info to request
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const createOptionalAuthMiddleware = (jwtHandler: JwtHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = jwtHandler.verifyAccessToken(token);
        req.user = payload;
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  };
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Usage example:
/*
import express from 'express';
import { JwtHandler, createAuthMiddleware } from './jwtHandler';

const app = express();

// Initialize JWT handler
const jwtHandler = new JwtHandler({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
});

// Generate tokens
const tokens = jwtHandler.generateTokenPair({
  userId: '123',
  email: 'user@example.com',
  role: 'admin',
});

// Protected route
app.get('/protected', createAuthMiddleware(jwtHandler), (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});

// Refresh endpoint
app.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  try {
    const newAccessToken = jwtHandler.refreshAccessToken(refreshToken);
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
*/`;
  }

  /**
   * Generate Fastify JWT handler
   */
  private generateFastifyJwtHandler(): string {
    return `import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtHandler {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor(config: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
  }) {
    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.accessTokenExpiresIn = config.accessTokenExpiresIn || '15m';
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn || '7d';
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token only
   */
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    return this.generateAccessToken(payload);
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

// Fastify plugin for JWT authentication
export const jwtAuthPlugin = fp(
  async (fastify, options: { jwtHandler: JwtHandler }) => {
    fastify.decorateRequest('user', null);

    fastify.addHook('onRequest', async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
          return;
        }

        const token = authHeader.substring(7);
        const payload = options.jwtHandler.verifyAccessToken(token);
        request.user = payload;
      } catch (error) {
        // Let routes handle authentication failure
        reply.code(401).send({ error: 'Invalid or expired token' });
      }
    });
  },
  {
    name: 'jwt-auth',
  }
);

// Usage example:
/*
import Fastify from 'fastify';
import { JwtHandler, jwtAuthPlugin } from './jwtHandler';

const fastify = Fastify();

// Initialize JWT handler
const jwtHandler = new JwtHandler({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
});

// Register JWT plugin
await fastify.register(jwtAuthPlugin, { jwtHandler });

// Generate tokens
const tokens = jwtHandler.generateTokenPair({
  userId: '123',
  email: 'user@example.com',
  role: 'admin',
});

// Protected route
fastify.get('/protected', async (request, reply) => {
  return { message: 'Protected data', user: request.user };
});

// Refresh endpoint
fastify.post('/refresh', async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken: string };
  try {
    const newAccessToken = jwtHandler.refreshAccessToken(refreshToken);
    return { accessToken: newAccessToken };
  } catch (error) {
    reply.code(401);
    return { error: 'Invalid refresh token' };
  }
});
*/`;
  }

  /**
   * Generate standalone JWT utilities
   */
  private generateStandaloneJwtHandler(): string {
    return `import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class JwtHandler {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiresIn: string;
  private refreshTokenExpiresIn: string;

  constructor(config: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
  }) {
    this.accessTokenSecret = config.accessTokenSecret;
    this.refreshTokenSecret = config.refreshTokenSecret;
    this.accessTokenExpiresIn = config.accessTokenExpiresIn || '15m';
    this.refreshTokenExpiresIn = config.refreshTokenExpiresIn || '7d';
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(payload: JwtPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token only
   */
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    return this.generateAccessToken(payload);
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }
}

// Usage example:
/*
const jwtHandler = new JwtHandler({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
});

// Generate tokens
const tokens = jwtHandler.generateTokenPair({
  userId: '123',
  email: 'user@example.com',
  role: 'admin',
});

console.log('Access Token:', tokens.accessToken);
console.log('Refresh Token:', tokens.refreshToken);

// Verify token
try {
  const payload = jwtHandler.verifyAccessToken(tokens.accessToken);
  console.log('Verified payload:', payload);
} catch (error) {
  console.error('Invalid token:', error);
}

// Refresh token
const newAccessToken = jwtHandler.refreshAccessToken(tokens.refreshToken);
console.log('New Access Token:', newAccessToken);
*/`;
  }

  /**
   * Get explanation for Express implementation
   */
  private getExpressExplanation(): string {
    return `# Express JWT Handler

This implementation provides a complete JWT authentication solution for Express applications.

## Features

- **Token Generation**: Create access tokens (short-lived) and refresh tokens (long-lived)
- **Token Verification**: Validate tokens with proper error handling
- **Token Refresh**: Generate new access tokens using refresh tokens
- **Express Middleware**: Ready-to-use authentication middleware
- **Optional Auth**: Middleware that doesn't fail if no token is provided

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install jsonwebtoken
   npm install --save-dev @types/jsonwebtoken
   \`\`\`

2. Set environment variables:
   \`\`\`
   JWT_ACCESS_SECRET=your-super-secret-access-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   \`\`\`

3. Initialize and use:
   \`\`\`typescript
   const jwtHandler = new JwtHandler({
     accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
     refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
   });

   app.get('/protected', createAuthMiddleware(jwtHandler), (req, res) => {
     res.json({ user: req.user });
   });
   \`\`\`

## Security Notes

- Use strong, random secrets for production (at least 32 characters)
- Store refresh tokens securely (httpOnly cookies or secure storage)
- Access tokens expire in 15 minutes by default
- Refresh tokens expire in 7 days by default`;
  }

  /**
   * Get explanation for Fastify implementation
   */
  private getFastifyExplanation(): string {
    return `# Fastify JWT Handler

This implementation provides a complete JWT authentication solution for Fastify applications.

## Features

- **Token Generation**: Create access tokens (short-lived) and refresh tokens (long-lived)
- **Token Verification**: Validate tokens with proper error handling
- **Token Refresh**: Generate new access tokens using refresh tokens
- **Fastify Plugin**: Integrated authentication plugin
- **Request Decoration**: User payload attached to request object

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install jsonwebtoken fastify-plugin
   npm install --save-dev @types/jsonwebtoken
   \`\`\`

2. Set environment variables:
   \`\`\`
   JWT_ACCESS_SECRET=your-super-secret-access-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   \`\`\`

3. Initialize and use:
   \`\`\`typescript
   const jwtHandler = new JwtHandler({
     accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
     refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
   });

   await fastify.register(jwtAuthPlugin, { jwtHandler });

   fastify.get('/protected', async (request, reply) => {
     return { user: request.user };
   });
   \`\`\`

## Security Notes

- Use strong, random secrets for production (at least 32 characters)
- Store refresh tokens securely (httpOnly cookies or secure storage)
- Access tokens expire in 15 minutes by default
- Refresh tokens expire in 7 days by default`;
  }

  /**
   * Get explanation for standalone implementation
   */
  private getStandaloneExplanation(): string {
    return `# JWT Handler (Standalone)

This implementation provides JWT token utilities that can be used with any framework or no framework at all.

## Features

- **Token Generation**: Create access tokens (short-lived) and refresh tokens (long-lived)
- **Token Verification**: Validate tokens with proper error handling
- **Token Refresh**: Generate new access tokens using refresh tokens
- **Framework Agnostic**: Works with any HTTP framework or standalone

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install jsonwebtoken
   npm install --save-dev @types/jsonwebtoken
   \`\`\`

2. Set environment variables:
   \`\`\`
   JWT_ACCESS_SECRET=your-super-secret-access-key
   JWT_REFRESH_SECRET=your-super-secret-refresh-key
   \`\`\`

3. Initialize and use:
   \`\`\`typescript
   const jwtHandler = new JwtHandler({
     accessTokenSecret: process.env.JWT_ACCESS_SECRET!,
     refreshTokenSecret: process.env.JWT_REFRESH_SECRET!,
   });

   const tokens = jwtHandler.generateTokenPair({
     userId: 'user-123',
     email: 'user@example.com',
   });
   \`\`\`

## Security Notes

- Use strong, random secrets for production (at least 32 characters)
- Store refresh tokens securely (httpOnly cookies or secure storage)
- Access tokens expire in 15 minutes by default
- Refresh tokens expire in 7 days by default`;
  }
}
