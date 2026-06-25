import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground/80">{hint}</p> : null}
    </div>
  );
}
