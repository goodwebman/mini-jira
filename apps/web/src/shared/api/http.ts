type HttpFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

let transport: HttpFetch | undefined;

export function configureHttp(fetch: HttpFetch): void {
  transport = fetch;
}

export function http(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!transport) throw new Error('HTTP transport has not been configured');
  return transport(input, init);
}
