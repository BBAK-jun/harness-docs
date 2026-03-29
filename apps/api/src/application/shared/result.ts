export type ApplicationErrorStatus = 404 | 422 | 500;

export interface ApplicationFailure<TCode extends string = string, TDetails = unknown> {
  status: ApplicationErrorStatus;
  code: TCode;
  message: string;
  details?: TDetails;
}

export type ApplicationResult<TData, TFailure extends ApplicationFailure = ApplicationFailure> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: TFailure;
    };

export function succeed<TData>(data: TData): ApplicationResult<TData> {
  return {
    ok: true,
    data,
  };
}

export function fail<TCode extends string, TDetails = unknown>(
  status: ApplicationErrorStatus,
  code: TCode,
  message: string,
  details?: TDetails,
): ApplicationResult<never, ApplicationFailure<TCode, TDetails>> {
  return {
    ok: false,
    error: {
      status,
      code,
      message,
      details,
    },
  };
}
