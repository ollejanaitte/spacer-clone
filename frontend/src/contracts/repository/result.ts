import type { RepositoryError } from "./errors";

export type RepositoryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RepositoryError };

export function repositorySuccess<T>(value: T): RepositoryResult<T> {
  return { ok: true, value };
}

export function repositoryFailure<T>(error: RepositoryError): RepositoryResult<T> {
  return { ok: false, error };
}
