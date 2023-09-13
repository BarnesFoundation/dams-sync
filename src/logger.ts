import winston from 'winston';

const currentDate = Date.now();

export const Logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.printf(info => {
        return `${new Date().toISOString()} [${info.level}] : ${JSON.stringify(info.message)}`;
    })),
    transports: [
        new winston.transports.File({ filename: `./logs/application-${currentDate}.log`, level: 'debug' }),
    ],
});


export const DiffLogger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.printf(info => {
        return `${new Date().toISOString()} [${info.level}] : ${JSON.stringify(info.message, null, 4)}`;
    })),
    transports: [
        new winston.transports.File({ filename: `./logs/application-${currentDate}-diff.log`, level: 'debug' }),],
});
