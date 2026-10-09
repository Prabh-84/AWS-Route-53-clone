import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

_HTTP_CODES = {
    401: "AccessDenied",
    403: "AccessDenied",
    404: "NotFound",
    405: "MethodNotAllowed",
    409: "Conflict",
}


class AppError(Exception):
    """Domain error rendered as {"error": {"code": ..., "message": ...}}."""

    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.code, exc.message, exc.status_code)


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    default = "InvalidInput" if exc.status_code < 500 else "InternalFailure"
    return error_response(_HTTP_CODES.get(exc.status_code, default), str(exc.detail), exc.status_code)


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    parts = []
    for err in exc.errors():
        loc = ".".join(str(p) for p in err["loc"] if p != "body")
        parts.append(f"{loc}: {err['msg']}" if loc else err["msg"])
    return error_response("InvalidInput", "; ".join(parts), 400)


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    return error_response("InternalFailure", "An internal error occurred.", 500)


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
