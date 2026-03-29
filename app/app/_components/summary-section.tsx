import type { ReactNode } from "react";

type SummarySectionProps = {
  title: string;
  children: ReactNode;
};

export function SummarySection({ title, children }: SummarySectionProps) {
  return (
    <section className="ui-card ui-section">
      <p className="ui-section-title">{title}</p>
      {children}
    </section>
  );
}


