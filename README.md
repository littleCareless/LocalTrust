# LocalTrust 产品说明文档

## 1. 产品概述

**LocalTrust** 是一款专为软件开发团队设计的内部 HTTPS 管理工具。它旨在解决团队在内网开发环境中，因缺乏便捷的 HTTPS 配置方案而导致的开发效率低下和功能受限问题。通过自动化内部域名解析和自签名 SSL 证书管理，LocalTrust 使得团队成员能够轻松地在本地或内网环境中，以 HTTPS 协议访问各类 Web 应用，从而充分利用现代 Web 特性，并确保开发过程的顺畅与高效。

**产品宣传语**: "LocalTrust: Stop Ignoring SSL Warnings, Start Developing."

## 2. 核心痛点

在现代 Web 开发中，越来越多的浏览器特性（如 Service Workers, Web Push Notifications, Geolocation API 等）以及前端框架（如 React, Vue）的开发服务器都强制要求或强烈推荐使用 HTTPS。然而，在企业内部网络环境中，为开发和测试阶段的 Web 应用配置 HTTPS 常常面临以下挑战：

*   **浏览器安全警告**: 默认情况下，浏览器会拒绝访问自签名证书或 IP 地址直接访问的 HTTPS 站点，导致开发人员频繁点击"继续访问（不安全）"，严重影响开发体验。
*   **域名解析困难**: 团队成员无法通过统一的内部域名（如 `https://my-app.dev.local`）访问内网服务，只能使用 IP 地址，且无法享受 HTTPS 的便利。
*   **证书管理复杂**: 手动为每个内部应用生成和分发自签名证书，并让所有团队成员的设备信任这些证书，是一个繁琐且易出错的过程。
*   **路由器配置依赖**: 依赖路由器或 DNS 服务器的手动配置，且不同设备配置方式各异，难以统一管理和自动化。

## 3. 产品价值

LocalTrust 通过提供一个集中化、自动化的解决方案，为开发团队带来以下核心价值：

*   **提升开发效率**: 告别恼人的浏览器安全警告，开发者可以专注于代码编写，无缝测试需要 HTTPS 的 Web 特性。
*   **简化环境配置**: 一次性配置，团队所有成员即可享受统一、可信的内网 HTTPS 开发环境，新成员入职配置成本大幅降低。
*   **保障功能完整性**: 确保所有 Web 应用在开发阶段就能完全模拟生产环境，避免因协议差异导致的功能缺失或潜在问题。
*   **降低运维负担**: 自动化域名解析和证书管理，减少手动干预，降低因配置错误引发的风险。

## 4. 主要功能

LocalTrust 提供以下核心功能模块：

| 功能模块 | 描述 |
|---------|------|
| **内部 CA 证书管理** | 自动生成和管理团队内部的根证书颁发机构（CA），作为所有内部应用证书的信任源。 |
| **自动域名解析** | 内置轻量级 DNS 服务器，支持自定义内部域名（如 `.dev.local`），无需修改路由器或系统 DNS 配置。 |
| **证书自动签发** | 根据配置的域名规则，自动为内部应用签发 SSL 证书，支持通配符域名和多域名证书。 |
| **客户端配置工具** | 提供跨平台（Windows, macOS, Linux）的一键配置脚本，自动安装 CA 根证书并配置 DNS 解析。 |
| **Web 管理界面** | 直观的 Web UI，用于管理域名映射、查看证书状态、监控服务运行情况。 |
| **反向代理支持** | 可选的反向代理功能，统一管理多个内部服务的 HTTPS 访问入口。 |

## 5. 技术架构

### 5.1 系统组件

*   **CA 服务**: 负责生成和管理根 CA 证书及签发子证书。
*   **DNS 服务**: 提供内部域名解析，支持 A 记录、CNAME 记录等。
*   **证书管理服务**: 自动化证书生命周期管理，包括签发、续期、吊销。
*   **配置管理服务**: 存储和管理域名映射、证书配置等信息。
*   **Web 管理界面**: 基于现代前端框架的管理控制台。
*   **客户端工具**: 跨平台的命令行工具和安装脚本。

### 5.2 部署模式

*   **单机模式**: 适用于小型团队，所有服务运行在一台服务器上。
*   **分布式模式**: 适用于大型团队，DNS 和证书服务可分离部署，支持高可用。

