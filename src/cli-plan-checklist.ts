#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.plan-checklist');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Config {
  server?: string;
  namespace?: string;
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    // ignore
  }
  return {};
}

function saveConfig(config: Partial<Config>) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    const currentConfig = loadConfig();
    const newConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  } catch (e: any) {
    console.error(`Warning: Failed to save config: ${e.message}`);
  }
}

const config = loadConfig();

let getBaseUrl = (serverOption: string) => {
  return serverOption || config.server || process.env.CHECKLIST_API_URL || 'http://localhost:8585';
};

let getNamespace = (namespaceOption: string) => {
  return namespaceOption || config.namespace || 'default';
};

const program = new Command();

program
  .name('plan-checklist')
  .description('CLI tool to interact with Checklist MCP Server to manage tasks')
  .version('1.0.0')
  .option('-s, --server <url>', 'Override the default server URL and save it')
  .option('-n, --namespace <ns>', 'Namespace isolation and save it')
  .hook('preAction', (thisCommand) => {
    // If global options are provided, save them to config
    const opts = thisCommand.optsWithGlobals();
    const updates: Partial<Config> = {};
    if (opts.server) updates.server = opts.server;
    if (opts.namespace) updates.namespace = opts.namespace;
    if (Object.keys(updates).length > 0) {
      saveConfig(updates);
    }
  });

/**
 * Default Action when no command is provided
 */
program.action(async () => {
  console.log('--- Plan Checklist CLI ---');
  console.log(`Config file: ${CONFIG_FILE}`);
  console.log(`Current Server: ${getBaseUrl(program.opts().server)}`);
  console.log(`Current Namespace: ${getNamespace(program.opts().namespace)}`);
  console.log('Checking server health...');
  
  try {
    const url = `${getBaseUrl(program.opts().server)}/health`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      console.log(`Server Status: \x1b[32mOK\x1b[0m (Version: ${data.version})`);
    } else {
      console.log(`Server Status: \x1b[31mError\x1b[0m (${res.status} ${res.statusText})`);
    }
  } catch (e: any) {
    console.log(`Server Status: \x1b[31mUnreachable\x1b[0m (${e.message})`);
  }
});


/**
 * Helper to execute a GET request
 */
async function fetchGet(url: string, errorMessage: string) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.error(`Error: ${data.error || res.statusText}`);
      process.exit(1);
    }
    console.log(data.message);
  } catch (error: any) {
    console.error(`${errorMessage}: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Helper to execute a POST request
 */
async function fetchPost(url: string, body: any, errorMessage: string) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`Error: ${data.error || res.statusText}`);
      process.exit(1);
    }
    console.log(data.message);
  } catch (error: any) {
    console.error(`${errorMessage}: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Command: list
 */
program
  .command('list')
  .description('Retrieve all tasks for a session')
  .argument('<sessionId>', 'The session ID')
  .action(async (sessionId, options, command) => {
    const opts = command.optsWithGlobals();
    const serverUrl = getBaseUrl(opts.server);
    const namespace = getNamespace(opts.namespace);
    
    const url = new URL(`${serverUrl}/api/tasks`);
    url.searchParams.append('sessionId', sessionId);
    url.searchParams.append('namespace', namespace);
    
    await fetchGet(url.toString(), 'Failed to retrieve tasks');
  });

/**
 * Command: update
 */
program
  .command('update')
  .description('Update tasks at a specific path')
  .argument('<sessionId>', 'The session ID')
  .option('-p, --path <path>', 'The hierarchical path', '/')
  .option('-f, --file <tasks.json>', 'JSON file containing tasks array')
  .option('-t, --text <tasks_json_string>', 'JSON string containing tasks array')
  .action(async (sessionId, options, command) => {
    let tasksData = '';

    if (options.file) {
      try {
        tasksData = fs.readFileSync(path.resolve(options.file), 'utf8');
      } catch (e: any) {
        console.error(`Failed to read file ${options.file}: ${e.message}`);
        process.exit(1);
      }
    } else if (options.text) {
      tasksData = options.text;
    } else {
      // Read from stdin properly (blocking for stream end)
      try {
        tasksData = fs.readFileSync(process.stdin.fd, 'utf-8');
      } catch (e: any) {
        if (e.code === 'EAGAIN') {
           console.error('Error: stdin is non-blocking. Please pipe input or use -f / -t.');
        } else {
           console.error(`Error reading stdin: ${e.message}`);
        }
        process.exit(1);
      }
    }

    if (!tasksData.trim()) {
      console.error('Error: No input tasks provided. Please provide tasks via stdin, -f, or -t.');
      process.exit(1);
    }

    let parsedTasks;
    try {
      parsedTasks = JSON.parse(tasksData);
      if (!Array.isArray(parsedTasks)) {
        throw new Error('Input must be a JSON array of tasks');
      }
    } catch (e: any) {
      console.error(`Invalid JSON input: ${e.message}`);
      process.exit(1);
    }

    const opts = command.optsWithGlobals();
    const serverUrl = getBaseUrl(opts.server);
    const namespace = getNamespace(opts.namespace);
    
    const url = new URL(`${serverUrl}/api/tasks/update`);
    url.searchParams.append('namespace', namespace);

    const body = {
      sessionId,
      path: options.path,
      tasks: parsedTasks
    };

    await fetchPost(url.toString(), body, 'Failed to update tasks');
  });

/**
 * Command: done
 */
program
  .command('done')
  .description('Mark one or more tasks as done')
  .argument('<sessionId>', 'The session ID')
  .argument('<taskId...>', 'One or more task IDs to mark as done')
  .action(async (sessionId, taskIds, options, command) => {
    const opts = command.optsWithGlobals();
    const serverUrl = getBaseUrl(opts.server);
    const namespace = getNamespace(opts.namespace);
    
    const url = new URL(`${serverUrl}/api/tasks/done`);
    url.searchParams.append('namespace', namespace);

    const body = {
      sessionId,
      taskIds,
    };

    await fetchPost(url.toString(), body, 'Failed to mark tasks as done');
  });

// Parse arguments
program.parse(process.argv);
