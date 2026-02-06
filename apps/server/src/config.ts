import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  dnsPort: parseInt(process.env.DNS_PORT || '53', 10),
  caDir: process.env.CA_DIR || './data/ca',
  certDir: process.env.CERT_DIR || './data/certs',
};
