import {notFound,redirect} from 'next/navigation';
import {configured} from '../../lib/config';
import {database} from '../../lib/server';
import Workspace from '../workspace';

const sections = ['active','historical','actions','projects','settings'];
export default async function Page({params,searchParams}:{params:Promise<{segments?:string[]}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const {segments = []} = await params;
  const [section = 'dashboard',id] = segments;
  if (segments.length > 2 || (segments.length && !sections.includes(section)) ||
      (id && (!['active','historical','projects'].includes(section) || !/^[a-f0-9-]{36}$/i.test(id)))) notFound();
  if (!configured) redirect('/login');
  const db = await database();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect('/login');
  const profile = await db.from('users').select('id').eq('id',user.id).maybeSingle();
  if (profile.error) throw new Error('The owner profile could not be loaded. Check your Supabase migration.');
  if (!profile.data) redirect('/login');
  const query = await searchParams;
  return <Workspace key={segments.join('/')+JSON.stringify(query)} section={section} detail={id} query={query} email={user.email || ''}/>;
}
