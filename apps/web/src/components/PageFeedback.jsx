export default function PageFeedback({ children, variant = "info", panel = false }) {
  const role = variant === "error" ? "alert" : "status";
  const liveMode = variant === "error" ? "assertive" : "polite";
  const className = ["page-feedback", variant, panel ? "panel" : ""].filter(Boolean).join(" ");

  return (
    <div className={className} role={role} aria-live={liveMode}>
      {children}
    </div>
  );
}
