# 技术调研与选型

## Handsontable

研究范围包括核心数据映射、选择模型、插件边界、框架包装、视觉回归和端到端测试组织。值得吸收的部分是：

- 数据、视图、选择和插件职责分离
- 所有用户修改经过统一钩子和命令路径
- 复杂表格功能按插件注册
- 大量浏览器视觉测试和性能场景

Handsontable 当前采用商业/非商业双许可，非商业许可还限制竞争性产品用途。它适合作为交互和工程参考，不适合直接成为本产品的商业内核。HyperFormula 使用 GPLv3 或商业许可，也没有进入依赖树。

## Univer

Univer OSS 采用 Apache-2.0，提供核心工作簿、公式、格式、筛选、排序、数据校验、条件格式和 Facade API。命令与快照模型非常适合接入 AI 操作层。官方导入导出属于 Pro 范围，因此 Vibe Excel 使用 ExcelJS 实现独立的 XLSX 边界。

## Luckysheet 与 FortuneSheet

Luckysheet 已停止维护，并建议生产项目迁移到 Univer。FortuneSheet 提供 React 组件和 MIT 许可，但公开问题仍包含大数据粘贴、格式计算、公式与键盘可访问性缺陷。它适合轻量嵌入，不作为本产品的长期核心。

## ONLYOFFICE

ONLYOFFICE 的 OOXML 兼容性和协作能力强，但嵌入部署、品牌和许可边界更复杂，需要额外文档服务。对于本地优先、Schema 驱动的独立产品，运行和许可成本过高。

## 最终取舍

| 维度 | 选择 |
| --- | --- |
| 编辑体验 | Univer OSS |
| 工作簿主模型 | 自有 `vibe-excel/1` Schema |
| AI 修改 | 受限操作 + 校验 + 自动修复 |
| XLSX 边界 | ExcelJS |
| 模型协议 | OpenAI-compatible、Anthropic、Google |
| 持久化 | 浏览器 localStorage，预留服务端存储接口 |
| 协作 | 当前不实现，后续可接 CRDT 或 Univer Pro |

参考资料：

- [Handsontable repository](https://github.com/handsontable/handsontable)
- [Handsontable license](https://handsontable.com/docs/javascript-data-grid/software-license/)
- [Univer repository](https://github.com/dream-num/univer)
- [Univer Sheets core](https://docs.univer.ai/guides/sheets/features/core)
- [FortuneSheet repository](https://github.com/ruilisi/fortune-sheet)
- [ONLYOFFICE Spreadsheet API](https://api.onlyoffice.com/docs/office-api/usage-api/spreadsheet-api/)
