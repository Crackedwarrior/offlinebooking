import { config } from '../config';

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
  return (config as any).theater;
};
