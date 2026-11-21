import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {supabaseKey, supabaseUrl} from './config';

export async function database() {
  const jar = await cookies();
  return createServerClient(supabaseUrl!, supabaseKey!, {cookies: {
    getAll: () => jar.getAll(),
    setAll: (items) => {
      try { items.forEach(({name, value, options}) => jar.set(name, value, options)); }
      catch { /* The proxy handles refreshed cookies during page rendering. */ }
    },
  }});
}
