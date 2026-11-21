'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Archive,BriefcaseBusiness,CalendarDays,CheckCircle2,ClipboardList,History,LayoutGrid,List,TriangleAlert,Users} from 'lucide-react';
import {actionStatuses,contains,displayDate,isActiveProject,isOpen,isOverdue,priorities,projectStatuses,sortDue,type Action,type ActionStatus,type Client,type Project,type Records} from '../lib/records';

type ActionProps = {records:Records;date:string;busy:boolean;onEdit:(action:Action)=>void;onUpdate:(action:Action,changes:{status?:ActionStatus;archived?:boolean})=>void};
const tones:Record<string,string> = {
  Critical:'red',Blocked:'red','At Risk':'red',High:'amber','On Hold':'amber','Waiting on Client':'amber',
  Medium:'blue',Active:'green',Completed:'green','In Progress':'blue',Low:'neutral','Not Started':'neutral',Cancelled:'neutral',
};
function Badge({value}:{value:string}) {return <span className={'badge '+(tones[value] || 'neutral')}>{value}</span>;}
function Empty({children}:{children:React.ReactNode}) {return <p className="empty">{children}</p>;}
function Filter({label,value,options,onChange}:{label:string;value:string;options:readonly (string|{id:string;name:string})[];onChange:(value:string)=>void}) {
  return <label>{label}<select value={value} onChange={event=>onChange(event.target.value)}><option value="">All</option>{options.map(option=>{
    const id=typeof option==='string'?option:option.id;
    return <option key={id} value={id}>{typeof option==='string'?option:option.name}</option>;
  })}</select></label>;
}
function Search({value,onChange,placeholder}:{value:string;onChange:(value:string)=>void;placeholder:string}) {
  return <label>Search<input type="search" placeholder={placeholder} value={value} onChange={event=>onChange(event.target.value)}/></label>;
}
const clientHref = (client:Client) => (client.archived?'/historical/':'/active/')+client.id;
function StatusSelect({action,busy,onUpdate}:{action:Action;busy:boolean;onUpdate:ActionProps['onUpdate']}) {
  return <select className={'status-select '+tones[action.status]} aria-label={'Status for '+action.title} value={action.status} disabled={busy}
    onChange={event=>onUpdate(action,{status:event.target.value as ActionStatus})}>
    {actionStatuses.map(status=><option key={status}>{status}</option>)}
  </select>;
}
function Due({action,date}:{action:Action;date:string}) {
  return <span className={isOverdue(action,date)?'overdue':''}>{displayDate(action.due_date)}{isOverdue(action,date) && <small>Overdue</small>}</span>;
}
function ActionRows({items,...props}:ActionProps & {items:Action[]}) {
  const {records,date,busy,onEdit,onUpdate} = props;
  if (!items.length) return <Empty>No action items match this view.</Empty>;
  return <div className="table-scroll"><table><thead><tr><th>Action item</th><th>Client / project</th><th>Priority</th><th>Status</th><th>Due date</th><th>Created / completed</th><th>Manage</th></tr></thead>
    <tbody>{items.map(action=>{
      const client = records.clients.find(item=>item.id===action.client_id);
      const project = records.projects.find(item=>item.id===action.project_id);
      return <tr key={action.id}><td><button className="text-button" onClick={()=>onEdit(action)}>{action.title}</button>{action.description && <div className="truncate muted">{action.description}</div>}</td>
        <td>{client?<Link href={clientHref(client)}>{client.name}</Link>:'—'}{project && <small><Link href={'/projects/'+project.id}>{project.name}</Link></small>}</td>
        <td><Badge value={action.priority}/></td><td><StatusSelect action={action} busy={busy} onUpdate={onUpdate}/></td><td><Due action={action} date={date}/></td>
        <td>{displayDate(action.created_at)}{action.completed_at && <small>Completed {displayDate(action.completed_at)}</small>}</td>
        <td><div className="button-row compact">{isOpen(action) && <button onClick={()=>onUpdate(action,{status:'Completed'})} disabled={busy}>Complete</button>}<button onClick={()=>onUpdate(action,{archived:!action.archived})} disabled={busy}>{action.archived?'Restore':'Archive'}</button></div></td></tr>;
    })}</tbody>
  </table></div>;
}
function ActionBoard({items,...props}:ActionProps & {items:Action[]}) {
  if (!items.length) return <Empty>No action items match this view.</Empty>;
  return <div className="kanban" aria-label="Action item board">{actionStatuses.map(status=>{
    const group = items.filter(item=>item.status===status);
    return <section className="lane" key={status}><h3>{status} <span>{group.length}</span></h3>{group.map(item=><article className="panel task-card" key={item.id}>
      <button className="text-button" onClick={()=>props.onEdit(item)}>{item.title}</button>
      <small>{props.records.clients.find(client=>client.id===item.client_id)?.name}{item.project_id && ' / '+(props.records.projects.find(project=>project.id===item.project_id)?.name ?? '')}</small>
      <div className="board-meta"><Badge value={item.priority}/><Due action={item} date={props.date}/></div>
      <StatusSelect action={item} busy={props.busy} onUpdate={props.onUpdate}/>
      <div className="button-row compact">{isOpen(item) && <button disabled={props.busy} onClick={()=>props.onUpdate(item,{status:'Completed'})}>Complete</button>}<button disabled={props.busy} onClick={()=>props.onUpdate(item,{archived:!item.archived})}>{item.archived?'Restore':'Archive'}</button></div>
    </article>)}</section>;
  })}</div>;
}
const scopes = ['all','open','overdue','completed','archived'];
export function ActionItems({initialScope,...props}:ActionProps & {initialScope?:string}) {
  const {records,date} = props;
  const [scope,setScope] = useState(scopes.includes(initialScope ?? '')?initialScope!:'all');
  const [layout,setLayout] = useState('table');
  const [text,setText] = useState('');
  const [client,setClient] = useState('');
  const [project,setProject] = useState('');
  const [status,setStatus] = useState('');
  const [priority,setPriority] = useState('');
  const [sort,setSort] = useState('soonest');
  const query = text.trim().toLowerCase();
  const items = records.actions.filter(item=>{
    const scopeMatch = scope==='archived' ? item.archived : scope==='completed' ? item.status==='Completed' :
      scope==='open'?isOpen(item):scope==='overdue'?isOverdue(item,date):!item.archived;
    return scopeMatch && (!client || client===item.client_id) && (!project || project===item.project_id) &&
      (!status || status===item.status) && (!priority || priority===item.priority) &&
      (!query || contains(query,item.title,item.description,item.notes,
        records.clients.find(value=>value.id===item.client_id)?.name,records.projects.find(value=>value.id===item.project_id)?.name));
  }).sort((a,b)=>sort==='latest' && a.due_date && b.due_date ? b.due_date.localeCompare(a.due_date) || a.title.localeCompare(b.title) : sortDue(a,b));
  return <section className="panel">
    <div className="list-bar">
      <div className="segmented" aria-label="Action item view">{scopes.map(value=><button key={value} aria-pressed={scope===value} onClick={()=>{setScope(value);setStatus('');}}>{value==='all'?'All items':value[0].toUpperCase()+value.slice(1)}</button>)}</div>
      <div className="segmented" aria-label="Layout"><button aria-pressed={layout==='table'} onClick={()=>setLayout('table')}><List size={17}/>Table</button><button aria-pressed={layout==='kanban'} onClick={()=>setLayout('kanban')}><LayoutGrid size={16}/>Kanban</button></div>
    </div>
    <div className="filters">
      <Search value={text} onChange={setText} placeholder="Find an action item"/>
      <Filter label="Client" value={client} options={records.clients} onChange={value=>{setClient(value);setProject('');}}/>
      <Filter label="Project" value={project} options={records.projects.filter(item=>!client || item.client_id===client)} onChange={setProject}/>
      <Filter label="Status" value={status} options={actionStatuses} onChange={setStatus}/>
      <Filter label="Priority" value={priority} options={priorities} onChange={setPriority}/>
      <label>Due date order<select value={sort} onChange={event=>setSort(event.target.value)}><option value="soonest">Soonest first</option><option value="latest">Latest first</option></select></label>
    </div>
    {layout==='table'?<ActionRows items={items} {...props}/>:<ActionBoard items={items} {...props}/>}
  </section>;
}
function Section({title,icon:Icon,href,link,children}:{title:string;icon:typeof Users;href?:string;link?:string;children:React.ReactNode}) {
  return <section className="panel"><div className="section-head"><h2><Icon size={19}/>{title}</h2>{href && <Link href={href}>{link || 'View all'}</Link>}</div>{children}</section>;
}
export function Dashboard(props:ActionProps) {
  const {records,date,busy,onEdit,onUpdate} = props;
  const clients = records.clients.filter(client=>!client.archived);
  const activeProjects = records.projects.filter(project=>isActiveProject(project,records.clients));
  const open = records.actions.filter(isOpen).sort(sortDue);
  const overdue = open.filter(item=>isOverdue(item,date));
  const complete = records.actions.filter(item=>item.status==='Completed');
  const cards = [
    ['Active clients',clients.length,'/active',Users,'blue'],['Historical clients',records.clients.length-clients.length,'/historical',Archive,'neutral'],
    ['Active projects',activeProjects.length,'/projects?scope=active',BriefcaseBusiness,'blue'],['Open action items',open.length,'/actions?scope=open',ClipboardList,'neutral'],
    ['Overdue action items',overdue.length,'/actions?scope=overdue',TriangleAlert,'red'],['Completed action items',complete.length,'/actions?scope=completed',CheckCircle2,'green'],
  ] as const;
  const upcoming = open.filter(item=>item.due_date && item.due_date>date).slice(0,5);
  const todays = open.filter(item=>item.due_date===date || item.priority==='Critical')
    .sort((a,b)=>Number(b.priority==='Critical')-Number(a.priority==='Critical') || sortDue(a,b)).slice(0,5);
  const attention = open.filter(item=>isOverdue(item,date) || item.status==='Blocked' || item.status==='Waiting on Client');
  return <div className="stack dashboard">
    <div className="metrics">{cards.map(([label,total,href,Icon,tone])=><Link className="panel metric" key={label} href={href}><span className={'metric-icon '+tone}><Icon size={19}/></span><strong>{total}</strong><span>{label}</span></Link>)}</div>
    <div className="dashboard-grid">
      <Section title="Today's priorities" icon={ClipboardList} href="/actions?scope=open">{todays.length ? <ul className="rows">{todays.map(item=><li key={item.id}>
        <div><button className="text-button" onClick={()=>onEdit(item)}>{item.title}</button><small><Due action={item} date={date}/></small></div><Badge value={item.priority}/><StatusSelect action={item} busy={busy} onUpdate={onUpdate}/>
      </li>)}</ul>:<Empty>No action items due today or marked critical.</Empty>}</Section>
      <Section title="Upcoming deadlines" icon={CalendarDays} href="/actions?scope=open">{upcoming.length?<ul className="rows">{upcoming.map(item=><li key={item.id}><button className="text-button" onClick={()=>onEdit(item)}>{item.title}</button><span>{displayDate(item.due_date)}</span></li>)}</ul>:<Empty>No upcoming action item deadlines.</Empty>}</Section>
      <Section title="Recent activity" icon={History}>{records.activity.length?<ul className="rows">{records.activity.slice(0,5).map(item=><li key={item.id}><div><strong>{item.label}</strong><small>{item.operation==='insert'?'Created':item.operation==='delete'?'Deleted':'Updated'} · {item.entity==='action_items'?'Action item':item.entity==='projects'?'Project':'Client'}</small></div><small>{displayDate(item.created_at)}</small></li>)}</ul>:<Empty>Changes to records will appear here.</Empty>}</Section>
      <Section title="Active client overview" icon={Users} href="/active">{clients.length?<ul className="rows">{clients.slice(0,5).map(client=><li key={client.id}><Link href={clientHref(client)}>{client.name}</Link><span>{activeProjects.filter(project=>project.client_id===client.id).length} active projects</span></li>)}</ul>:<Empty>Add a client to see their engagements here.</Empty>}</Section>
    </div>
    <Section title="Action items requiring attention" icon={TriangleAlert} href="/actions?scope=open"><ActionRows {...props} items={attention.slice(0,10)}/></Section>
  </div>;
}
function ProjectRows({projects,records}:{projects:Project[];records:Records}) {
  if (!projects.length) return <Empty>No projects match this view.</Empty>;
  return <div className="table-scroll"><table><thead><tr><th>Project</th><th>Client</th><th>Role</th><th>Status</th><th>Priority</th><th>Start date</th><th>End date</th></tr></thead>
  <tbody>{projects.map(project=>{
    const owner = records.clients.find(client=>client.id===project.client_id);
    return <tr key={project.id}><td><Link href={'/projects/'+project.id}>{project.name}</Link></td><td>{owner?<Link href={clientHref(owner)}>{owner.name}</Link>:'—'}</td>
    <td>{project.role || '—'}</td><td><Badge value={project.status}/></td><td><Badge value={project.priority}/></td><td>{displayDate(project.start_date)}</td><td>{displayDate(project.end_date || project.target_date)}</td></tr>;
  })}</tbody></table></div>;
}
function Details({items}:{items:[string,React.ReactNode][]}) {
  return <dl className="details">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>;
}
export function ProjectList({detail,activeOnly,onProjectEdit,onDelete,...props}:ActionProps & {detail?:Project;activeOnly:boolean;onProjectEdit:(project:Project)=>void;onDelete:(project:Project)=>void}) {
  const {records} = props;
  const [text,setText] = useState('');
  const [client,setClient] = useState('');
  const [status,setStatus] = useState('');
  const [priority,setPriority] = useState('');
  if (detail) {
    const owner = records.clients.find(client=>client.id===detail.client_id);
    return <div className="stack"><section className="panel">
      <div className="section-head"><h2>Project details</h2><div className="button-row"><button onClick={()=>onProjectEdit(detail)}>Edit project</button><button onClick={()=>onDelete(detail)}>Delete project</button></div></div>
      <Details items={[['Client',owner && <Link href={clientHref(owner)}>{owner.name}</Link>],['Role',detail.role],['Status',<Badge value={detail.status}/>],
        ['Priority',<Badge value={detail.priority}/>],['Start date',displayDate(detail.start_date)],['Expected end date',displayDate(detail.target_date)],
        ['Actual end date',displayDate(detail.end_date)],['Technologies',detail.technologies],['Description',detail.description],['Accomplishments',detail.accomplishments],['Notes',detail.notes]]}/>
      </section><Section title="Associated action items" icon={ClipboardList}><ActionRows {...props} items={records.actions.filter(item=>item.project_id===detail.id).sort(sortDue)}/></Section></div>;
  }
  const query = text.trim().toLowerCase();
  const projects = records.projects.filter(project=>(!activeOnly || isActiveProject(project,records.clients)) && (!client || project.client_id===client) &&
    (!status || project.status===status) && (!priority || project.priority===priority) && (!query || contains(query,project.name,project.role,project.description,project.notes,project.technologies,project.accomplishments,records.clients.find(item=>item.id===project.client_id)?.name)));
  return <section className="panel"><div className="list-bar"><div className="segmented"><Link aria-current={!activeOnly?'page':undefined} href="/projects">All projects</Link><Link aria-current={activeOnly?'page':undefined} href="/projects?scope=active">Active projects</Link></div></div>
    <div className="filters"><Search value={text} onChange={setText} placeholder="Find a project"/><Filter label="Client" value={client} options={records.clients} onChange={setClient}/>
      <Filter label="Status" value={status} options={projectStatuses} onChange={setStatus}/><Filter label="Priority" value={priority} options={priorities} onChange={setPriority}/></div>
    <ProjectRows projects={projects} records={records}/>
  </section>;
}
export function Directory({records,historical,detail,onEdit,onArchive,onDelete}:{records:Records;historical:boolean;detail?:Client;onEdit:(client:Client)=>void;onArchive:(client:Client)=>void;onDelete:(client:Client)=>void}) {
  const [text,setText] = useState('');
  const [status,setStatus] = useState('');
  const [priority,setPriority] = useState('');
  const [year,setYear] = useState('');
  if (detail) return <div className="stack"><section className="panel"><div className="section-head"><h2>Client details</h2><div className="button-row">
    <button onClick={()=>onEdit(detail)}>Edit client</button><button onClick={()=>onArchive(detail)}>{historical?'Restore client':'Archive client'}</button>{historical && <button onClick={()=>onDelete(detail)}>Delete client</button>}</div></div>
    <Details items={[[ 'Notes',detail.notes ]]}/>
  </section><Section title="Client projects" icon={BriefcaseBusiness}><ProjectRows projects={records.projects.filter(item=>item.client_id===detail.id)} records={records}/></Section></div>;
  const query = text.trim().toLowerCase();
  const list = records.clients.filter(client=>client.archived===historical);
  const years = [...new Set(records.projects.filter(project=>list.some(item=>item.id===project.client_id))
    .map(project=>(project.end_date || project.target_date || project.start_date)?.slice(0,4)).filter((item):item is string=>Boolean(item)))].sort().reverse();
  const matches = list.map(client=>{
    const projects = records.projects.filter(item=>item.client_id===client.id);
    const direct = !query || contains(query,client.name,client.notes);
    const filtered = projects.filter(item=>(!status || item.status===status) && (!priority || item.priority===priority) &&
      (!year || (item.end_date || item.target_date || item.start_date)?.startsWith(year)) &&
      (direct || contains(query,item.name,item.role,item.description,item.technologies,item.accomplishments,item.notes)));
    return {client,projects:filtered,display:filtered.length>0 || (!status && !priority && !year && direct)};
  }).filter(item=>item.display);
  return <section className="panel"><div className="filters"><Search value={text} onChange={setText} placeholder="Find a client or project"/>
    <Filter label="Project status" value={status} options={projectStatuses} onChange={setStatus}/><Filter label="Priority" value={priority} options={priorities} onChange={setPriority}/>
    {historical && <Filter label="Engagement year" value={year} options={years} onChange={setYear}/>}</div>
    {matches.length ? <div className="table-scroll"><table><thead><tr><th>Client</th><th>Projects</th><th>Manage</th></tr></thead><tbody>{matches.map(({client,projects})=><tr key={client.id}>
      <td><Link href={clientHref(client)}>{client.name}</Link>{client.notes && <div className="muted truncate">{client.notes}</div>}</td>
      <td>{projects.length?projects.map(project=><div className="list-project" key={project.id}><Link href={'/projects/'+project.id}>{project.name}</Link><Badge value={project.status}/></div>):'—'}</td>
      <td><div className="button-row compact"><button onClick={()=>onEdit(client)}>Edit</button><button onClick={()=>onArchive(client)}>{historical?'Restore':'Archive'}</button>{historical && <button onClick={()=>onDelete(client)}>Delete</button>}</div></td>
    </tr>)}</tbody></table></div>:<Empty>{list.length?'No clients match these filters.':historical?'Add your first historical client to start recording past engagements.':'Add your first client to start tracking engagements.'}</Empty>}
  </section>;
}
