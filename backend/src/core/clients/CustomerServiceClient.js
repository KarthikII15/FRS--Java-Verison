import { createGatewayClient } from './GatewayHttp.js';
import { env } from '../../config/env.js';

class CustomerServiceClient {
  constructor() {
    this.http = createGatewayClient(env.services.customerService || 'ivis-customer-sitemgmt');
  }

  async getEmployeeById(employeeId) {
    const res = await this.http.get(`/api/employees/${encodeURIComponent(employeeId)}`);
    return res.data;
  }
}

const customerServiceClient = new CustomerServiceClient();
export default customerServiceClient;
