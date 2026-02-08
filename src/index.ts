import { Http2ServerRequest, Http2ServerResponse } from "http2";
import { createServer } from 'http';
import apiRoutes from './routes/index';
import { initSocket } from './socket';
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3001;
console.log('Starting server initialization...');
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port configured as: ${PORT}`);

// Disable ETags to prevent 304 responses on API calls
console.log('Setting up middleware...');
app.set('etag', false);

// Enable CORS for all routes
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

app.use(cors({
  origin: function (origin: any, callback: any) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-API-Key']
}));

app.use(express.json());
app.use(cookieParser());
app.get('/', (req: Http2ServerRequest, res: Http2ServerResponse) => {
  res.end('Hello from M S Organics')
})

console.log('Setting up routes...');
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err);

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'The uploaded file exceeds the maximum allowed size of 5MB. Please choose a smaller file.',
        code: err.code
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file',
        message: 'Unexpected file field. Please check your upload configuration.',
        code: err.code
      });
    }
    // Other multer errors
    return res.status(400).json({
      error: 'File upload error',
      message: err.message,
      code: err.code
    });
  }

  // Handle other errors
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server and attach Socket.IO
console.log('Creating HTTP server...');
const httpServer = createServer(app);
console.log('Initializing Socket.IO...');
initSocket(httpServer);

console.log('Attempting to listen...');
httpServer.on('error', (err: any) => {
  console.error('Server failed to start:', err);
});

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server is listening at http://0.0.0.0:${PORT}`);
})