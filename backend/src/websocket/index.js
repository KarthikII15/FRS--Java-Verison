import socketServer from "./server.js";
import shutdownManager from "../core/managers/ShutdownManager.js";

class WebSocketManager {
  initialized = false;

  async initialize(httpServer) {
    if (this.initialized) return;
    await socketServer.initialize(httpServer);
    this.initialized = true;
    shutdownManager.registerShutdownHandler("ws-manager", async () => this.shutdown());
  }

  getIO() {
    return socketServer.io;
  }

  emitAttendanceUpdate(payload) {
    socketServer.broadcastAttendance(payload);
  }
  emitPresenceUpdate(payload) {
    socketServer.emitToTenant(payload?.tenantId ?? "all", "presence.update", payload);
  }
  emitAlert(payload) {
    socketServer.broadcastAlert(payload);
  }
  emitDashboardUpdate(payload) {
    socketServer.emitToTenant(payload?.tenantId ?? "all", "dashboard.update", payload);
  }

  getStats() {
    return socketServer.getStats();
  }

  async shutdown() {
    await socketServer.shutdown();
    this.initialized = false;
  }
}

const wsManager = new WebSocketManager();
export default wsManager;

