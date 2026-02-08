import { io, Socket } from 'socket.io-client';

// Agent server URL
const AGENT_URL = process.env.AGENT_SERVER_URL || 'http://localhost:8000';

type StreamCallback = (data: { chunk: string; index: number; conversationId: string }) => void;
type CompleteCallback = (data: { fullResponse: string; conversationId: string }) => void;
type ErrorCallback = (data: { message: string; conversationId: string }) => void;

class AgentSocketClient {
    private socket: Socket | null = null;
    private static instance: AgentSocketClient;
    private streamCallbacks: Map<string, StreamCallback> = new Map();
    private completeCallbacks: Map<string, CompleteCallback> = new Map();
    private errorCallbacks: Map<string, ErrorCallback> = new Map();

    private constructor() { }

    public static getInstance(): AgentSocketClient {
        if (!AgentSocketClient.instance) {
            AgentSocketClient.instance = new AgentSocketClient();
        }
        return AgentSocketClient.instance;
    }

    public connect(): void {
        if (this.socket?.connected) return;

        console.log(`🔌 Connecting to Agent Server at ${AGENT_URL}...`);

        this.socket = io(AGENT_URL, {
            transports: ['polling', 'websocket'],  // Try polling first, then websocket
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10
        });

        this.socket.on('connect', () => {
            console.log(`✅ Connected to Agent Server: ${this.socket?.id}`);
        });

        this.socket.on('disconnect', (reason) => {
            console.log(`❌ Disconnected from Agent Server: ${reason}`);
        });

        this.socket.on('connect_error', (err) => {
            console.error(`🔴 Agent connection error: ${err.message}`);
        });

        // Handle streaming events from Agent
        this.socket.on('chat:stream', (data: { chunk: string; index: number; conversationId: string }) => {
            const callback = this.streamCallbacks.get(data.conversationId);
            if (callback) {
                callback(data);
            }
        });

        this.socket.on('chat:complete', (data: { fullResponse: string; conversationId: string }) => {
            const callback = this.completeCallbacks.get(data.conversationId);
            if (callback) {
                callback(data);
            }
            // Cleanup callbacks for this conversation
            this.cleanupCallbacks(data.conversationId);
        });

        this.socket.on('chat:error', (data: { message: string; conversationId: string }) => {
            const callback = this.errorCallbacks.get(data.conversationId);
            if (callback) {
                callback(data);
            }
            // Cleanup callbacks for this conversation
            this.cleanupCallbacks(data.conversationId);
        });

        this.socket.on('chat:status', (data: { status: string; conversationId: string }) => {
            console.log(`📊 Agent status for ${data.conversationId}: ${data.status}`);
        });
    }

    private cleanupCallbacks(conversationId: string): void {
        this.streamCallbacks.delete(conversationId);
        this.completeCallbacks.delete(conversationId);
        this.errorCallbacks.delete(conversationId);
    }

    public sendMessage(
        message: string,
        conversationId: string,
        userId: number,
        userToken: string,
        onStream: StreamCallback,
        onComplete: CompleteCallback,
        onError: ErrorCallback
    ): void {
        if (!this.socket?.connected) {
            onError({ message: 'Not connected to Agent Server', conversationId });
            return;
        }

        // Register callbacks for this conversation
        this.streamCallbacks.set(conversationId, onStream);
        this.completeCallbacks.set(conversationId, onComplete);
        this.errorCallbacks.set(conversationId, onError);

        // Send message to Agent with user token for backend API calls
        this.socket.emit('chat:send', {
            message,
            conversationId,
            userId,
            userToken  // Pass token to agent
        });
    }

    public isConnected(): boolean {
        return !!this.socket?.connected;
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.streamCallbacks.clear();
        this.completeCallbacks.clear();
        this.errorCallbacks.clear();
    }
}

export const agentSocketClient = AgentSocketClient.getInstance();
