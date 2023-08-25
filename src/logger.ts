import winston from 'winston';

export const Logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.printf(info => {
        return `${new Date().toISOString()} [${info.level}] : ${JSON.stringify(info.message)}`;
    })),
    transports: [
        new winston.transports.File({ filename: `./logs/application-${Date.now()}.log`, level: 'debug' }),
    ],
});

