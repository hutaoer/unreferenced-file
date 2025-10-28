export interface IAddressProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export type TAddressKey = 'country' | 'province' | 'city' | 'area';

// export const demoData: IAddressProps = {
//   address: '',
//   city: '',
//   state: '',
//   zip: '',
//   country: '',
// };

export const num1 = 123