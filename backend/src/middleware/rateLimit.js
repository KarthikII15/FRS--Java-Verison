import rateLimit from 'express-rate-limit';

// Trust proxy if the app is behind a load balancer/reverse proxy (e.g., Nginx, AWS ELB, Heroku)
// If it's directly exposed, setting this depends on the environment. We'll leave it up to Express App config.

// 1. General API Rate Limiter
// Limits general endpoints to 300 requests per 10 minutes per IP
export const globalRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 300,
    message: { message: "Too many requests from this IP, please try again after 10 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Strict Auth Rate Limiter
// Prevents brute forcing login/refresh tokens: Maximum 10 attempts per 5 minutes per IP
export const authRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: { message: "Too many failed login attempts, please try again after 5 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});
