export type RenderErrorReporter = (
  error: unknown,
  componentStack: string | undefined,
) => void;

let reporter: RenderErrorReporter | undefined;

/**
 * Куда отправлять ошибки рендера, пойманные границами страниц. `shared` не знает
 * про Sentry: репортёр подключает слой `app` при старте, как транспорт API.
 */
export function configureRenderErrorReporter(
  next: RenderErrorReporter,
): () => void {
  reporter = next;
  return () => {
    if (reporter === next) reporter = undefined;
  };
}

export function reportRenderError(
  error: unknown,
  componentStack: string | undefined,
): void {
  reporter?.(error, componentStack);
}
