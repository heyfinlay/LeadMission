import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const UnderlitButton = ({ className, ...props }: ButtonProps) => (
  <Button
    className={cn(
      "relative overflow-hidden before:absolute before:inset-x-2 before:bottom-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-cyan-300/70 before:to-transparent",
      className,
    )}
    {...props}
  />
);
