export const priorities = ['Critical','High','Medium','Low'] as const;
export const projectStatuses = ['Not Started','Active','On Hold','At Risk','Completed'] as const;
export const actionStatuses = ['Not Started','In Progress','Waiting on Client','Blocked','Completed','Cancelled'] as const;
export type Priority = typeof priorities[number];
export type ProjectStatus = typeof projectStatuses[number];
export type ActionStatus = typeof actionStatuses[number];
export type Client = {id:string; name:string; notes:string; archived:boolean};
export type Project = {id:string; client_id:string; name:string; description:string; role:string; notes:string; technologies:string; accomplishments:string; start_date:string|null; target_date:string|null; end_date:string|null; status:ProjectStatus; priority:Priority};
export type Action = {id:string; client_id:string|null; project_id:string|null; title:string; description:string; notes:string; due_date:string|null; status:ActionStatus; priority:Priority; archived:boolean; created_at:string; completed_at:string|null};
export type Activity = {id:number; entity:string; entity_id:string; label:string; operation:string; created_at:string};
export type Records = {clients:Client[]; projects:Project[]; actions:Action[]; activity:Activity[]};
export const emptyRecords: Records = {clients:[],projects:[],actions:[],activity:[]};
export function today() {
  const current = new Date();
  return [current.getFullYear(),String(current.getMonth()+1).padStart(2,'0'),String(current.getDate()).padStart(2,'0')].join('-');
}
export function displayDate(date?:string|null) {
  if (!date) return '—';
  const value = date.length === 10 ? new Date(date+'T12:00:00') : new Date(date);
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(value);
}
export function isOpen(action:Action) { return !action.archived && !['Completed','Cancelled'].includes(action.status); }
export function isOverdue(action:Action,date:string) { return isOpen(action) && Boolean(action.due_date && action.due_date < date); }
export function isActiveProject(project:Project,clients:Client[]) {
  return ['Active','At Risk'].includes(project.status) && clients.some(client => client.id===project.client_id && !client.archived);
}
export function sortDue(a:Action,b:Action) {
  return (a.due_date || '9999-12-31').localeCompare(b.due_date || '9999-12-31') || a.title.localeCompare(b.title);
}
export function contains(query:string,...values:(string|undefined|null)[]) {
  return values.some(value => value?.toLowerCase().includes(query));
}
