import { Info, LifeBuoy } from 'lucide-react';

/**
 * Persistent, non-clinical disclaimer shown alongside any results or
 * AI-generated insight. Keeps the duty-of-care framing always visible.
 */
export function ResultsDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground ${className}`}
      data-testid="text-results-disclaimer"
    >
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <p>
        These results are for self-reflection and personal growth — they are not a
        clinical or diagnostic assessment and should not replace advice from a
        qualified professional.
      </p>
    </div>
  );
}

/**
 * Supportive framing + resources, surfaced only when a state-based result
 * falls into a potentially distressing range (e.g. high stress, low
 * well-being, low resilience).
 */
export function SupportiveResources({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 ${className}`}
      data-testid="card-supportive-resources"
    >
      <div className="flex items-start gap-3">
        <LifeBuoy className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            A note of support
          </p>
          <p className="text-sm text-muted-foreground">
            This result reflects how you've been feeling recently — states like
            this change over time and are not a fixed judgment of who you are.
            If you're going through a hard time, talking to someone you trust or
            a mental-health professional can help.
          </p>
          <p className="text-sm text-muted-foreground">
            If you're in distress or crisis, you can reach a free, confidential
            helpline anytime: dial or text <strong>988</strong> (US Suicide &amp;
            Crisis Lifeline), or find international options at{' '}
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
              data-testid="link-helpline"
            >
              findahelpline.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
