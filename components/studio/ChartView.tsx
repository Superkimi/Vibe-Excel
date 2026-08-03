"use client";

import { buildChartModel, type ChartModel, type CategoryChartModel, type CorrelationChartModel, type HistogramChartModel, type ScatterChartModel } from "@/lib/chart-data";
import { useStudioI18n } from "@/components/studio/StudioI18n";
import type { WorkbookChart, WorkbookSheet } from "@/lib/workbook-schema";

const COLORS = ["#6650a4", "#b06b9d", "#d78d69", "#5c8db8", "#4b9d87", "#b08b55", "#8a78be", "#ce6179"];
const VIEWBOX_WIDTH = 760;
const VIEWBOX_HEIGHT = 390;
const PLOT = { left: 58, top: 24, width: 670, height: 286 };

interface ChartViewProps {
  sheet: WorkbookSheet | undefined;
  chart: WorkbookChart;
  compact?: boolean;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  return Number(value.toFixed(2)).toString();
}

function yTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  return Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4).reverse();
}

function scale(value: number, min: number, max: number): number {
  if (max === min) return PLOT.top + PLOT.height / 2;
  return PLOT.top + PLOT.height - ((value - min) / (max - min)) * PLOT.height;
}

function xLabel(label: string, index: number, total: number): boolean {
  if (total <= 8) return true;
  const step = Math.ceil(total / 8);
  return index % step === 0 || index === total - 1;
}

function ChartGrid({ min, max }: Readonly<{ min: number; max: number }>) {
  return (
    <>
      {yTicks(min, max).map((tick) => {
        const y = scale(tick, min, max);
        return <g key={`tick-${tick}`}><line x1={PLOT.left} x2={PLOT.left + PLOT.width} y1={y} y2={y} className="chart-grid-line" /><text x={PLOT.left - 10} y={y + 4} textAnchor="end" className="chart-axis-label">{formatNumber(tick)}</text></g>;
      })}
      <line x1={PLOT.left} x2={PLOT.left} y1={PLOT.top} y2={PLOT.top + PLOT.height} className="chart-axis-line" />
      <line x1={PLOT.left} x2={PLOT.left + PLOT.width} y1={PLOT.top + PLOT.height} y2={PLOT.top + PLOT.height} className="chart-axis-line" />
    </>
  );
}

function Legend({ series }: Readonly<{ series: Array<{ key: string; label: string }> }>) {
  return (
    <g className="chart-legend" transform={`translate(${PLOT.left}, ${VIEWBOX_HEIGHT - 34})`}>
      {series.map((item, index) => (
        <g key={item.key} transform={`translate(${index * 122}, 0)`}>
          <rect width="10" height="10" rx="3" fill={COLORS[index % COLORS.length]} />
          <text x="16" y="9">{item.label}</text>
        </g>
      ))}
    </g>
  );
}

