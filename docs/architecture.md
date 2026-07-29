# 架构说明

## 为什么采用 Schema 先行

表格 AI 最危险的失败不是回答不好，而是把局部错误直接写进用户模型。Vibe Excel 将工作簿表示为版本化 `vibe-excel/1` 文档，AI 只能提交受限操作：

- `set_cells`、`clear_range`、`patch_range`
- 工作表增加、删除和重命名
- 行列尺寸、冻结和合并
- 主题与标题
- 明确请求时才允许 `replace_workbook`

操作先通过 Zod 与 JSON Schema 校验，再在内存副本上应用，最后做工作表唯一性、活动表存在性和单元格边界检查。任意一步失败，原文档保持不变。

## 编辑器同步

Univer 是视图和手工编辑命令层。初始化时，`workbookToUniverSnapshot` 把 Vibe Schema 转为 Univer `IWorkbookData`。用户操作后，`CommandExecuted` 事件经过防抖调用实时 `save()`，再由 `mergeUniverSnapshotIntoWorkbook` 同步回 Vibe Schema。

AI 或模板修改属于外部事务。应用成功后重新创建编辑器实例，并保留独立的文档级历史。编辑器内部仍负责连续手工操作的原生撤销与重做。

## 模型适配

`/api/ai` 支持三种协议：

- OpenAI-compatible Chat Completions
- Anthropic Messages
- Google Gemini `generateContent`

系统提示包含完整响应 JSON Schema 和建模质量规则。首轮响应无法通过 Schema 时，服务端最多发起一次带验证错误的修复请求。两轮都失败时返回错误，工作簿不发生变化。

## Excel 导入导出

ExcelJS 负责 OOXML 边界。导出保留：

- 值和公式
- 数字格式
- 字体、颜色、填充、对齐和边框
- 列宽、行高、隐藏状态
- 合并与冻结窗格

导入将这些结构映射回 Vibe Schema。暂不承诺无损保留宏、数据透视表、外部连接、嵌入对象和所有 Excel 专有条件格式。

## 安全边界

- API Key 只保存在浏览器或服务端环境变量
- 请求限制为 2 MB，提示限制为 12,000 字符
- 工作簿上下文最多发送 4,000 个有效单元格
- 模型超时 60 秒
- 不记录请求体、工作簿内容或 Key
- 外部错误消息在返回前截断
