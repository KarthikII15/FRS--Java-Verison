import axios from 'axios';
import { env } from '../../../src/config/env.js';

export function buildServiceBase(service) {
  const base = env.services.apiGateway?.replace(/\/+$/, '') || '';
  const seg = service?.replace(/^\/+/, '') || '';
  return `${base}/${seg}`;
}

export function createGatewayClient(serviceSegment) {
  const baseURL = buildServiceBase(serviceSegment);
  const instance = axios.create({
    baseURL,
    timeout: env.http.timeoutMs || 15000,
  });
  return instance;
}
