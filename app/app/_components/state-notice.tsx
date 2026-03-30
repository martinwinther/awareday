type StateNoticeVariant = "loading" | "empty" | "error";

type StateNoticeProps = {
  variant: StateNoticeVariant;
  title: string;
  description?: string;
};

function getNoticeStyles(variant: StateNoticeVariant): string {
  if (variant === "error") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (variant === "loading") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-slate-200 bg-white text-slate-700";
}

export function StateNotice({ variant, title, description }: StateNoticeProps) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${getNoticeStyles(variant)}`} role={variant === "error" ? "alert" : "status"}>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-xs opacity-90">{description}</p> : null}
    </div>
  );
}

