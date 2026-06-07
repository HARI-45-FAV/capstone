// Initializing Express Backend for SACME
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Initialize Environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json()); // Body parser

// Serve static files for uploaded avatars
const path = require('path');
app.use('/public', express.static(path.join(__dirname, 'public')));

// Healthcheck Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'SACME Backend is Operational', timestamp: new Date() });
});

app.get('/api/test-error', (req, res, next) => {
    next(new Error("Test Error Handler"));
});

// Import Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/institute', require('./routes/institute'));
app.use('/api/academic', require('./routes/academic'));
app.use('/api/semester', require('./routes/semester'));
app.use('/api/faculty-advisor', require('./routes/facultyAdvisor'));
app.use('/api/ticket', require('./routes/ticket'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/network-map', require('./routes/network'));
app.use('/api/courses', require('./routes/course'));
app.use('/api/assignments', require('./routes/assignment'));
app.use('/api/actions', require('./routes/courseAction'));
app.use('/api/course-actions', require('./routes/courseAction'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/students', require('./routes/student'));
app.use('/api/materials', require('./routes/material'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/communication', require('./routes/communication'));
// Global Error Handler (specifically for Multer upload limits/filters)
app.use((err, req, res, next) => {
    if (err) {
        console.error('Express Error Caught:', err.message);
        const status = err.status || 500;
        return res.status(status).json({ error: err.message });
    }
    next();
});

// 404 Fallback Handler
app.use((req, res) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

const { createServer } = require('http');
const { Server } = require('socket.io');

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

app.set('io', io); // Allow routes to emit events via req.app.get('io')

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    
    // Students and Professors join the unique quiz room
    socket.on('join_quiz_room', (payload) => {
        // Support legacy single string or targeted object
        const quizId = typeof payload === 'string' ? payload : payload.quizId;
        socket.join(`quiz_${quizId}`);
        console.log(`[Socket] ${socket.id} joined quiz_${quizId}`);

        if (payload.studentId) {
            io.to(`quiz_${quizId}`).emit('student_joined', {
                studentId: payload.studentId,
                name: payload.studentName
            });
        }
    });

    socket.on('student_status', (payload) => {
        io.to(`quiz_${payload.quizId}`).emit('student_status', payload);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
});

httpServer.listen(PORT, () => {
    console.log(`SACME API + Realtime Socket Server running at http://localhost:${PORT}`);
});
