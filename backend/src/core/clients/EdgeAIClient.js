import FormData from 'form-data';
import { createGatewayClient } from './GatewayHttp.js';
import { env } from '../../config/env.js';

class EdgeAIClient {
  constructor() {
    this.http = createGatewayClient(env.services.edgeAIService || 'ivis-scanalitix-edge-ai');
  }

  async recognizeImageBuffer(buffer, metadata = {}) {
    const fd = new FormData();
    fd.append('image', buffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
    Object.entries(metadata || {}).forEach(([k, v]) => fd.append(k, String(v)));
    const res = await this.http.post('/api/recognize', fd, {
      headers: fd.getHeaders(),
    });
    return res.data;
  }

  async recognizeByUrl(url, metadata = {}) {
    const res = await this.http.post('/api/recognize', { url, metadata });
    return res.data;
  }
}

const edgeAIClient = new EdgeAIClient();
export default edgeAIClient;
