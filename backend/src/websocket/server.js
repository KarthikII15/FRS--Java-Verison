import shutdownManager from "../core/managers/ShutdownManager.js";

class SocketServer {
  io = null;
  connections = new Map();
  tenantRooms = new Map();

  async initialize(httpServer) {
    // Dynamic import works correctly in ESM (require() does not)
    const { Server } = await import("socket.io");

    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.use((socket, next) => {
      // Optional: validate socket auth token here in future
      next();
    });

    this.io.on("connection", (socket) => {
      this.connections.set(socket.id, { socket, ts: Date.now() });
      socket.on("joinTenant", (tenantId) => this.joinTenant(socket, String(tenantId)));
      socket.on("leaveTenant", (tenantId) => this.leaveTenant(socket, String(tenantId)));
      socket.on("disconnect", () => {
        this.connections.delete(socket.id);
      });
    });

    shutdownManager.registerShutdownHandler("socket.io", async () => {
      await this.shutdown();
    });
  }

  joinTenant(socket, tenantId) {
    socket.join(`tenant:${tenantId}`);
    if (!this.tenantRooms.has(tenantId)) this.tenantRooms.set(tenantId, new Set());
    this.tenantRooms.get(tenantId).add(socket.id);
  }

  leaveTenant(socket, tenantId) {
    socket.leave(`tenant:${tenantId}`);
    const set = this.tenantRooms.get(tenantId);
    if (set) set.delete(socket.id);
  }

  emitToUser(userId, event, payload) {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
  }
  emitToTenant(tenantId, event, payload) {
    if (!this.io) return;
    this.io.to(`tenant:${tenantId}`).emit(event, payload);
  }
  emitToRoom(room, event, payload) {
    if (!this.io) return;
    this.io.to(room).emit(event, payload);
  }
  emitToAll(event, payload) {
    if (!this.io) return;
    this.io.emit(event, payload);
  }

  broadcastAttendance(payload) {
    this.emitToTenant(payload?.tenantId ?? "all", "attendance.update", payload);
  }
  broadcastAlert(payload) {
    this.emitToTenant(payload?.tenantId ?? "all", "alert", payload);
  }

  getStats() {
    return {
      connections: this.connections.size,
      rooms: Array.from(this.tenantRooms.keys()),
    };
  }

  async shutdown() {
    if (this.io) {
      await new Promise((resolve) => this.io.close(() => resolve()));
      this.io = null;
      this.connections.clear();
      this.tenantRooms.clear();
    }
  }
}

const socketServer = new SocketServer();
export default socketServer;

