interface RequiredAsteriskProps {
  className?: string;
}

export default function RequiredAsterisk({ className = '' }: RequiredAsteriskProps) {
  return <span className={`required-asterisk ${className}`}>*</span>;
}
