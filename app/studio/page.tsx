import type { Metadata } from "next";
import { StudioI18nProvider } from "@/components/studio/StudioI18n";
import { StudioShell } from "@/components/studio/StudioShell";

export const metadata: Metadata = {
  title: "工作台",
};

export default function StudioPage() {
  return (
    <StudioI18nProvider>
      <StudioShell />
    </StudioI18nProvider>
  );
}
