import { createGatewayClient } from './GatewayHttp.js';
import { env } from '../../config/env.js';

class OperationsServiceClient {
  constructor() {
    this.http = createGatewayClient(env.services.operationsService || 'ivis-scanalitix-operations-service');
  }

  async postAttendance(payload) {
    const res = await this.http.post('/api/attendance', payload);
    return res.data;
  }
}

const operationsServiceClient = new OperationsServiceClient();
export default operationsServiceClient;
