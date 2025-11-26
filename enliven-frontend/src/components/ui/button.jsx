import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils";
import { buttonVariants } from "./buttonVariants";

function Button({ className, variant = "default", size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        className // <-- your custom classes now override defaults
      )}
      {...props}
    />
  );
}

export { Button };
