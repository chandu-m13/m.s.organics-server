import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, JWTPayload } from './middleware/auth.middleware';
import { agentSocketClient } from './agentSocketClient';

// Extend Socket to include user data
interface AuthenticatedSocket extends Socket {
    user?: JWTPayload;
}

let io: Server;

export const initSocket = (server: HttpServer): Server => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

    io = new Server(server, {
        cors: {
            origin: function (origin: any, callback: any) {
                if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    // Connect to Agent Server
    agentSocketClient.connect();

    // JWT Authentication middleware for socket connections
    io.use((socket: AuthenticatedSocket, next) => {
        try {
            // Read token from cookies (sent via withCredentials)
            const cookies = socket.handshake.headers.cookie;
            let token: string | undefined;

            if (cookies) {
                // Parse cookies to find accessToken
                const cookieArray = cookies.split(';').map(c => c.trim());
                const accessTokenCookie = cookieArray.find(c => c.startsWith('accessToken='));
                if (accessTokenCookie) {
                    token = accessTokenCookie.split('=')[1];
                }
            }

            // Fallback to auth object for backward compatibility
            if (!token) {
                token = socket.handshake.auth?.token;
            }

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = verifyToken(token);
            socket.user = decoded;
            next();
        } catch (error) {
            console.error('Socket auth error:', error);
            next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        console.log(`✅ Socket connected: ${socket.id} | User: ${socket.user?.email}`);

        // Handle chat message from client
        socket.on('chat:send', async (data: { message: string; conversationId?: string }) => {
            console.log(`📨 Message from ${socket.user?.email}:`, data.message);

            const conversationId = data.conversationId || `conv-${Date.now()}`;

            // Check if Agent is connected
            if (!agentSocketClient.isConnected()) {
                console.log('⚠️ Agent not connected, using fallback response');
                // Fallback: send a test response if agent is not available
                const fallbackResponse = `Agent server is not available. Your message was: "${data.message}"`;
                socket.emit('chat:complete', {
                    conversationId,
                    fullResponse: fallbackResponse
                });
                return;
            }

            try {
                // Get user token from cookies (same logic as connection auth)
                const cookies = socket.handshake.headers.cookie;
                let userToken = '';

                if (cookies) {
                    const cookieArray = cookies.split(';').map(c => c.trim());
                    const accessTokenCookie = cookieArray.find(c => c.startsWith('accessToken='));
                    if (accessTokenCookie) {
                        userToken = accessTokenCookie.split('=')[1];
                    }
                }

                // Fallback to auth object
                if (!userToken) {
                    userToken = socket.handshake.auth?.token || '';
                }

                // Forward message to Agent Server with user token
                agentSocketClient.sendMessage(
                    data.message,
                    conversationId,
                    socket.user?.userId || 0,
                    userToken,  // Pass token to agent for backend API calls
                    // onStream - relay streaming chunks to client
                    (streamData) => {
                        socket.emit('chat:stream', streamData);
                    },
                    // onComplete - relay completion to client
                    (completeData) => {
                        socket.emit('chat:complete', completeData);
                    },
                    // onError - relay error to client
                    (errorData) => {
                        socket.emit('chat:error', errorData);
                    }
                );
            } catch (error) {
                console.error('Chat error:', error);
                socket.emit('chat:error', {
                    message: 'Failed to process message',
                    conversationId
                });
            }
        });

        // Handle ping for testing
        socket.on('ping', () => {
            console.log(`🏓 Ping from ${socket.user?.email}`);
            socket.emit('pong', { timestamp: Date.now(), userId: socket.user?.userId });
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
        });
    });

    console.log('🔌 Socket.IO server initialized');
    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};
