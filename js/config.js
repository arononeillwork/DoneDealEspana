// Public settings for the browser. The anon key is designed to be public:
// every table is protected by row level security in Supabase.
export const SUPABASE_URL = '__SUPABASE_URL__';
export const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';

export const SITE_NAME = 'DoneDealEspana';
export const SALE_FEE_EUR = 5;
export const IMAGE_BUCKET = 'listing-images';
export const MAX_IMAGES = 10;

// Operator details shown in the Terms ("Aviso legal"). Spanish law (LSSI-CE) expects the
// operator's name, NIF/CIF, address and a contact email to be published. Fill these in.
export const LEGAL = {
  operatorName: '',
  taxId: '',
  address: '',
  email: '',
};
