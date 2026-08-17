const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const docRoutes = require('./src/routes/docRoutes');
const Document = require('./src/models/Document');

const app = express();
const server = http.createServer(app);
// todo: maybe move to env?
const allowedOrigins = [
  'http://localhost:5173',
  'http://172.16.5.46:5173', // my pc 
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

connectDB();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get('/', (req, res) => res.send('Collaborative Editor API is running.'));

// setup routes
app.use('/api/auth', authRoutes);
app.use('/api/docs', docRoutes);

// websocket stuff
io.on('connection', (socket) => {
  // console.log('user connected ->', socket.id);

  socket.on('join-document', async ({ documentId, user }) => {
    socket.join(documentId);

    let hasEditPermission = false;
    try {
      if (user) {
        const document = await Document.findById(documentId);
        if (document) {
          if (document.owner.toString() === user._id) {
            hasEditPermission = true;
          } else {
            const share = document.sharedWith.find(s => s.user.toString() === user._id);
            if (share && (share.permission === 'Editor' || share.permission === 'Commenter')) {
              hasEditPermission = true;
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
    }

    if (user) socket.to(documentId).emit('user-joined', user);

    socket.on('send-changes', (delta) => {
      if (!hasEditPermission) return;
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      if (!hasEditPermission) return;
      await Document.findByIdAndUpdate(documentId, {
        data,
        lastModified: Date.now()
      });
    });

    socket.on('leave-document', () => {
      socket.leave(documentId);
      if (user) {
        socket.to(documentId).emit('user-left', user);
      }
    });

    socket.on('disconnect', () => {
      // alert others
      if (user) {
        socket.to(documentId).emit('user-left', user);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`server up on ${PORT}`); // http://172.16.5.46:${PORT}
});
