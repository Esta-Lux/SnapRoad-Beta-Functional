"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const trips_routes_1 = __importDefault(require("./routes/trips.routes"));
const incidents_routes_1 = __importDefault(require("./routes/incidents.routes"));
const rewards_routes_1 = __importDefault(require("./routes/rewards.routes"));
const offers_routes_1 = __importDefault(require("./routes/offers.routes"));
const vehicles_routes_1 = __importDefault(require("./routes/vehicles.routes"));
const partners_routes_1 = __importDefault(require("./routes/partners.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
// Import middleware
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true
}));
// Request parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'snaproad-api',
        version: process.env.API_VERSION || 'v1',
        timestamp: new Date().toISOString()
    });
});
// API Routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;
app.use(`${API_PREFIX}/auth`, auth_routes_1.default);
app.use(`${API_PREFIX}/trips`, trips_routes_1.default);
app.use(`${API_PREFIX}/incidents`, incidents_routes_1.default);
app.use(`${API_PREFIX}/rewards`, rewards_routes_1.default);
app.use(`${API_PREFIX}/offers`, offers_routes_1.default);
app.use(`${API_PREFIX}/vehicles`, vehicles_routes_1.default);
app.use(`${API_PREFIX}/partners`, partners_routes_1.default);
app.use(`${API_PREFIX}/admin`, admin_routes_1.default);
// Error handling
app.use(notFound_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Start server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚗 SnapRoad API running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map