"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

type CopyAddressProps = {
  address: string;
  chars?: number;
  className?: string;
};

/** Shortened address that copies the full value on click. */
export function CopyAddress({ address, chars = 4, className }: CopyAddressProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the address and copy it manually.");
    }
  };

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy address ${address}`}
      title={address}
      className={cn(
        "group inline-flex min-h-6 items-center gap-1.5 rounded-md font-mono text-sm text-foreground/90 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      )}
    >
      {shortenAddress(address, chars)}
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 text-muted-foreground transition-colors group-hover:text-primary",
          copied && "text-primary"
        )}
      />
    </button>
  );
}
