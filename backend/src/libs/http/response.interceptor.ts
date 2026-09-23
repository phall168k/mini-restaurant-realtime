import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class HttpResponseInterceptor<T> implements NestInterceptor<T> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> | Promise<Observable<any>> {
        const timestamp = new Date().getTime();
        return next.handle().pipe(
            map((payload) => ({
                payload,
                timestamp,
            })),
        );
    }
}