export default function PageFeedback({ children, variant = "info", panel = false }) {
  const role = variant === "error" ? "alert" : "status";
  const className = ["page-feedback", variant, panel ? "panel" : ""].filter(Boolean).join(" ");

  return (
    <div className={className} role={role} aria-live="polite">
      {children}
    </div>
  );
}
