interface GraphqlBody {
  errors?: { extensions?: { code?: unknown } }[];
}

/**
 * GraphQL отвечает 200 и на просроченный токен, поэтому конвейеру нужен настоящий статус:
 * `createAuthFetch(auth, { effectiveStatus: graphqlEffectiveStatus })`.
 * Результат передаётся в Apollo, urql или graphql-request как их `fetch`.
 */
export async function graphqlEffectiveStatus(response: Response): Promise<number> {
  if (response.status !== 200) return response.status;
  if (!response.headers.get('Content-Type')?.includes('json')) return response.status;
  try {
    const body = (await response.clone().json()) as GraphqlBody;
    const isUnauthenticated = body.errors?.some(
      (error) => error.extensions?.code === 'UNAUTHENTICATED',
    );
    return isUnauthenticated ? 401 : response.status;
  } catch {
    return response.status;
  }
}
