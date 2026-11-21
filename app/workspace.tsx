'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Archive,BriefcaseBusiness,CheckCircle2,ClipboardList,LayoutDashboard,LogOut,Moon,Plus,Settings,Sun,Users} from 'lucide-react';
import {Brand} from './ui';
import {signOut} from './auth/actions';
import {browserDatabase,readRecords} from '../lib/browser';
import {emptyRecords,today,type Action,type ActionStatus,type Client} from '../lib/records';
import {Editor,field,projectFields,type EditorState} from './editors';
import {Dashboard,Directory,ActionItems,ProjectList} from './views';

const nav = [
  ['dashboard','Dashboard','/',LayoutDashboard],['active','Active Clients','/active',Users],
  ['historical','Historical Clients','/historical',Archive],['actions','Action Items','/actions',ClipboardList],
  ['projects','Projects','/projects',BriefcaseBusiness],['settings','Settings','/settings',Settings],
] as const;
const descriptions:Record<string,string> = {
  dashboard:'Client work, deadlines, and follow-ups at a glance.',
  active:'Manage current client relationships and engagements.',
  historical:'Find past engagements and document the work you delivered.',
  actions:'Track follow-ups, deadlines, and next steps.',
  projects:'Manage engagements and the action items attached to them.',
  settings:'Manage your account and workspace preferences.',
};
type InstallPrompt = Event & {prompt:()=>Promise<void>};
type Change = {kind:'client'; id:string; archived?:boolean}|{kind:'project'; id:string};

