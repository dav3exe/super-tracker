"use client";

import { Loader2, Search, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToken } from "@/context/token-context";
import { useActiveToken } from "@/hooks/use-token-overview";
import { getMintAddressError } from "@/lib/token-validation";
import { cn } from "@/lib/utils";

export function TokenSearch() {
  const { setTokenAddress } = useToken();
  const { tokenAddress, status, query } = useActiveToken();
  const [value, setValue] = useState("");
  const [formatError, setFormatError] = useState<string | null>(null);
  const inputId = useId();
  const messageId = useId();

  const lookupError =
    status === "invalid"
      ? "No price or liquidity found for this address. It may not be a token, or it isn't trading yet."
      : status === "error"
        ? "Couldn't load this token. Check your connection and try again."
        : null;
  const error = formatError ?? lookupError;
  const isLoading = status === "loading";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const address = value.trim();
    const message = getMintAddressError(address);
    setFormatError(message);
    if (message) return;

    if (address === tokenAddress && status === "error") {
      void query.refetch();
      return;
    }
    setTokenAddress(address);
  };

  const handleClear = () => {
    setValue("");
    setFormatError(null);
    setTokenAddress("");
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-muted-foreground">
        Token mint address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={inputId}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (formatError) setFormatError(null);
            }}
            placeholder="e.g. DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            className={cn(
              "glass h-12 rounded-xl pr-11 pl-10 font-mono text-sm shadow-none md:text-sm",
              "placeholder:font-sans placeholder:text-muted-foreground/70"
            )}
          />
          {(value || tokenAddress) && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 rounded-xl px-6 text-sm font-semibold sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Analyzing
            </>
          ) : (
            "Analyze token"
          )}
        </Button>
      </div>
      <p
        id={messageId}
        role={error ? "alert" : undefined}
        className={cn("mt-2 min-h-5 text-sm", error ? "text-negative" : "text-muted-foreground")}
      >
        {error ?? (tokenAddress ? null : "Solana tokens only. Paste the mint, not a wallet or pair address.")}
      </p>
    </form>
  );
}
