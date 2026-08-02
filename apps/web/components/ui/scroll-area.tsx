import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ScrollArea };
