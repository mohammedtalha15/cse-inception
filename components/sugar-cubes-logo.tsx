type SugarCubesLogoProps = {
  className?: string;
  title?: string;
};

export function SugarCubesLogo({ className = "h-4 w-4", title = "Sugarfree logo" }: SugarCubesLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label={title}
      role="img"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2.5" y="8.5" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14.5" y="8.5" width="7" height="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

