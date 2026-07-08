import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.get<AuditMetadata>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ipAddress = request.ip || request.connection?.remoteAddress || '127.0.0.1';
    const userAgent = request.headers['user-agent'] || 'Unknown';

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const userId = user?.id || null;
          const entityId = response?.id || request.params?.id || null;

          await this.prisma.auditLog.create({
            data: {
              userId,
              action: auditMetadata.action,
              module: auditMetadata.module,
              entityId,
              entityType: auditMetadata.module,
              newValue: response ? JSON.stringify(response) : null,
              oldValue: request.body ? JSON.stringify(request.body) : null,
              ipAddress,
              userAgent,
            },
          });
        } catch (e) {
          console.error('Error guardando log de auditoría:', e);
        }
      }),
    );
  }
}
