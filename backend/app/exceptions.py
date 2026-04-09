class AppException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code


class NotFoundError(AppException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404)


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "CONFLICT", 409)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Not authenticated"):
        super().__init__(message, "UNAUTHORIZED", 401)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Not enough permissions"):
        super().__init__(message, "FORBIDDEN", 403)


class ValidationError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR", 422)


class RateLimitError(AppException):
    def __init__(self):
        super().__init__("Too many requests", "RATE_LIMITED", 429)
