import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config';
import { caRoutes } from './routes/ca';
import { dnsRoutes } from './routes/dns';
import { certRoutes } from './routes/cert';
import { settingsRoutes } from './routes/settings';
import hostsRoutes from './routes/hosts.js';
import mappingsRoutes from './routes/mappings.js';
import nodesRoutes from './routes/nodes.js';
import tenantsRoutes from './routes/tenants.js';
import './db'; // 初始化数据库
import { initCA } from './services/ca.service';

const fastify = Fastify({
  logger: true,
});

async function start() {
  try {
    // 初始化数据库和 CA 证书
    console.log('📦 初始化数据库...');
    initCA(); // 如果不存在则生成 CA 证书

    // 注册插件
    await fastify.register(cors, {
      origin: config.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    });

    await fastify.register(helmet);

    // 注册静态文件服务（用于提供证书下载）
    await fastify.register(fastifyStatic, {
      root: path.join(process.cwd(), 'data', 'certs'),
      prefix: '/certs/',
    });

    // 注册路由
    await fastify.register(caRoutes, { prefix: '/api/ca' });
    await fastify.register(dnsRoutes, { prefix: '/api/dns' });
    await fastify.register(certRoutes, { prefix: '/api/cert' });
    await fastify.register(settingsRoutes, { prefix: '/api/settings' });
    await fastify.register(hostsRoutes, { prefix: '/api/hosts' });
    await fastify.register(mappingsRoutes, { prefix: '/api' });
    await fastify.register(nodesRoutes, { prefix: '/api' });
    await fastify.register(tenantsRoutes, { prefix: '/api' });

    // 健康检查
    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // 启动服务器
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`🚀 LocalTrust Server is running on http://${config.host}:${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