## 6. 使用场景

### 6.1 前端开发团队

前端开发者在本地开发 React/Vue 应用时，需要测试 Service Worker、PWA 等需要 HTTPS 的特性。通过 LocalTrust，开发者可以使用 `https://my-app.dev.local:3000` 访问本地开发服务器，无需任何浏览器警告。

### 6.2 微服务架构团队

在微服务架构中，多个服务需要通过 HTTPS 相互调用。LocalTrust 可以为每个服务分配独立的内部域名（如 `https://auth-service.dev.local`, `https://api-gateway.dev.local`），并自动管理证书。

### 6.3 测试环境

测试团队需要在内网环境中模拟生产环境的 HTTPS 配置，LocalTrust 可以快速为测试环境的各 HTTPS 访问。

## 7. 快速开始

### 7.1 服务端部署

```bash
# 下载并安装 LocalTrust 服务端
curl -fsSL https://localtrust.dev/install.sh | bash

# 启动服务
localtrust server start

# 访问管理界面
open https://localtrust.admin:8443
```

### 7.2 客户端配置

```bash
# 下载客户端配置工具
curl -fsSL https://localtrust.dev/client-setup.sh | bash

# 运行配置（需要管理员权限）
sudo localtrust-client setup --server https://localtrust.admin:8443
```

### 7.3 添加域名映射

通过 Web 管理界面或命令行添加域名映射：

```bash
# 添加域名映射
localtrust domain add my-app.dev.local --ip 192.168.1.100 --port 3000

# 自动签发证书
localtrust cert issue my-app.dev.local
```

现在可以通过 `https://my-app. 访问你的应用，浏览器不会显示任何安全警告。

## 8. 系统要求

### 8.1 服务端

*   操作系统: Linux (Ubuntu 20.04+, CentOS 8+) 或 macOS
*   内存: 最低 512MB，推荐 1GB+
*   存储: 最低 1GB 可用空间
*   网络: 需要固定内网 IP 地址

### 8.2 客户端

*   操作系统: Windows 10+, macOS 10.15+, Linux (主流发行版)
*   需要管理员/root 权限进行初始配置
*   浏览器: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 9. 安全考虑

*   **内网隔离**: LocalTrust 设计为仅在内网环境使用，不应暴露到公网。
*   **CA 根证书保护**: 根 CA 私钥应妥善保管，建议使用硬件安全模块（HSM）或加密存储。
*   **访问控制**: Web 管理界面应配置强密码或集成企业 SSO 认证。
*   **证书有效期**: 建议设置较短的证书有效期（如 90 天），并启用自动续期。
*   **审计日志**: 记录所有证书签发、域名变更等操作，便于安全审计。

## 10. 与现有方案对比

| 特性 | LocalTrust | mkcert | 手动配置 | 商业 CA |
|-----|-----------|--------|---------|---------|
| 自动域名解析 | ✅ | ❌ | ❌ | ❌ |
| 团队统一管理 | ✅ | ❌ | ❌ | ✅ |
| 零浏览器警告 | ✅ | ✅ | ❌ | ✅ |
| 内网专用 | ✅ | ✅ | ✅ | ❌ |
| 自动化程度 | 高 | 中 | 低 | 高 |
| 成本 | 免费 | 免费 | 免费 | 付费 |

## 11. 路线图

### v1.0 (当前版本)
- [x] 基础 CA 证书管理
- [x] DNS 服务 Web 管理界面
- [x] 跨平台客户端工具

### v1.1 (计划中)
- [ ] 证书自动续期
- [ ] ACME 协议支持
- [ ] 多租户支持
- [ ] API 接口

### v2.0 (未来)
- [ ] 集成企业 LDAP/AD
- [ ] 高可用集群部署
- [ ] 证书透明度日志
- [ ] Kubernetes 集成

## 12. 社区与支持

*   **官方网站**: https://localtrust.dev
*   **文档**: https://docs.localtrust.dev
*   **GitHub**: https://github.com/localtrust/localtrust
*   **问题反馈**: https://github.com/localtrust/localtrust/issues
*   **社区论坛**: https://community.localtrust.dev

## 13. 许可证

LocalTrust 采用 MIT 许可证开源，允许商业和非商业使用。

---

**LocalTrust: Stop Ignoring SSL Warnings, Start Developing.**
