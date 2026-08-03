import Link from "next/link";
import {
  ArrowRight,
  BracketsCurly,
  ChartBar,
  ChatCircleDots,
  CheckCircle,
  DownloadSimple,
  Function,
  GridFour,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";

const capabilities = [
  { icon: ChatCircleDots, title: "聊出模型", text: "从目标和假设出发，生成结构、公式与格式。" },
  { icon: GridFour, title: "继续手工编辑", text: "保留完整表格体验，AI 不会拿走控制权。" },
  { icon: BracketsCurly, title: "Schema 即模型", text: "每次改动先校验，失败不会污染现有工作簿。" },
  { icon: ChartBar, title: "数据变成图表", text: "从字段类型推断柱状、折线、散点、分布和相关关系。" },
];

export default function HomePage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <main className="marketing-page">
      <nav className="marketing-nav" aria-label="主导航">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark"><Function weight="bold" /></span>
          <b>Vibe Excel</b>
        </Link>
        <div className="marketing-links">
          <a href="#workflow">工作方式</a>
          <a href="#quality">模型质量</a>
          <a href="#capabilities">能力</a>
        </div>
        <Link href="/studio" className="button button-primary">打开工作台 <ArrowRight /></Link>
      </nav>

      <section className="marketing-hero">
        <div className="marketing-copy">
          <span className="eyebrow"><Sparkle weight="fill" /> AI-NATIVE SPREADSHEETS</span>
          <h1>把一句需求，<br />变成可用模型。</h1>
          <p>对话生成结构、公式和格式，再像 Excel 一样精修并导出。</p>
          <div className="hero-actions">
            <Link href="/studio" className="button button-primary button-large">开始建模 <ArrowRight /></Link>
            <a href="#workflow" className="button button-secondary button-large">了解工作方式</a>
          </div>
        </div>
        <div className="live-product-frame" aria-label="Vibe Excel 工作台实时预览">
          <div className="live-frame-bar">
            <span className="brand-mark small"><Function weight="bold" /></span>
            <b>预算模型.xlsx</b>
            <i>已保存</i>
          </div>
          <iframe src={`${basePath}/studio?embed=1`} title="Vibe Excel 实时工作台" tabIndex={-1} />
        </div>
      </section>

      <section className="trust-strip" aria-label="产品原则">
        <span><ShieldCheck weight="fill" /> 本地保存密钥</span>
        <span><CheckCircle weight="fill" /> 操作级校验</span>
        <span><Function weight="bold" /> Excel 兼容公式</span>
        <span><DownloadSimple weight="fill" /> 原生 XLSX 导出</span>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="workflow-visual">
          <div className="sheet-stack" aria-hidden="true">
            <div className="sheet-plane plane-back" />
            <div className="sheet-plane plane-middle" />
            <div className="sheet-plane plane-front">
              <div className="mini-grid">
                {Array.from({ length: 35 }).map((_, index) => <span key={index} className={index < 5 ? "mini-head" : index === 18 || index === 23 ? "mini-total" : ""} />)}
              </div>
            </div>
            <div className="operation-chip chip-one">set_cells</div>
            <div className="operation-chip chip-two">formula check</div>
          </div>
        </div>
        <div className="workflow-copy">
          <h2>先把意图变成操作。</h2>
          <p>AI 不直接操纵画布。它先提交一组明确、可校验、可撤销的工作簿操作。</p>
          <div className="workflow-points">
            <article><b>理解当前模型</b><span>读取工作表、单元格、公式、格式和尺寸。</span></article>
            <article><b>生成最小修改</b><span>只改请求涉及的范围，保留稳定 ID 和无关内容。</span></article>
            <article><b>复核后写入</b><span>验证边界、公式和 Schema，再刷新真实编辑器。</span></article>
          </div>
        </div>
      </section>

      <section className="quality-section" id="quality">
        <div className="quality-copy">
          <h2>代码不是旁白。它就是模型。</h2>
          <p>工作簿以 `vibe-excel/1` 文档存在。你看到的表格、AI 修改和最终 XLSX 都从同一份结构生成。</p>
          <ul>
            <li><CheckCircle weight="fill" /> 派生值优先使用公式</li>
            <li><CheckCircle weight="fill" /> 标题、单位与数字格式一致</li>
            <li><CheckCircle weight="fill" /> 错误响应自动进入修复轮次</li>
          </ul>
        </div>
        <div className="schema-window" aria-label="Vibe Excel 操作 Schema 示例">
          <header><span>operation.json</span><i>validated</i></header>
          <pre>{`{
  "op": "set_cells",
  "sheetId": "budget",
  "cells": {
    "F7": {
      "value": null,
      "formula": "=SUM(F2:F3)-F5",
      "type": "number",
      "numberFormat": "¥#,##0",
      "style": { "bold": true }
    }
  }
}`}</pre>
        </div>
      </section>

      <section className="capabilities-section" id="capabilities">
        <h2>从空白网格，到可交付文件。</h2>
        <div className="capability-grid">
          {capabilities.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className={`capability capability-${index + 1}`}>
              <Icon />
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-section">
        <div>
          <Function weight="bold" />
          <h2>下一张表，从问题开始。</h2>
          <p>选择模板，或直接告诉 Vibe AI 你要做什么。</p>
        </div>
        <Link href="/studio" className="button button-primary button-large">打开工作台 <ArrowRight /></Link>
      </section>

      <footer className="marketing-footer">
        <Link href="/" className="brand-lockup"><span className="brand-mark"><Function weight="bold" /></span><b>Vibe Excel</b></Link>
        <p>由 aihubhub 打造。让表格从计算工具变成思考模型。</p>
        <a href="https://github.com/Superkimi/Vibe-Excel" target="_blank" rel="noreferrer">GitHub</a>
      </footer>
    </main>
  );
}
