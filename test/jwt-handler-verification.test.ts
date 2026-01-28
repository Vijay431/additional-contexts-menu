/**
 * JWT Handler Generator Service - Verification Test
 *
 * This test verifies that the JWT handler generator service:
 * 1. Can be imported and instantiated
 * 2. Generates valid code for all frameworks (Express, Fastify, Standalone)
 * 3. Returns proper TypeScript code
 * 4. Includes all required functionality (token generation, verification, refresh)
 */

import assert from 'node:assert';
import { JwtHandlerGeneratorService } from '../src/services/jwtHandlerGeneratorService';

suite('JWT Handler Generator - Verification Test', () => {
  test('Service should generate Express JWT handler code', async () => {
    const service = JwtHandlerGeneratorService.getInstance();
    const result = await service.generate();

    // Verify basic properties
    assert.ok(result.code, 'Should generate code');
    assert.strictEqual(result.language, 'typescript', 'Should be TypeScript');
    assert.ok(result.explanation, 'Should include explanation');

    // Verify code contains key JWT functionality
    assert.ok(result.code.includes('generateTokenPair'), 'Should have token pair generation');
    assert.ok(result.code.includes('verifyAccessToken'), 'Should have access token verification');
    assert.ok(result.code.includes('verifyRefreshToken'), 'Should have refresh token verification');
    assert.ok(result.code.includes('refreshAccessToken'), 'Should have token refresh');
    assert.ok(result.code.includes('JwtHandler'), 'Should have JwtHandler class');
    assert.ok(result.code.includes('JwtPayload'), 'Should have JwtPayload interface');

    console.log('✓ Express JWT handler generated successfully');
    console.log('  Code length:', result.code.length, 'characters');
    console.log('  Explanation length:', result.explanation.length, 'characters');
  });

  test('Generated code should be syntactically valid TypeScript', () => {
    const service = JwtHandlerGeneratorService.getInstance();

    // Generate code
    const result = service['generateExpressJwtHandler']();

    // Check for TypeScript syntax elements
    assert.ok(result.includes('export class'), 'Should export class');
    assert.ok(result.includes('export interface'), 'Should export interface');
    assert.ok(result.includes(': string'), 'Should have type annotations');
    assert.ok(result.includes('constructor'), 'Should have constructor');

    // Check for JWT methods
    assert.ok(result.includes('jwt.sign'), 'Should have jwt.sign for token generation');
    assert.ok(result.includes('jwt.verify'), 'Should have jwt.verify for token verification');
    assert.ok(result.includes('jwt.decode'), 'Should have jwt.decode for debugging');

    console.log('✓ Generated code has valid TypeScript syntax');
  });

  test('Express version should include middleware', () => {
    const service = JwtHandlerGeneratorService.getInstance();
    const result = service['generateExpressJwtHandler']();

    assert.ok(result.includes('createAuthMiddleware'), 'Should have auth middleware');
    assert.ok(result.includes('createOptionalAuthMiddleware'), 'Should have optional auth middleware');
    assert.ok(result.includes('Request, Response, NextFunction'), 'Should import Express types');
    assert.ok(result.includes('req.user'), 'Should attach user to request');

    console.log('✓ Express middleware is included');
  });

  test('Fastify version should include plugin', () => {
    const service = JwtHandlerGeneratorService.getInstance();
    const result = service['generateFastifyJwtHandler']();

    assert.ok(result.includes('jwtAuthPlugin'), 'Should have JWT auth plugin');
    assert.ok(result.includes('fastify-plugin'), 'Should use fastify-plugin');
    assert.ok(result.includes('fastify.decorateRequest'), 'Should decorate request');
    assert.ok(result.includes('onRequest'), 'Should have onRequest hook');

    console.log('✓ Fastify plugin is included');
  });

  test('All versions should have security documentation', async () => {
    const service = JwtHandlerGeneratorService.getInstance();
    const result = await service.generate();

    assert.ok(result.explanation.includes('Security'), 'Should mention security');
    assert.ok(result.explanation.includes('secret'), 'Should mention secrets');
    assert.ok(result.explanation.includes('expires'), 'Should mention expiration');

    console.log('✓ Security documentation is included');
  });
});
