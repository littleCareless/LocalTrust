import { FastifyPluginAsync } from 'fastify';
import * as caService from '../services/ca.service';
import { successResponse, errorResponse } from '../utils/response';
import fs from 'fs';

export const caRoutes: FastifyPluginAsync = async (fastify) => {
  // 获取 CA 根证书信息
  fastify.get('/info', async (request, reply) => {
    try {
      const info = caService.getCAInfo();

      if (!info) {
        return successResponse(null, 'CA 证书尚未生成');
      }

      return successResponse(info);
    } catch (error) {
      console.error('获取 CA 信息失败:', error);
      return reply.code(500).send(errorResponse('获取 CA 信息失败'));
    }
  });

  // 生成新的 CA 根证书
  fastify.post('/generate', async (request, reply) => {
    try {
      const { commonName, organization } = request.body as {
        commonName?: string;
        organization?: string;
      };

      // 检查是否已存在
      const existing = caService.getCAInfo();
      if (existing && caService.caExists()) {
        return reply.code(409).send(errorResponse('CA 证书已存在，请先删除旧证书'));
      }

      const info = caService.generateCA({ commonName, organization });
      return reply.code(201).send(successResponse(info, 'CA 证书生成成功'));
    } catch (error) {
      console.error('生成 CA 证书失败:', error);
      return reply.code(500).send(errorResponse('生成 CA 证书失败'));
    }
  });

  // 下载 CA 根证书
  fastify.get('/download', async (request, reply) => {
    try {
      const certPath = caService.getCAFilePath();

      if (!certPath || !fs.existsSync(certPath)) {
        return reply.code(404).send(errorResponse('CA 证书文件不存在'));
      }

      const cert = fs.readFileSync(certPath);

      return reply
        .header('Content-Type', 'application/x-x509-ca-cert')
        .header('Content-Disposition', 'attachment; filename="localtrust-ca.crt"')
        .send(cert);
    } catch (error) {
      console.error('下载 CA 证书失败:', error);
      return reply.code(500).send(errorResponse('下载 CA 证书失败'));
    }
  });
};
