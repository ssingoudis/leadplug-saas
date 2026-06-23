import { ChevronLeft } from "lucide-react";

// Quadratischer Tinted-Brand-Zurück-Button, links neben dem OK-Button.
export function BackButton({
  onClick,
  theme,
  editMode,
}: {
  onClick: () => void;
  theme: { primaryColor: string; tintColor: string; tintColorHover: string; borderRadius: string };
  editMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={editMode}
      aria-label="Zurück zur vorherigen Frage"
      title="Zurück"
      className="inline-flex h-9 w-9 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        backgroundColor: theme.tintColor,
        color: theme.primaryColor,
        borderRadius: theme.borderRadius,
      }}
      onMouseEnter={(e) => {
        if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = theme.tintColorHover;
      }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = theme.tintColor; }}
    >
      <ChevronLeft size={16} strokeWidth={2.5} />
    </button>
  );
}
