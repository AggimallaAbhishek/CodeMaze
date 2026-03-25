export default function AuthSubmitButton({ loading, text, loadingText, disabled = false }) {
  return (
    <button type="submit" className={loading ? "auth-submit-btn loading" : "auth-submit-btn"} disabled={disabled || loading}>
      <span className="auth-submit-text">{loading ? loadingText : text}</span>
      <span className="auth-submit-loader" aria-hidden="true">
        <span className="auth-loader-dot" />
        <span className="auth-loader-dot" />
        <span className="auth-loader-dot" />
      </span>
    </button>
  );
}
