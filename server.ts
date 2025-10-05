// server.ts - Next.js Standalone + Socket.IO
import { setupSocket } from '@/lib/socket';
import { createServer as createHttpServer } from 'http';
import { createServer as createNetServer } from 'net';
import { Server } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const preferredPort = Number(process.env.PORT) || 3000;

async function findAvailablePort(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tester = createNetServer();

    tester.once('error', (err) => {
      tester.close();
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'EADDRINUSE') {
        findAvailablePort(port + 1).then(resolve).catch(reject);
      } else {
        reject(error);
      }
    });

    tester.once('listening', () => {
      tester.close(() => resolve(port));
    });

    tester.listen(port, hostname);
  });
}

// Custom server with Socket.IO integration
async function createCustomServer() {
  try {
    // Create Next.js app
    const nextApp = next({
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createHttpServer((req, res) => {
      // Skip socket.io requests from Next.js handler
      if (req.url?.startsWith('/api/socketio')) {
        return;
      }
      handle(req, res);
    });

    // Setup Socket.IO
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    setupSocket(io);

    const listenPort = await findAvailablePort(preferredPort);
    if (listenPort !== preferredPort) {
      console.log(`> Port ${preferredPort} busy, switched to ${listenPort}`);
    }

    // Start the server
    server.listen(listenPort, hostname, () => {
      console.log(`> Ready on http://${hostname}:${listenPort}`);
      console.log(`> Socket.IO server running at ws://${hostname}:${listenPort}/api/socketio`);
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
createCustomServer();
