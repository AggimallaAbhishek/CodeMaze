export default function AuthInputField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  icon,
  error,
  rightAdornment,
  disabled = false
}) {
  const inputClass = ["auth-input-field", error ? "invalid" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="auth-input-group">
      <label className="auth-input-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input-wrap">
        <span className="auth-input-icon" aria-hidden="true">
          {icon}
        </span>
        <input
          id={id}
          className={inputClass}
          value={value}
          onChange={onChange}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {rightAdornment}
      </div>
      <div id={`${id}-error`} className={error ? "auth-input-feedback err" : "auth-input-feedback"}>
        {error ?? ""}
      </div>
    </div>
  );
}
