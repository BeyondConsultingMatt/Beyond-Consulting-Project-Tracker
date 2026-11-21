import {createServerClient} from '@supabase/ssr';
import {NextRequest, NextResponse} from 'next/server';
import {configured,supabaseKey,supabaseUrl} from './lib/config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({request});
  if (configured && request.cookies.getAll().some(({name}) => name.startsWith('sb-'))) {
    const client = createServerClient(supabaseUrl!,supabaseKey!,{cookies:{
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({name,value}) => request.cookies.set(name,value));
        response = NextResponse.next({request});
        items.forEach(({name,value,options}) => response.cookies.set(name,value,options));
      },
    }});
    await client.auth.getUser();
  }
  response.headers.set('Cache-Control','private, no-store');
  return response;
}
export const config = {matcher:['/((?!_next/static|_next/image|manifest.webmanifest|icon-192.png|icon-512.png|icon-maskable.png|sw.js).*)']};
