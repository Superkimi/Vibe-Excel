import { expect, test } from "@playwright/test";

test("loads the real spreadsheet studio and opens supporting tools", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByLabel("工作簿名称")).toHaveValue("年度预算模型");
  await expect(page.getByText("Vibe AI", { exact: true })).toBeVisible();
  await expect(page.getByTestId("spreadsheet-editor")).toBeVisible();
  await expect(page.getByText("年度预算", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "预览" }).click();
  await expect(page.getByText("年度预算 的交付预览")).toBeVisible();
  await page.getByRole("button", { name: "关闭预览" }).click();

  await page.getByRole("button", { name: "图表" }).click();
  await expect(page.getByTestId("chart-dialog")).toBeVisible();
  await expect(page.getByText("实时预览", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "保存图表" }).click();
  await expect(page.getByText("1 个图表", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭图表工作台" }).click();

  await page.getByRole("button", { name: "Schema 代码" }).click();
  await expect(page.getByRole("dialog", { name: "工作簿 Schema" })).toBeVisible();
  await expect(page.getByText(/"format": "vibe-excel\/1"/)).toBeVisible();
});

test("marketing page uses a live product preview and reaches the studio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /把一句需求/ })).toBeVisible();
  await expect(page.locator("iframe[title='Vibe Excel 实时工作台']")).toBeVisible();
  await page.getByRole("link", { name: "开始建模" }).click();
  await expect(page).toHaveURL(/\/studio$/);
});

test("studio switches its interface between Chinese and English", async ({ page }) => {
  await page.goto("/studio");
  await page.getByTestId("locale-en").click();

  await expect(page.getByLabel("Workbook name")).toHaveValue("年度预算模型");
  await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
  await expect(page.getByText("What should this sheet become?", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.getByTestId("locale-zh").click();
  await expect(page.getByRole("button", { name: "预览" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});
