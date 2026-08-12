# SyncWrite - Real-Time Collaborative Document Editor

SyncWrite is a fully-functional, real-time collaborative document editor built to demonstrate robust software engineering capabilities. It features real-time conflict-free editing, multi-user presence, document sharing with permissions, and a beautiful modern interface.

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `localhost:27017`

### Setup

1. **Install Dependencies**
   Run the following from the project root:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Run Backend Server (Port 5000)**
   ```bash
   cd backend
   npm run dev
   ```
   *Note: Server requires a local MongoDB instance running at `mongodb://127.0.0.1:27017/collaborative-editor` by default. You can change this in `backend/.env`*.

3. **Run Frontend App (Port 5173)**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Experience Collaboration**
   - Open `localhost:5173` in two separate Incognito windows.
   - Register two different users.
   - Create a document with User 1.
   - Share the document with User 2 from the Editor interface, granting them "Editor" permissions.
   - Open the shared document on User 2's dashboard.
   - Edit the document simultaneously in both windows. Note the live sync and presence indicators (avatars)!

## Tech Stack & Architecture choices
- **Frontend Framework**: React 18 with Vite. Chosen for modern module bundling and blazing fast HMR.
- **Styling**: Tailwind CSS. Chosen for rapid UI iteration and a cohesive design system without bloat.
- **Real-Time Editor logic**: React-Quill. Chosen because Quill's Delta format is incredibly optimized for operational transformations over WebSockets, minimizing race conditions natively.
- **Backend**: Node.js + Express. Highly scalable asynchronous I/O, perfect for WebSockets.
- **Real-Time Communication**: Socket.IO. Handles reconnections gracefully and supports namespaces out of the box.
- **Database**: MongoDB via Mongoose. Extremely flexible for storing deeply nested JSON structures (like rich text Deltas), avoiding the rigidity of relational schemas for dynamic document bodies.

## Key Features Implemented

- **Secure Authentication**: JWT-based Authentication with bcrypt password hashing.
- **Dashboard & CRUD**: Ability to create, list, rename, delete, and duplicate documents.
- **Real-Time Collaboration**: Sub-second synchronization of content states using socket broadcasting.
- **Presence Awareness**: Real-time awareness of avatars for who has joined your document room.
- **Auto-Saving**: Automatic document persistence asynchronously every 2 seconds.
- **Permissions Engine**: Robust sharing API allowing granular permission controls (Viewer vs Editor), secured not only via REST logic but fully verified through the live WebSocket stream.

## Future Roadmap (Time-Boxed Features)
- Extended version history with rollback snapshot queries.
- Block-level commenting anchors.
- End-to-end encryption for the socket payloads.
