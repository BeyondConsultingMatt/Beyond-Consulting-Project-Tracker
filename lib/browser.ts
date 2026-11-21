import {createBrowserClient} from '@supabase/ssr';
import {supabaseKey,supabaseUrl} from './config';
import type {Action,Activity,Client,Project,Records} from './records';

export function browserDatabase() {
  return createBrowserClient(supabaseUrl!,supabaseKey!,{global:{
    fetch: (input,init) => fetch(input,{...init,cache:'no-store'}),
  }});
}

export async function readRecords(db:ReturnType<typeof browserDatabase>):Promise<Records> {
  async function all<T>(table:string):Promise<T[]> {
    const batch = 100;
    const rows:T[] = [];
    for (let offset=0;;offset+=batch) {
      const {data,error} = await db.from(table).select('*').order('id').range(offset,offset+batch-1);
      if (error) throw error;
      rows.push(...(data as T[]));
      if (data.length < batch) return rows;
    }
  }
  const [clients,projects,actions,history] = await Promise.all([
    all<Client>('clients'), all<Project>('projects'), all<Action>('action_items'),
    db.from('activity_history').select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(10),
  ]);
  if (history.error) throw history.error;
  return {clients:clients.sort((a,b)=>a.name.localeCompare(b.name)),
    projects:projects.sort((a,b)=>a.name.localeCompare(b.name)),actions,activity:history.data as Activity[]};
}
