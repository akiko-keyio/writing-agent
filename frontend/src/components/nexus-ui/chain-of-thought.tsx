"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChromeInlineScroll } from "@/components/chrome-scroll-area";
import { TextShimmer } from "@/components/nexus-ui/text-shimmer";
import { useOnChange } from "@/hooks/use-on-change";
import { chatReasoningScrollMaxHeight } from "@/lib/chat/streamdown";
import { chatProcessStepTitleClass } from "@/lib/chat/typography";
import { gap, p, stack } from "@/lib/shell/spacing";
import { cn } from "@/lib/shared/utils";

const processStepTitleTextClass =
  "truncate text-left text-ellipsis whitespace-nowrap";

function ProcessStepTitleLabel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (active) {
    return (
      <TextShimmer
        className={processStepTitleTextClass}
        spread={10}
        invertLight
      >
        {children}
      </TextShimmer>
    );
  }
  return (
    <span className={processStepTitleTextClass}>{children}</span>
  );
}

type ChainOfThoughtRootContextValue = {
  registerStep: (id: string, status: ChainOfThoughtStepStatus) => void;
  allStepsComplete: boolean;
  hasAnyError: boolean;
};

const ChainOfThoughtRootContext =
  React.createContext<ChainOfThoughtRootContextValue | null>(null);

function useChainOfThoughtRootContext(component: string) {
  const ctx = React.useContext(ChainOfThoughtRootContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <ChainOfThought>`);
  }
  return ctx;
}

type ChainOfThoughtStepContextValue = {
  status: ChainOfThoughtStepStatus;
  hasContent: boolean;
};

const ChainOfThoughtStepContext =
  React.createContext<ChainOfThoughtStepContextValue | null>(null);

function useChainOfThoughtStepContext(component: string) {
  const ctx = React.useContext(ChainOfThoughtStepContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <ChainOfThoughtStep>`);
  }
  return ctx;
}

type ChainOfThoughtStepStatus = "pending" | "active" | "completed" | "error";

type ChainOfThoughtProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoCloseOnAllComplete?: boolean;
};

function ChainOfThought({
  className,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  autoCloseOnAllComplete = true,
  children,
  ...props
}: ChainOfThoughtProps) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [stepStatuses, setStepStatuses] = React.useState<
    Record<string, ChainOfThoughtStepStatus>
  >({});

  const { allStepsComplete, hasAnyError } = React.useMemo(() => {
    const statuses = Object.values(stepStatuses);
    return {
      allStepsComplete:
        statuses.length > 0 &&
        statuses.every((status) => status === "completed"),
      hasAnyError: statuses.some((status) => status === "error"),
    };
  }, [stepStatuses]);

  const open = isControlled ? openProp : internalOpen;

  const registerStep = React.useCallback(
    (id: string, status: ChainOfThoughtStepStatus) => {
      setStepStatuses((prev) => {
        if (prev[id] === status) return prev;
        return { ...prev, [id]: status };
      });
    },
    [],
  );

  const contextValue = React.useMemo(
    () => ({ registerStep, allStepsComplete, hasAnyError }),
    [allStepsComplete, hasAnyError, registerStep],
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useOnChange(allStepsComplete, (current, previous) => {
    if (!autoCloseOnAllComplete || isControlled) return;
    if (!previous && current) {
      setInternalOpen(false);
      onOpenChange?.(false);
    }
  });

  return (
    <ChainOfThoughtRootContext.Provider value={contextValue}>
      <Collapsible
        data-slot="chain-of-thought"
        className={cn("not-prose flex w-full flex-col", gap.xs, className)}
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </Collapsible>
    </ChainOfThoughtRootContext.Provider>
  );
}

type ChainOfThoughtTriggerProps = React.ComponentProps<
  typeof CollapsibleTrigger
> & {
  label?: React.ReactNode;
  icon?: React.ReactNode;
};

