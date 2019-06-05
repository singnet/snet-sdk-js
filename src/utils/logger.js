import { format, createLogger, transports } from 'winston';

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: './logs/error.log', level: 'error' }),
    new transports.File({ filename: './logs/combined.log', level: 'info' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple(),
    level: process.env.DEBUG ? 'silly' : 'info'
  }));
}

export default logger;
