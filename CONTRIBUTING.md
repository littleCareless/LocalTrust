# Contributing to LocalTrust

感谢您对 LocalTrust 项目的兴趣！我们欢迎并感谢社区的贡献。

## 如何贡献

### 报告 Bug

如果您发现了 Bug，请通过 [GitHub Issues](https://github.com/littleCareless/LocalTrust/issues) 报告。在报告之前，请先搜索是否已有相同的问题。

报告 Bug 时，请包含以下信息：
- 清晰的 Bug 描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（操作系统、Node.js 版本等）
- 截图或日志（如果有）

### 提出新功能建议

我们欢迎新功能建议！请通过 [GitHub Issues](https://github.com/littleCareless/LocalTrust/issues) 提出，使用 "Feature Request" 标签。

建议内容应包括：
- 清晰的功能描述
- 使用场景
- 可能的实现方案
- 是否有类似功能存在

### 提交 Pull Request

1. **Fork 本仓库**
   ```bash
   # 点击 GitHub 上的 Fork 按钮
   ```

2. **克隆您的 Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/LocalTrust.git
   cd LocalTrust
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或修复 bug
   git checkout -b fix/fix-description
   ```

4. **安装依赖**
   ```bash
   pnpm install
   ```

5. **进行开发**
   - 遵循项目的代码风格
   - 添加必要的测试
   - 确保所有测试通过

6. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   # 使用 Conventional Commits 格式
   ```

7. **推送您的分支**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **创建 Pull Request**
   - 转到原始仓库
   - 点击 "Compare & pull request"
   - 填写 PR 模板
   - 提交

## 代码风格

### Conventional Commits

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 仅文档更改
- `style`: 不影响代码含义的更改（空格、格式等）
- `refactor`: 重构代码
- `perf`: 性能优化
- `test`: 添加缺失的测试
- `chore`: 构建过程或辅助工具的更改

### 代码格式

```bash
# 检查代码格式
pnpm format

# 自动格式化
pnpm format:write
```

### TypeScript 规范

- 遵循严格的 TypeScript 类型检查
- 避免使用 `any` 类型
- 为公共 API 添加类型注解
- 使用 ESLint 规则

### 提交前检查

```bash
# 运行所有检查
pnpm run lint
pnpm run build
pnpm run test
```

## 开发环境设置

### 前置条件

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 初始化

```bash
# 克隆仓库
git clone https://github.com/littleCareless/LocalTrust.git
cd LocalTrust

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

### 项目结构

```
LocalTrust/
├── apps/
│   ├── server/      # 后端服务 (Fastify + TypeScript)
│   └── web/         # 前端应用 (Vue 3 + TypeScript)
├── packages/
│   ├── types/       # 共享类型定义
│   └── ui/          # 共享 UI 组件
└── ...
```

## 测试

### 运行测试

```bash
# 运行所有测试
pnpm run test

# 运行特定包的测试
pnpm --filter @localtrust/server run test
pnpm --filter web run test
```

### 编写测试

- 后端服务使用 Vitest
- 组件使用 Vue Test Utils
- 遵循 Arrange-Act-Assert 模式

## 文档

- API 文档应使用 TSDoc 注释
- README 应保持更新
- 复杂逻辑需要注释说明

## 行为准则

请阅读我们的 [Code of Conduct](CODE_OF_CONDUCT.md)，我们期望所有贡献者都能遵守。

## 许可证

通过贡献代码，您同意您的贡献将在 [MIT License](LICENSE) 下授权。

## 联系方式

- GitHub Discussions: https://github.com/littleCareless/LocalTrust/discussions
- 问题反馈: https://github.com/littleCareless/LocalTrust/issues

感谢您的贡献！ 🎉
