import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    const message =
      exception instanceof HttpException
        ? (typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as any).message || exception.message
          : exception.message)
        : 'Internal server error';

    const errorDetails = 
      exception instanceof HttpException && typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).error || null
        : null;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message[0] : message, // Retornar el primer mensaje si es validación
      details: Array.isArray(message) ? message : errorDetails,
    };

    // Log del error con trazabilidad
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${
        Array.isArray(message) ? JSON.stringify(message) : message
      } - Stack: ${exception instanceof Error ? exception.stack : JSON.stringify(exception)}`
    );

    response.status(status).json(errorResponse);
  }
}
