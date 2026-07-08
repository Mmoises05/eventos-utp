import { Controller, Get, UseGuards, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @RequirePermission('reports', 'read')
  getStats() {
    return this.reportsService.getExecutiveStats();
  }

  @Get('export/csv')
  @RequirePermission('reports', 'read')
  @Audit('EXPORT_REPORTS', 'REPORTS')
  async exportCsv(@Res() res: any) {
    const csvContent = await this.reportsService.exportEventsToCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-eventos.csv"');
    res.status(200).send(csvContent);
  }
}
