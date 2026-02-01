"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = void 0;
const response_1 = require("../utils/response");
/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    return response_1.ApiResponse.error(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=notFound.middleware.js.map