import { envConfig } from './env';

export interface TheaterConfig {
  name: string;
  location: string;
  gstin: string;
  defaultTaxValues: {
    net: string;
    cgst: string;
    sgst: string;
    mc: string;
    totalAmount: string;
  };
}

export const getTheaterConfig = (): TheaterConfig => {
  return envConfig.theater;
};
