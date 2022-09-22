import { format, createLogger, transports } from 'winston';

const logger = createLogger({
  format: format.simple(),
  level: process.env.DEBUG ? 'silly' : 'info',
  transports: [new transports.Console({ level : 'debug'})]
});

export default logger;
