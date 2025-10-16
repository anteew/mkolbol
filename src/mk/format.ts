import YAML from 'yaml';

export function yamlToJson(yamlContent: string): object {
  try {
    const parsed = YAML.parse(yamlContent);
    if (parsed === null || parsed === undefined) {
      throw new Error('YAML content is empty or invalid');
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('YAML must parse to an object, not a scalar or array');
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`YAML parse error: ${error.message}`);
    }
    throw error;
  }
}

export function jsonToYaml(jsonObject: object): string {
  if (typeof jsonObject !== 'object' || jsonObject === null) {
    throw new Error('Input must be a non-null object');
  }
  
  try {
    return YAML.stringify(jsonObject, {
      indent: 2,
      lineWidth: 100,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'PLAIN',
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`YAML serialization error: ${error.message}`);
    }
    throw error;
  }
}

export function detectFormat(content: string): 'json' | 'yaml' {
  const trimmed = content.trim();
  
  if (!trimmed) {
    throw new Error('Cannot detect format of empty content');
  }
  
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {
      return 'yaml';
    }
  }
  
  return 'yaml';
}