function ChainOfThoughtTrigger({
  className,
  icon,
  label,
  children,
  ...props
}: ChainOfThoughtTriggerProps) {
  const { allStepsComplete, hasAnyError } = useChainOfThoughtRootContext(
    "ChainOfThoughtTrigger",
  );
  const isActive = !allStepsComplete && !hasAnyError;

  return (
    <CollapsibleTrigger
      data-slot="chain-of-thought-trigger"
      data-active={String(isActive)}
      className={cn(
        cn(
          "group flex w-full cursor-pointer items-center overflow-hidden transition-colors",
          chatProcessStepTitleClass,
          gap.xs,
        ),
        className,
      )}
      {...props}
    >
      {icon}
      <div
        className={cn(
          "flex min-h-5 min-w-0 flex-1 items-center overflow-hidden",
          gap.xs,
        )}
      >
        <ProcessStepTitleLabel active={isActive}>
          {children ?? label}
        </ProcessStepTitleLabel>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          aria-hidden="true"
          className="size-4 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-data-panel-open:rotate-180 group-data-panel-open:opacity-100"
        />
      </div>
    </CollapsibleTrigger>
  );
}

type ChainOfThoughtContentProps = React.ComponentProps<
  typeof CollapsibleContent
>;

function ChainOfThoughtContent({
  className,
  children,
  ...props
}: ChainOfThoughtContentProps) {
  return (
    <CollapsibleContent
      data-slot="chain-of-thought-content"
      className={cn(
        cn(stack.xs),
        "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className,
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
}

function hasIconInStepTitle(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement<{ icon?: React.ReactNode }>(child) &&
      child.props.icon != null,
  );
}

type ChainOfThoughtStepProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "defaultOpen" | "onOpenChange"
> & {
  status?: ChainOfThoughtStepStatus;
  hasContent?: boolean;
  showConnector?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoCloseOnComplete?: boolean;
};

function ChainOfThoughtStep({
  className,
  status = "pending",
  hasContent = false,
  showConnector,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  autoCloseOnComplete = true,
  children,
  ...props
}: ChainOfThoughtStepProps) {
  const { registerStep } = useChainOfThoughtRootContext("ChainOfThoughtStep");
  const stepId = React.useId();
  const showConnectorResolved = showConnector ?? hasIconInStepTitle(children);
  const isControlled = openProp !== undefined;
  const canAutoManageOpen = !isControlled && hasContent;
  const [internalOpen, setInternalOpen] = React.useState(
    () => defaultOpen || (hasContent && status === "active"),
  );
  const open = isControlled ? openProp : internalOpen;

  React.useEffect(() => {
    registerStep(stepId, status);
  }, [registerStep, status, stepId]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useOnChange(status, (current, previous) => {
    if (
      canAutoManageOpen &&
      current === "active" &&
      previous !== current
    ) {
      setInternalOpen(true);
      onOpenChange?.(true);
      return;
    }

    if (!canAutoManageOpen || !autoCloseOnComplete || previous === undefined) {
      return;
    }

    if (
      previous === "active" &&
      (current === "completed" || current === "error")
    ) {
      setInternalOpen(false);
      onOpenChange?.(false);
      return;
    }

    if (previous !== "completed" && current === "completed") {
      setInternalOpen(false);
      onOpenChange?.(false);
    }
  });

  return (
    <ChainOfThoughtStepContext.Provider value={{ status, hasContent }}>
      <Collapsible
        data-slot="chain-of-thought-step"
        className={cn("relative w-full fade-in-0", className)}
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
        {showConnectorResolved && open ? (
          <div
            className={cn(
              "absolute top-4.75 -bottom-2.75 left-2 -mx-px w-px",
              status === "error" ? "bg-destructive/20" : "bg-border/50",
            )}
          />
        ) : null}
      </Collapsible>
    </ChainOfThoughtStepContext.Provider>
  );
}

type ChainOfThoughtStepTitleSharedProps = {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  collapsible?: boolean;
};

type ChainOfThoughtStepTitleCollapsibleProps =
  ChainOfThoughtStepTitleSharedProps &
    Omit<React.ComponentProps<typeof CollapsibleTrigger>, "children"> & {
      collapsible: true;
    };

type ChainOfThoughtStepTitleStaticProps = ChainOfThoughtStepTitleSharedProps &
  React.HTMLAttributes<HTMLDivElement> & {
    collapsible?: false;
  };

type ChainOfThoughtStepTitleProps =
  | ChainOfThoughtStepTitleCollapsibleProps
  | ChainOfThoughtStepTitleStaticProps;

function ChainOfThoughtStepTitle({
  className,
  label: labelProp,
  icon,
  collapsible,
  children,
  ...props
}: ChainOfThoughtStepTitleProps) {
  const { hasContent, status } = useChainOfThoughtStepContext(
    "ChainOfThoughtStepTitle",
  );
  const isCollapsible = collapsible ?? hasContent;
  const isActive = status === "active";
  const isError = status === "error";
  const resolvedIcon =
    isError && icon ? (
      <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" className="size-4" />
    ) : (
      icon
    );
  const label = children ?? labelProp;

  if (!isCollapsible) {
    const staticProps = props as React.HTMLAttributes<HTMLDivElement>;

    return (
      <div
        data-slot="chain-of-thought-step-title"
        data-active={String(isActive)}
        className={cn(
          "group flex items-center",
          chatProcessStepTitleClass,
          isError && "text-destructive",
          resolvedIcon ? gap.sm : gap.none,
          className,
        )}
        {...staticProps}
      >
        {resolvedIcon ? (
          <div className="relative flex size-4 shrink-0 items-center justify-center">
            {resolvedIcon}
          </div>
        ) : null}
        <ProcessStepTitleLabel active={isActive}>{label}</ProcessStepTitleLabel>
      </div>
    );
  }

  return (
    <CollapsibleTrigger
      data-slot="chain-of-thought-step-title"
      data-active={String(isActive)}
      className={cn(
        "group flex w-full cursor-pointer items-center transition-colors",
        chatProcessStepTitleClass,
        isError && "text-destructive",
        resolvedIcon ? gap.sm : gap.none,
        className,
      )}
      {...(props as Omit<
        React.ComponentProps<typeof CollapsibleTrigger>,
        "children"
      >)}
    >
      {resolvedIcon ? (
        <div className="relative flex size-4 shrink-0 items-center justify-center">
          {resolvedIcon}
        </div>
      ) : null}
      <div
        className={cn(
          "flex min-h-5 min-w-0 flex-1 items-center overflow-hidden",
          gap.xs,
        )}
      >
        <ProcessStepTitleLabel active={isActive}>{label}</ProcessStepTitleLabel>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          aria-hidden="true"
          className="size-4 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-data-panel-open:rotate-180 group-data-panel-open:opacity-100"
        />
      </div>
    </CollapsibleTrigger>
  );
}

type ChainOfThoughtStepContentProps = React.ComponentProps<
  typeof CollapsibleContent
> & {
  /** Pin scroll to bottom while content grows (e.g. streaming thinking trace). */
  autoScrollBottom?: boolean;
};

function ChainOfThoughtStepContent({
  className,
  children,
  autoScrollBottom = false,
  ...props
}: ChainOfThoughtStepContentProps) {
  const body = autoScrollBottom ? (
    <ChromeInlineScroll
      maxHeight={chatReasoningScrollMaxHeight}
      scrollFade={false}
      horizontalScroll={false}
      autoScrollBottom
      className="min-w-0"
    >
      {children}
    </ChromeInlineScroll>
  ) : (
    children
  );

  return (
    <CollapsibleContent
      data-slot="chain-of-thought-step-content"
      className={cn(
        p[2].top,
        p[6].start,
        "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className,
      )}
      {...props}
    >
      {body}
    </CollapsibleContent>
  );
}

type ChainOfThoughtCompleteProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  label: React.ReactNode;
};

function ChainOfThoughtComplete({
  className,
  icon,
  label,
  ...props
}: ChainOfThoughtCompleteProps) {
  return (
    <div
      data-slot="chain-of-thought-complete"
      className={cn(
        cn(
          "mt-0 flex items-center text-sm leading-5 text-muted-foreground fade-in-0",
          icon ? gap.sm : gap.none
        ),
        className,
      )}
      {...props}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export type { ChainOfThoughtStepStatus };
export {
  ChainOfThought,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
  ChainOfThoughtStepTitle,
  ChainOfThoughtStepContent,
  ChainOfThoughtComplete,
};
