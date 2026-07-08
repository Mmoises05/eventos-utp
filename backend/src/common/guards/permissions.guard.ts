import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, RequiredPermission } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      return false;
    }

    // El SUPER_ADMIN siempre tiene acceso a todo
    if (user.role.name === 'SUPER_ADMIN') {
      return true;
    }

    try {
      // Las bases de datos como SQLite almacenan JSON como String, deserializamos si es necesario
      const permissions = typeof user.role.permissions === 'string'
        ? JSON.parse(user.role.permissions)
        : user.role.permissions;

      if (!permissions || typeof permissions !== 'object') {
        return false;
      }

      const resourcePermissions = permissions[requiredPermission.resource];
      if (!Array.isArray(resourcePermissions)) {
        return false;
      }

      return resourcePermissions.includes(requiredPermission.action);
    } catch (e) {
      return false;
    }
  }
}
