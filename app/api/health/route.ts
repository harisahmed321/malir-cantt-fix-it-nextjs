import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { NextResponse } from 'next/server';

const connectionTimeoutMs = 5000;

function checkTcpConnection(hostname: string, port: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: hostname, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Connection timed out'));
    }, connectionTimeoutMs);

    socket.once('connect', () => {
      clearTimeout(timeout);
      socket.end();
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json({ status: 'error', database: 'missing' }, { status: 503 });
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const port = Number(parsedUrl.port || 5432);
    const addresses = await lookup(parsedUrl.hostname, { all: true });

    await checkTcpConnection(parsedUrl.hostname, port);

    return NextResponse.json({
      status: 'ok',
      database: 'reachable',
      host: parsedUrl.hostname,
      port,
      addresses: addresses.map((address) => address.address),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        message: error instanceof Error ? error.message : 'Database connection failed',
      },
      { status: 503 },
    );
  }
}