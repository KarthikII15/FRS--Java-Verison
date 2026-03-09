import { createGatewayClient } from './GatewayHttp.js';
import { env } from '../../config/env.js';

class RTSPClient {
  constructor() {
    this.http = createGatewayClient(env.services.rtspService || 'ivis-rtsp-service');
  }

  async registerWebhook({ callbackUrl, cameras }) {
    const res = await this.http.post('/api/webhooks', { callbackUrl, cameras });
    return res.data;
  }

  async listCameras() {
    const res = await this.http.get('/api/cameras');
    return res.data;
  }
}

const rtspClient = new RTSPClient();
export default rtspClient;
