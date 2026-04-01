import type { ReactNode } from "react";

type SummarySectionProps = {
  title: string;
  children: ReactNode;
  tone?: "default" | "soft";
};

function getToneClasses(tone: "default" | "soft"): string {
  if (tone === "soft") {
    return "rounded-2xl bg-[#f2e9da]/75 p-3";
  }

  return "rounded-2xl bg-gradient-to-b from-[#faf5f0]/80 to-[#f5f1e8]/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_12px_-4px_rgba(98,75,55,0.08)]";
}

function getTitleClasses(tone: "default" | "soft"): string {
  if (tone === "soft") {
    return "ui-section-title text-stone-600";
  }

  return "ui-section-title";
}

export function SummarySection({ title, children, tone = "default" }: SummarySectionProps) {
  return (
    <section className={`${getToneClasses(tone)} ui-section`}>
      <p className={getTitleClasses(tone)}>{title}</p>
      {children}
    </section>
  );
}
