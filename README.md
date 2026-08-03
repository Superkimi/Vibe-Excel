# Vibe Excel

Vibe Excel 是一个 Schema 先行、AI 原生的在线电子表格工作台。用户既可以在成熟的 Web 表格编辑器中手工操作，也可以通过右侧对话让 AI 创建或修改工作簿。两种路径最终写入同一个 `vibe-excel/1` 文档模型。

## 能力

- Univer OSS 驱动的表格编辑、公式、格式、冻结、筛选、排序和数据校验
- 工作簿目录、模板、实时保存、预览、撤销与重做
- OpenAI 兼容接口、Anthropic 和 Google Gemini 模型配置
- AI 响应的 Zod/JSON Schema 校验与一次自动修复
- 结构化工作簿操作，可审计、可回滚，不直接让模型操纵 UI
- ExcelJS 驱动的 XLSX 导入和导出
- JSON Schema 查看与下载，代码即模型
- 工作台界面支持中文 / English 切换，语言偏好保存在当前浏览器；Univer 表格菜单同步切换
- 单元测试、API 测试、XLSX 回读测试和 Playwright 端到端测试

## 启动

要求 Node.js 22.18 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:30244](http://localhost:30244)。工作台位于 `/studio`。

部署到子路径时，需要在构建阶段设置路径前缀：

```bash
NEXT_PUBLIC_BASE_PATH=/vibe-excel npm run build
```

完整检查：

```bash
npm run check
npm run test:e2e
```

## AI 配置

在工作台右上角的 Vibe AI 面板打开模型设置，填写服务类型、Base URL、模型名称和 API Key。配置只保存在当前浏览器的 `localStorage`，每次请求通过同源 API 路由转发，服务端不会持久化或返回 Key。

也可以使用服务端环境变量提供默认 Key：

```bash
cp .env.example .env.local
```

## 核心数据流

```text
手工编辑 -> Univer 命令 -> 实时快照 -> vibe-excel/1
                                              |
AI 对话 -> JSON Schema 操作 -> 校验/修复 -> 原子应用
                                              |
                         预览 / JSON / XLSX 导出
```

详细设计见 [架构说明](docs/architecture.md) 和 [技术调研](docs/research.md)。

## 许可证

Vibe Excel 自有代码使用 MIT 许可证。Univer OSS 使用 Apache-2.0，ExcelJS 使用 MIT。项目没有复制或依赖 Handsontable 和 HyperFormula 的生产代码。
