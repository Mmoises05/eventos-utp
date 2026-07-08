import { SetMetadata } from '@nestjs/common';

export interface AuditMetadata {
  action: string;
  module: string;
}

export const AUDIT_KEY = 'audit';
export const Audit = (action: string, module: string) =>
  SetMetadata(AUDIT_KEY, { action, module });
