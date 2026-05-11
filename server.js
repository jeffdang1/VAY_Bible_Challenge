/**
 * Serves the game and powers optional "online session" rooms (share a code like Kahoot).
 * Run: npm install && npm start
 * Open http://localhost:3000 (or your LAN IP from another device on the same Wi‑Fi).
 */
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: true, methods: ['GET', 'POST'] }
});

const publicDir = path.join(__dirname);
app.use(express.static(publicDir));

function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

/** @type {Record<string, { hostSocketId: string, state: object | null }>} */
const rooms = {};

io.on('connection', (socket) => {
    socket.on('hostCreateRoom', () => {
        let code;
        do {
            code = randomCode();
        } while (rooms[code]);
        rooms[code] = { hostSocketId: socket.id, state: null };
        socket.join(code);
        socket.data.isHost = true;
        socket.data.roomCode = code;
        socket.emit('roomCreated', { code });
    });

    socket.on('hostUpdateState', (payload) => {
        const code = payload && payload.code;
        const state = payload && payload.state;
        if (!code || !rooms[code] || rooms[code].hostSocketId !== socket.id) {
            return;
        }
        rooms[code].state = state;
        socket.to(code).emit('stateUpdate', state);
    });

    socket.on('playerJoin', ({ code, slot }) => {
        const c = (code || '').toString().trim().toUpperCase();
        if (!rooms[c]) {
            socket.emit('joinError', { message: 'Invalid or expired game code.' });
            return;
        }
        const s = parseInt(slot, 10);
        if (s < 1 || s > 3) {
            socket.emit('joinError', { message: 'Pick team 1, 2, or 3.' });
            return;
        }
        socket.join(c);
        socket.data.roomCode = c;
        socket.data.slot = s;
        socket.emit('joinSuccess', { slot: s, code: c });
        if (rooms[c].state) {
            socket.emit('stateUpdate', rooms[c].state);
        }
    });

    socket.on('disconnect', () => {
        if (socket.data.isHost && socket.data.roomCode) {
            const c = socket.data.roomCode;
            io.to(c).emit('roomClosed', { message: 'Host ended the session.' });
            delete rooms[c];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Jeopardy game server running:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://<your-LAN-IP>:${PORT}  (for phones on same Wi‑Fi)`);
});