export default function Workspace({section,detail,query,email}:{section:string;detail?:string;query:Record<string,string|undefined>;email:string}) {
  const [db] = useState(browserDatabase);
  const [records,setRecords] = useState(emptyRecords);
  const [loading,setLoading] = useState(true);
  const [loadError,setLoadError] = useState('');
  const [message,setMessage] = useState('');
  const [mutationError,setMutationError] = useState('');
  const [editor,setEditor] = useState<EditorState|null>(null);
  const [confirmation,setConfirmation] = useState<Change|null>(null);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const [busy,setBusy] = useState(false);
  const saving = useRef(false);
  const latestRead = useRef(0);
  const [dark,setDark] = useState(false);
  const [install,setInstall] = useState<InstallPrompt|null>(null);
  const [date,setDate] = useState(today);

  async function refresh() {
    const sequence = ++latestRead.current;
    setLoadError('');
    try {
      const data = await readRecords(db);
      if (sequence === latestRead.current) setRecords(data);
    } catch {
      if (sequence === latestRead.current) setLoadError('Workspace records could not be loaded. Check your connection and database setup.');
    } finally {
      if (sequence === latestRead.current) setLoading(false);
    }
  }
  useEffect(()=>{
    void refresh();
    const updateDate = () => setDate(today());
    const timer = window.setInterval(updateDate,30_000);
    const saved = localStorage.getItem('beyond-theme');
    const initial = saved ? saved==='dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(initial);
    document.documentElement.dataset.theme = initial ? 'dark':'light';
    const handler = (event:Event) => {event.preventDefault();setInstall(event as InstallPrompt);};
    const installed = () => setInstall(null);
    window.addEventListener('beforeinstallprompt',handler);
    window.addEventListener('appinstalled',installed);
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(()=>{});
    return ()=>{
      latestRead.current++;
      window.clearInterval(timer);
      window.removeEventListener('beforeinstallprompt',handler);
      window.removeEventListener('appinstalled',installed);
    };
  },[db]);
  useEffect(()=>{if(confirmation) confirmDialog.current?.showModal();},[confirmation]);

  function toggleTheme() {
    const theme = dark?'light':'dark';
    document.documentElement.dataset.theme=theme;
    localStorage.setItem('beyond-theme',theme);
    setDark(!dark);
  }

  async function mutate(operation:()=>Promise<void>,notice:string) {
    if (saving.current) throw new Error('Another update is in progress.');
    saving.current=true;
    setBusy(true);
    setMutationError('');
    setMessage('');
    try { await operation(); setMessage(notice); await refresh(); }
    finally {saving.current=false;setBusy(false);}
  }

  async function save(form:FormData) {
    if (!editor) return;
    await mutate(async()=>{
      let error;
      if (editor.kind==='client') {
        const name = field(form,'name');
        const notes = field(form,'notes');
        if (!name) throw new Error('Enter a client name.');
        if (editor.record) {
          ({error} = await db.from('clients').update({name,notes}).eq('id',editor.record.id).select('id').single());
        } else {
          const project = field(form,'initial_name') ? projectFields(form,'initial_') : null;
          const otherProjectFields = ['role','start_date','target_date','end_date','technologies','description','accomplishments','notes'];
          if (!project && otherProjectFields.some(key=>field(form,'initial_'+key))) throw new Error('Enter a name for the initial project.');
          ({error} = await db.rpc('create_client',{client_name:name,client_notes:notes,historical:Boolean(editor.historical),first_project:project}));
        }
      } else if (editor.kind==='project') {
        const row = {...projectFields(form),client_id:field(form,'client_id')};
        if (!row.name || !row.client_id) throw new Error('Enter a project name and select a client.');
        ({error} = editor.record
          ? await db.from('projects').update(row).eq('id',editor.record.id).select('id').single()
          : await db.from('projects').insert(row));
      } else {
        const title = field(form,'title');
        if (!title) throw new Error('Enter an action item title.');
        const row = {title,client_id:field(form,'client_id')||null,project_id:field(form,'project_id')||null,
          description:field(form,'description'),notes:field(form,'notes'),due_date:field(form,'due_date')||null,
          priority:field(form,'priority'),status:field(form,'status')};
        ({error} = editor.record
          ? await db.from('action_items').update(row).eq('id',editor.record.id).select('id').single()
          : await db.from('action_items').insert(row));
      }
      if (error?.code==='23503') throw new Error('Check the selected client and project. Projects with linked action items must keep their current client until the items are reassigned.');
      if (error) throw new Error('The record could not be saved. Check your access and try again.');
    },'Record saved.');
  }
  function updateAction(action:Action,changes:{status?:ActionStatus;archived?:boolean}) {
    void mutate(async()=>{
      const {error} = await db.from('action_items').update(changes).eq('id',action.id).select('id').single();
      if(error) throw new Error('The action item could not be updated.');
    },'Action item updated.').catch((error:Error)=>setMutationError(error.message));
  }
  function archiveClient(client:Client) {setConfirmation({kind:'client',id:client.id,archived:!client.archived});}
  async function confirm() {
    if (!confirmation) return;
    const change = confirmation;
    await mutate(async()=>{
      const table = change.kind==='client'?'clients':'projects';
      const result = change.kind==='client' && change.archived!==undefined
        ? await db.from(table).update({archived:change.archived}).eq('id',change.id).select('id').single()
        : await db.from(table).delete().eq('id',change.id).select('id').single();
      if (result.error) throw new Error('The record could not be updated.');
    },change.kind==='client' && change.archived!==undefined?'Client moved.':'Record deleted.');
    setConfirmation(null);
  }

  const activeSection = nav.find(item=>item[0]===section) ?? nav[0];
  const selectedClient = records.clients.find(client=>client.id===detail && client.archived===(section==='historical'));
  const selectedProject = records.projects.find(project=>project.id===detail);
  const detailTitle = section==='projects' ? selectedProject?.name : selectedClient?.name;
  const canAdd = section==='dashboard' || section==='actions' || section==='projects' || section==='active' || section==='historical';
  const addLabel = section==='active' || section==='historical'?'New client':section==='projects' && !detail?'New project':'New action item';
  const onAdd = () => {
    if (selectedClient) setEditor({kind:'project',client:selectedClient.id});
    else if (section==='active' || section==='historical') setEditor({kind:'client',historical:section==='historical'});
    else if (section==='projects' && !detail) setEditor({kind:'project'});
    else setEditor({kind:'action',project:selectedProject?.id,client:selectedProject?.client_id});
  };
  const actionProps = {records,date,busy,onEdit:(record:Action)=>setEditor({kind:'action',record}),onUpdate:updateAction};
  return <div className="workspace">
    <a className="skip" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <Brand/>
      <nav aria-label="Workspace">{nav.map(([key,label,href,Icon])=><Link key={key} href={href} aria-current={section===key?'page':undefined}><Icon size={18}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-bottom">
        <div className="avatar" aria-hidden="true">{email.slice(0,1).toUpperCase() || 'B'}</div>
        <div className="account"><strong>Workspace owner</strong><small title={email}>{email}</small></div>
        <form action={signOut}><button className="icon-button" aria-label="Sign out" title="Sign out"><LogOut size={18}/></button></form>
      </div>
    </aside>
    <main id="main-content" className="workspace-main">
      <header className="topbar"><span>Beyond Consulting LLC</span><button className="icon-button" onClick={toggleTheme} aria-label={dark?'Switch to light theme':'Switch to dark theme'} title={dark?'Light theme':'Dark theme'}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button></header>
      <div className="page-content">
        {detail && <Link className="back-link" href={activeSection[2]}>All {activeSection[1].toLowerCase()}</Link>}
        <div className="page-heading"><div><h1>{detailTitle || activeSection[1]}</h1>{!detail && <p>{descriptions[section]}</p>}</div>
          {canAdd && !loading && !loadError && (!detail || detailTitle) && <button className="primary" onClick={onAdd}><Plus size={17}/>{selectedClient?'New project':addLabel}</button>}
        </div>
        {message && <p className="notice" role="status">{message}</p>}
        {mutationError && !confirmation && <p className="error" role="alert">{mutationError}</p>}
        {section==='settings' ? <div className="settings-grid">
          <section className="panel padded"><h2>Account</h2><p>{email}</p><div className="button-row"><Link className="button" href="/login?mode=request">Reset password</Link><form action={signOut}><button>Sign out</button></form></div></section>
          <section className="panel padded"><h2>Appearance</h2><p>{dark?'Dark mode':'Light mode'}</p><button onClick={toggleTheme}>{dark?'Use light mode':'Use dark mode'}</button></section>
          <section className="panel padded"><h2>Install the app</h2><p>In Edge or Chrome, use the install option in the browser menu. On iPhone Safari, choose Share, then Add to Home Screen.</p>{install && <button onClick={()=>{void install.prompt().finally(()=>setInstall(null));}}>Install app</button>}</section>
          <section className="panel padded"><h2>Workspace data</h2><p>Use this workspace for consulting operations. Keep patient information and PHI out of records and notes.</p></section>
        </div> : loading ? <p className="panel padded" role="status">Loading workspace…</p>
          : loadError ? <section className="panel padded"><p className="error" role="alert">{loadError}</p><button onClick={()=>void refresh()}>Retry</button></section>
          : detail && !detailTitle ? <p className="panel padded">This record is unavailable. It may have moved or been deleted.</p>
          : section==='dashboard' ? <Dashboard {...actionProps}/>
          : section==='actions' ? <ActionItems {...actionProps} initialScope={query.scope}/>
          : section==='projects' ? <ProjectList {...actionProps} detail={selectedProject} activeOnly={query.scope==='active'}
              onProjectEdit={record=>setEditor({kind:'project',record})} onDelete={record=>setConfirmation({kind:'project',id:record.id})}/>
          : <Directory records={records} historical={section==='historical'} detail={selectedClient}
              onEdit={record=>setEditor({kind:'client',record})} onArchive={archiveClient}
              onDelete={record=>setConfirmation({kind:'client',id:record.id})}/>}
      </div>
    </main>
    {editor && <Editor state={editor} records={records} onClose={()=>setEditor(null)} onSave={save}/>}
    {confirmation && <dialog ref={confirmDialog} aria-labelledby="confirmation-title" onCancel={event=>{event.preventDefault();if(!busy){setConfirmation(null);setMutationError('');}}}>
      <div className="padded stack"><h2 id="confirmation-title">{confirmation.kind==='client' && confirmation.archived!==undefined ? confirmation.archived?'Move to Historical Clients?':'Restore to Active Clients?' : 'Permanently delete this record?'}</h2>
        <p>{confirmation.kind==='client' && confirmation.archived!==undefined?'Projects and action items will stay linked to the client.':confirmation.kind==='client'?'The client and its projects will be deleted. Action items will be retained with their deleted associations removed.':'Linked action items will be retained with the project association removed.'}</p>
        {mutationError && <p className="error" role="alert">{mutationError}</p>}
        <div className="button-row"><button disabled={busy} onClick={()=>{setConfirmation(null);setMutationError('');}}>Cancel</button>
        <button disabled={busy} className={confirmation.kind==='client' && confirmation.archived!==undefined?'primary':'danger'} onClick={()=>void confirm().catch((error:Error)=>setMutationError(error.message))}>{busy?'Saving…':confirmation.kind==='client' && confirmation.archived!==undefined?'Move client':'Delete record'}</button></div>
      </div>
    </dialog>}
  </div>;
}