function CategoryChart({ model }: Readonly<{ model: CategoryChartModel }>) {
  const values = model.series.flatMap((series) => series.values);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const zeroY = scale(0, min, max);
  const groupWidth = model.labels.length ? PLOT.width / model.labels.length : PLOT.width;
  const itemWidth = Math.max(4, groupWidth / Math.max(1, model.series.length) * 0.72);
  return (
    <>
      <ChartGrid min={min} max={max} />
      {model.labels.map((label, labelIndex) => (
        <g key={`${label}-${labelIndex}`}>
          {model.series.map((series, seriesIndex) => {
            const value = series.values[labelIndex] ?? 0;
            const y = scale(Math.max(0, value), min, max);
            const height = Math.abs(scale(value, min, max) - zeroY);
            const x = PLOT.left + labelIndex * groupWidth + (groupWidth - itemWidth * model.series.length) / 2 + seriesIndex * itemWidth;
            return model.type === "bar" ? <rect key={series.key} x={x} y={Math.min(y, zeroY)} width={itemWidth - 3} height={Math.max(1, height)} rx="3" fill={COLORS[seriesIndex % COLORS.length]} opacity="0.9"><title>{`${series.label}: ${formatNumber(value)}`}</title></rect> : null;
          })}
          {model.type === "line" && model.series.map((series, seriesIndex) => {
            const value = series.values[labelIndex] ?? 0;
            const x = PLOT.left + labelIndex * groupWidth + groupWidth / 2;
            const y = scale(value, min, max);
            return <circle key={`${series.key}-${labelIndex}`} cx={x} cy={y} r="4" fill={COLORS[seriesIndex % COLORS.length]}><title>{`${series.label}: ${formatNumber(value)}`}</title></circle>;
          })}
          {xLabel(label, labelIndex, model.labels.length) && <text x={PLOT.left + labelIndex * groupWidth + groupWidth / 2} y={PLOT.top + PLOT.height + 22} textAnchor="middle" className="chart-axis-label">{label.length > 16 ? `${label.slice(0, 15)}…` : label}</text>}
        </g>
      ))}
      {model.type === "line" && model.series.map((series, seriesIndex) => {
        const points = series.values.map((value, index) => `${PLOT.left + index * groupWidth + groupWidth / 2},${scale(value, min, max)}`).join(" ");
        return <polyline key={series.key} points={points} fill="none" stroke={COLORS[seriesIndex % COLORS.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
      })}
      {model.series.length > 0 && <Legend series={model.series} />}
    </>
  );
}

function ScatterChart({ model }: Readonly<{ model: ScatterChartModel }>) {
  const xValues = model.points.map((point) => point.x);
  const yValues = model.points.map((point) => point.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xScale = (value: number) => xMax === xMin ? PLOT.left + PLOT.width / 2 : PLOT.left + ((value - xMin) / (xMax - xMin)) * PLOT.width;
  return (
    <>
      <ChartGrid min={yMin} max={yMax} />
      {model.points.map((point) => <circle key={`${point.row}-${point.x}-${point.y}`} cx={xScale(point.x)} cy={scale(point.y, yMin, yMax)} r="5" fill="#6650a4" opacity="0.78"><title>{`${point.label}: ${formatNumber(point.x)}, ${formatNumber(point.y)}`}</title></circle>)}
      <text x={PLOT.left + PLOT.width / 2} y={PLOT.top + PLOT.height + 42} textAnchor="middle" className="chart-axis-label">{model.xLabel}</text>
      <text x="14" y={PLOT.top + PLOT.height / 2} textAnchor="middle" className="chart-axis-label" transform={`rotate(-90 14 ${PLOT.top + PLOT.height / 2})`}>{model.yLabel}</text>
    </>
  );
}

function HistogramChart({ model }: Readonly<{ model: HistogramChartModel }>) {
  const max = Math.max(1, ...model.bins.map((bin) => bin.count));
  const groupWidth = model.bins.length ? PLOT.width / model.bins.length : PLOT.width;
  return (
    <>
      <ChartGrid min={0} max={max} />
      {model.bins.map((bin, index) => {
        const height = PLOT.top + PLOT.height - scale(bin.count, 0, max);
        return <g key={`${bin.label}-${index}`}><rect x={PLOT.left + index * groupWidth + 3} y={scale(bin.count, 0, max)} width={Math.max(4, groupWidth - 6)} height={Math.max(1, height)} rx="3" fill="#6650a4" opacity="0.88"><title>{`${bin.label}: ${bin.count}`}</title></rect>{xLabel(bin.label, index, model.bins.length) && <text x={PLOT.left + index * groupWidth + groupWidth / 2} y={PLOT.top + PLOT.height + 22} textAnchor="middle" className="chart-axis-label">{bin.label.length > 14 ? `${bin.label.slice(0, 13)}…` : bin.label}</text>}</g>;
      })}
      <text x={PLOT.left + PLOT.width / 2} y={PLOT.top + PLOT.height + 42} textAnchor="middle" className="chart-axis-label">{model.valueLabel}</text>
    </>
  );
}

function CorrelationChart({ model }: Readonly<{ model: CorrelationChartModel }>) {
  const size = Math.min(280, model.labels.length ? PLOT.height / model.labels.length : PLOT.height);
  const left = PLOT.left + Math.max(0, (PLOT.width - size * model.labels.length) / 2);
  const colorFor = (value: number) => value >= 0 ? `rgba(102, 80, 164, ${0.12 + Math.abs(value) * 0.78})` : `rgba(168, 69, 91, ${0.12 + Math.abs(value) * 0.78})`;
  return (
    <g>
      {model.labels.map((label, index) => <text key={`row-${label}`} x={left - 8} y={PLOT.top + index * size + size / 2 + 4} textAnchor="end" className="chart-axis-label">{label.length > 14 ? `${label.slice(0, 13)}…` : label}</text>)}
      {model.labels.map((label, index) => <text key={`column-${label}`} x={left + index * size + size / 2} y={PLOT.top - 8} textAnchor="middle" className="chart-axis-label">{label.length > 12 ? `${label.slice(0, 11)}…` : label}</text>)}
      {model.matrix.flatMap((row, rowIndex) => row.map((value, columnIndex) => <g key={`${rowIndex}-${columnIndex}`}><rect x={left + columnIndex * size} y={PLOT.top + rowIndex * size} width={size - 2} height={size - 2} rx="4" fill={colorFor(value)}><title>{`${model.labels[rowIndex]} × ${model.labels[columnIndex]}: ${value.toFixed(2)}`}</title></rect><text x={left + columnIndex * size + size / 2} y={PLOT.top + rowIndex * size + size / 2 + 4} textAnchor="middle" className="chart-correlation-label">{value.toFixed(2)}</text></g>))}
    </g>
  );
}

function renderModel(model: ChartModel) {
  if (model.type === "bar" || model.type === "line") return <CategoryChart model={model} />;
  if (model.type === "scatter") return <ScatterChart model={model} />;
  if (model.type === "histogram") return <HistogramChart model={model} />;
  return <CorrelationChart model={model as CorrelationChartModel} />;
}

export function ChartView({ sheet, chart, compact = false }: ChartViewProps) {
  const { t } = useStudioI18n();
  const model = buildChartModel(sheet, chart);
  return (
    <section className={`chart-view ${compact ? "compact" : ""}`} aria-label={chart.title}>
      <div className="chart-view-heading"><div><strong>{chart.title}</strong><small>{t(`chart.${chart.type}` as "chart.bar")}</small></div><span>{model.empty ? t("chart.noData") : t("chart.localData")}</span></div>
      {model.empty ? <div className="chart-empty">{t("chart.noDataDescription")}</div> : <svg className="chart-svg" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="img" aria-label={chart.title}>{renderModel(model)}</svg>}
    </section>
  );
}
