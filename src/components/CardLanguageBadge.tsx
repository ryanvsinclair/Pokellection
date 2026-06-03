import { formatCardLanguage } from "@/lib/card-language";
import type { CardLanguage } from "@/types/database";

interface Props {
  language: CardLanguage;
  className?: string;
}

export function CardLanguageBadge({ language, className = "" }: Props) {
  if (language === "english") return null;

  return (
    <span
      className={`inline-flex rounded-full bg-surface-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted ${className}`.trim()}
    >
      {formatCardLanguage(language)}
    </span>
  );
}
