import React from "react";

export function Spinner({ size = 16, className = "" }) {
  return (
    <span
      className={`btn-spinner ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export default Spinner;
