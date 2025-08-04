
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center h-12 w-12 bg-primary/10 text-primary rounded-full", className)}>
      <Zap className="h-6 w-6" />
    </div>
  );
}
