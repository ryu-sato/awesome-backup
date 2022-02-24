import Logger from 'bunyan';
import { createLogger } from 'universal-bunyan';

import configForDev from '@/mongodb/config/logger/config.dev';
import configForProd from '@/mongodb/config/logger/config.prod';

const isProduction = process.env.NODE_ENV === 'production';
const config = isProduction ? configForProd : configForDev;

const loggerFactory = (name: string): Logger => {
  return createLogger({
    name,
    config,
  });
};

export default loggerFactory;
