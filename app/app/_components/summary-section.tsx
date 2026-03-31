import type { ReactNode } from "react";

type SummarySectionProps = {
  title: string;
  children: ReactNode;
  tone?: "default" | "soft";
};

function getToneClasses(tone: "default" | "soft"): string {
  if (tone === "soft") {
    return "rounded-2xl bg-gradient-to-b from-[#f5ede3]/60 to-[#ede3d6]/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]";
  }

  return "ui-card";
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


