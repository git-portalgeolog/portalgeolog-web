import { spawn } from 'node:child_process';
import { NextResponse } from 'next/server';
import { unauthorizedResponse, validateAuth } from '@/lib/whatsapp';

export const runtime = 'nodejs';

interface SSHRequest {
  command: string;
}

function runSshCommand(params: SSHRequest): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const { command } = params;

    const host = process.env.WAHA_SSH_HOST;
    const port = Number(process.env.WAHA_SSH_PORT || 22);
    const username = process.env.WAHA_SSH_USERNAME;
    const password = process.env.WAHA_SSH_PASSWORD;
    const remoteDir = process.env.WAHA_REMOTE_DIR || '/opt/waha';

    if (!host || !username || !password) {
      reject(new Error('SSH da WAHA não configurado no ambiente'));
      return;
    }

    const remoteCommand = `cd ${remoteDir} && ${command}`;
    const sshArgs = [
      '-p',
      String(port),
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'UserKnownHostsFile=/dev/null',
      '-o',
      'ConnectTimeout=30',
      '-o',
      'ServerAliveInterval=10',
      '-o',
      'ServerAliveCountMax=3',
      `${username}@${host}`,
      'bash',
      '-lc',
      JSON.stringify(remoteCommand),
    ];

    const child = spawn('sshpass', ['-p', password, 'ssh', ...sshArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error: Error) => {
      reject(error);
    });

    child.on('close', (code: number | null) => {
      resolve({ stdout, stderr, code });
    });
  });
}

export async function POST(request: Request) {
  try {
    const auth = await validateAuth(request);
    if (!auth) {
      return unauthorizedResponse(request);
    }

    const body: SSHRequest = await request.json();
    const { command } = body;

    if (!command) {
      return NextResponse.json(
        { success: false, error: 'Comando é obrigatório' },
        { status: 400 }
      );
    }

    if (command.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Comando muito longo (máximo 2000 caracteres)' },
        { status: 400 }
      );
    }

    const result = await runSshCommand({ command });

    return NextResponse.json({
      success: true,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    });
  } catch (error: unknown) {
    console.error('[ssh] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao executar comando SSH',
      },
      { status: 500 }
    );
  }
}
