export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(recurso: string) {
    super(`${recurso} no encontrado`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class SorteoImposibleError extends AppError {
  constructor() {
    super(
      'No es posible realizar el sorteo con las exclusiones actuales',
      400,
      'SORTEO_IMPOSIBLE'
    )
    this.name = 'SorteoImposibleError'
  }
}

export class IntercambioYaSorteadoError extends AppError {
  constructor() {
    super('El sorteo ya fue realizado', 400, 'ALREADY_SORTED')
    this.name = 'IntercambioYaSorteadoError'
  }
}
