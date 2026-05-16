import { describe, it, expect, beforeEach } from 'vitest';

import { EnvFileGeneratorService } from '../../src/services/envFileGeneratorService';

describe('EnvFileGeneratorService.parseEnvVariables', () => {
  let svc: EnvFileGeneratorService;
  let parseEnvVariables: (content: string) => { name: string }[];

  beforeEach(() => {
    (EnvFileGeneratorService as any).instance = undefined;
    svc = EnvFileGeneratorService.getInstance();
    parseEnvVariables = (svc as any).parseEnvVariables.bind(svc);
  });

  it('should skip comments and empty lines when parsing', () => {
    const content = [
      '# This is a comment',
      '',
      'NODE_ENV=production',
      'PORT=3000',
      '# Another comment',
      'DB_HOST=localhost',
    ].join('\n');

    const variables = parseEnvVariables(content);
    expect(variables).toHaveLength(3);
    expect(variables.map((v) => v.name)).toEqual(['NODE_ENV', 'PORT', 'DB_HOST']);
  });

  it('should ignore lines without equals sign', () => {
    const content = 'GOOD_VAR=value\nINVALID_LINE\nANOTHER=ok';
    const variables = parseEnvVariables(content);
    expect(variables).toHaveLength(2);
    expect(variables[0].name).toBe('GOOD_VAR');
    expect(variables[1].name).toBe('ANOTHER');
  });
});
