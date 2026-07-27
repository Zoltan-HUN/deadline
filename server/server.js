const path = require('path');
const http = require('http');
const express = require('express');
const session = require('express-session');
const { Server } = require('socket.io');

const authRouter = require('./routes/auth');
const createRoundsRouter = require('./routes/rounds');

const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', authRouter);
app.use('/api/rounds', createRoundsRouter(io));

server.listen(PORT, () => {
  console.log(`Deadline scoring app listening on http://localhost:${PORT}`);
});
