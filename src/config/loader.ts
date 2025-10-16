import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { TopologyConfig, NodeConfig, ConnectionConfig } from './schema.js';

export interface LoadConfigOptions {
  validate?: boolean;
}

export function loadConfig(pathOrString: string, opts?: LoadConfigOptions): TopologyConfig {
  const options = { validate: true, ...opts };
  
  let content: string;
  let config: any;
  
  try {
    content = readFileSync(pathOrString, 'utf-8');
  } catch {
    content = pathOrString;
  }
  
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    config = JSON.parse(content);
  } else {
    config = parseYaml(content);
  }
  
  if (options.validate) {
    validateTopology(config);
  }
  
  return config as TopologyConfig;
}

export function validateTopology(config: any): void {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }
  
  if (!config.nodes) {
    throw new Error('Configuration must have a "nodes" array');
  }
  
  if (!Array.isArray(config.nodes)) {
    throw new Error('"nodes" must be an array');
  }
  
  if (!config.connections) {
    throw new Error('Configuration must have a "connections" array');
  }
  
  if (!Array.isArray(config.connections)) {
    throw new Error('"connections" must be an array');
  }

  const localNodeMode = process.env.MK_LOCAL_NODE === '1';
  
  const nodeIds = new Set<string>();
  
  for (let i = 0; i < config.nodes.length; i++) {
    const node = config.nodes[i];
    
    if (!node.id) {
      throw new Error(`Node at index ${i} is missing required field "id"`);
    }
    
    if (typeof node.id !== 'string') {
      throw new Error(`Node at index ${i} has invalid "id" (must be a string)`);
    }
    
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id: "${node.id}"`);
    }
    
    nodeIds.add(node.id);
    
    if (!node.module) {
      throw new Error(`Node "${node.id}" is missing required field "module"`);
    }
    
    if (typeof node.module !== 'string') {
      throw new Error(`Node "${node.id}" has invalid "module" (must be a string)`);
    }

    if (localNodeMode && node.params) {
      if (node.params.type === 'network' || node.params.address) {
        throw new Error(`Node "${node.id}" uses network features (type=network or address field) which are not allowed when MK_LOCAL_NODE=1. Local Node mode only supports in-process routing.`);
      }
    }
  }
  
  for (let i = 0; i < config.connections.length; i++) {
    const conn = config.connections[i];
    
    if (!conn.from) {
      throw new Error(`Connection at index ${i} is missing required field "from"`);
    }
    
    if (!conn.to) {
      throw new Error(`Connection at index ${i} is missing required field "to"`);
    }
    
    if (typeof conn.from !== 'string') {
      throw new Error(`Connection at index ${i} has invalid "from" (must be a string)`);
    }
    
    if (typeof conn.to !== 'string') {
      throw new Error(`Connection at index ${i} has invalid "to" (must be a string)`);
    }
    
    validateAddress(conn.from, `Connection at index ${i}`);
    validateAddress(conn.to, `Connection at index ${i}`);
    
    const fromNode = conn.from.split('.')[0];
    const toNode = conn.to.split('.')[0];
    
    if (!nodeIds.has(fromNode)) {
      throw new Error(`Connection at index ${i}: node "${fromNode}" referenced in "from" does not exist`);
    }
    
    if (!nodeIds.has(toNode)) {
      throw new Error(`Connection at index ${i}: node "${toNode}" referenced in "to" does not exist`);
    }
  }
}

function validateAddress(address: string, context: string): void {
  if (!address.includes('.')) {
    throw new Error(`${context}: address "${address}" must be in format "node.terminal"`);
  }
  
  const parts = address.split('.');
  if (parts.length !== 2) {
    throw new Error(`${context}: address "${address}" must have exactly one dot (format: "node.terminal")`);
  }
  
  const [node, terminal] = parts;
  if (!node || !terminal) {
    throw new Error(`${context}: address "${address}" has empty node or terminal name`);
  }
}
