type StateNoticeVariant = "loading" | "empty" | "error";

type StateNoticeProps = {
  variant: StateNoticeVariant;
  title: string;
  description?: string;
};

function getNoticeStyles(variant: StateNoticeVariant): string {
  if (variant === "error") {
    return "border-rose-200/90 bg-rose-50/90 text-rose-800";
  }

  if (variant === "loading") {
    return "border-amber-200/90 bg-[#fff6e8] text-stone-700";
  }

  return "border-amber-200/90 bg-[#fffaf3] text-stone-700";
}

export function StateNotice({ variant, title, description }: StateNoticeProps) {
  return (
    <div
      className={`rounded-2xl border px-3.5 py-2.5 ${getNoticeStyles(variant)}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <p className="text-sm font-medium leading-snug">{title}</p>
      {description ? <p className="mt-1 text-xs leading-relaxed opacity-90">{description}</p> : null}
    </div>
  );
}

