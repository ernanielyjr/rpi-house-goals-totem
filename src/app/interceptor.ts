import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class Interceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    request = request.clone({
      url: `https://cors-anywhere.herokuapp.com/${request.url}`,
      setHeaders: {
        Authorization: 'Basic ZXJuYW5pLmdhdXRpQGdtYWlsLmNvbTpiMTI0N2RlNWMxMmM1OGMwYzMyYWY5YWMwYWNlNDUwMzk3NmNkOGYy',
        'Content-Type': 'application/json; charset=utf-8',
        // 'User-Agent': 'MyPlan',
      }
    });
    return next.handle(request);
  }
}
