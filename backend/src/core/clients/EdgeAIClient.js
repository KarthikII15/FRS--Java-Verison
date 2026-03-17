import axios from 'axios';
import FormData from 'form-data';
import { env } from '../../config/env.js';

class EdgeAIClient {
  constructor() {
    this.http = axios.create({
      baseURL: env.edgeAI.baseUrl,
      timeout: env.http.timeoutMs || 15000,
    });
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
