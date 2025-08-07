import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

const LoadingSpinner = ({ size = 24, className = "" }: LoadingSpinnerProps) => {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
};

export default LoadingSpinner;
