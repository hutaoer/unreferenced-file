export interface IAddressProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export type TAddressKey = 'country' | 'province' | 'city' | 'area';

export const demoData = {
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
};

export const demoData1: IAddressProps = {
  address: '123 Main St',
  city: 'Anytown',
  state: 'CA',
  zip: '12345',
  country: 'USA',
};

export const num1 = 123