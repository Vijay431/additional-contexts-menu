declare module 'express' {
  interface Request {
    body?: any;
    params?: any;
    query?: any;
    headers?: any;
  }

  interface Response {
    status(code: number): Response & { send(data?: any): Response };
    json(data: any): Response;
    end(): Response;
  }

  function Router(): any;
}

declare module '@angular/core' {
  function Injectable(...args: any[]): any;
}

declare module '@angular/common/http' {
  export class HttpClient {
    get<T>(url: string, options?: any): any;
    post<T>(url: string, body: any, options?: any): any;
    put<T>(url: string, body: any, options?: any): any;
    delete<T>(url: string, options?: any): any;
  }
}

declare module 'rxjs' {
  export class Observable<T> {
    subscribe(observerOrNext?: any, error?: any, complete?: any): any;
    pipe(...operations: any[]): Observable<any>;
    map(fn: (value: T) => any): Observable<any>;
    filter(fn: (value: T) => boolean): Observable<T>;
  }
}
