import type { Metadata } from "next";
import { StudioShell } from "@/components/studio/StudioShell";

export const metadata: Metadata = {
  title: "工作台",
};

export default function StudioPage() {
  return <StudioShell />;
}
