'use client';
import {useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {actionStatuses,priorities,projectStatuses,type Action,type Client,type Project,type Records} from '../lib/records';

export type EditorState =
  | {kind:'client'; record?:Client; historical?:boolean}
  | {kind:'project'; record?:Project; client?:string}
  | {kind:'action'; record?:Action; client?:string; project?:string};

export function projectFields(form:FormData,prefix='') {
  const value = (name:string) => field(form,prefix+name);
  const start_date = value('start_date') || null;
  const target_date = value('target_date') || null;
  const end_date = value('end_date') || null;
  if (start_date && ((target_date && target_date<start_date) || (end_date && end_date<start_date))) {
    throw new Error('Project end dates must be on or after the start date.');
  }
  return {name:value('name'), description:value('description'),role:value('role'), notes:value('notes'),
    technologies:value('technologies'),accomplishments:value('accomplishments'),status:value('status'),
    priority:value('priority'),start_date,target_date,end_date};
}
export function field(form:FormData,name:string) { return String(form.get(name) ?? '').trim(); }

function Input({label,name,value,type='text',required=false}:{label:string;name:string;value?:string|null;type?:string;required?:boolean}) {
  return <label>{label}<input name={name} type={type} defaultValue={value ?? ''} required={required} maxLength={type==='text'?200:undefined}/></label>;
}
function Area({label,name,value}:{label:string;name:string;value?:string}) {
  return <label>{label}<textarea name={name} defaultValue={value} rows={3} maxLength={5000}/></label>;
}
function Select({label,name,value,options}:{label:string;name:string;value?:string;options:readonly string[]}) {
  return <label>{label}<select name={name} defaultValue={value}>{options.map(option=><option key={option}>{option}</option>)}</select></label>;
}
function ProjectFields({project,prefix='',optional=false,historical=false}:{project?:Project;prefix?:string;optional?:boolean;historical?:boolean}) {
  return <>
    <Input label={optional?'Project name (optional)':'Project name'} name={prefix+'name'} value={project?.name} required={!optional}/>
    <Input label="My role" name={prefix+'role'} value={project?.role}/>
    <Select label="Project status" name={prefix+'status'} value={project?.status ?? (historical?'Completed':'Not Started')} options={projectStatuses}/>
    <Select label="Priority" name={prefix+'priority'} value={project?.priority ?? 'Medium'} options={priorities}/>
    <Input type="date" label="Start date" name={prefix+'start_date'} value={project?.start_date}/>
    <Input type="date" label="Expected end date" name={prefix+'target_date'} value={project?.target_date}/>
    <Input type="date" label="Actual end date" name={prefix+'end_date'} value={project?.end_date}/>
    <Input label="Technologies / applications supported" name={prefix+'technologies'} value={project?.technologies}/>
    <Area label="Project description" name={prefix+'description'} value={project?.description}/>
    <Area label="Accomplishments" name={prefix+'accomplishments'} value={project?.accomplishments}/>
    <Area label="Project notes" name={prefix+'notes'} value={project?.notes}/>
  </>;
}

export function Editor({state,records,onClose,onSave}:{state:EditorState;records:Records;onClose:()=>void;onSave:(form:FormData)=>Promise<void>}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [client,setClient] = useState(state.kind==='client'?'':state.record?.client_id ?? state.client ?? '');
  const [project,setProject] = useState(state.kind==='action'?(state.record?.project_id ?? state.project ?? ''):'');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const action = state.kind==='action'?state.record:undefined;
  const title = (state.record?'Edit ':'New ') + (state.kind==='action'?'action item':state.kind==='client' && !state.record && state.historical?'historical client':state.kind);
  return <dialog ref={dialog} onCancel={event=>{event.preventDefault();if(!busyRef.current) onClose();}} aria-labelledby="editor-title">
    <header className="dialog-head"><h2 id="editor-title">{title}</h2><button className="icon-button" aria-label="Close editor" onClick={onClose} disabled={busy}><X size={20}/></button></header>
    <form onSubmit={async event=>{
      event.preventDefault();
      if (busyRef.current) return;
      const form = new FormData(event.currentTarget);
      busyRef.current = true;
      setBusy(true);
      setError('');
      try { await onSave(form); onClose(); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this record.'); }
      finally { busyRef.current=false; setBusy(false); }
    }}>
      <div className="form-grid">
        {state.kind==='client' ? <>
          <Input label="Client name" name="name" value={state.record?.name} required/>
          <Area label="Client notes" name="notes" value={state.record?.notes}/>
          {!state.record && <ProjectFields prefix="initial_" optional historical={state.historical}/>}
        </> : <>
          {state.kind==='action' && <Input label="Action item title" name="title" value={action?.title} required/>}
          <label>Client<select name="client_id" required={state.kind==='project'} value={client} onChange={event=>{setClient(event.target.value);setProject('');}}>
            <option value="">{state.kind==='project'?'Select a client':'No client'}</option>
            {records.clients.map(item=><option key={item.id} value={item.id}>{item.name}{item.archived?' (historical)':''}</option>)}
          </select></label>
          {state.kind==='project' ? <ProjectFields project={state.record} historical={records.clients.find(item=>item.id===client)?.archived}/> : <>
            <label>Project<select name="project_id" value={project} disabled={!client} onChange={event=>setProject(event.target.value)}>
              <option value="">No project</option>
              {records.projects.filter(item=>item.client_id===client).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <Select label="Priority" name="priority" value={action?.priority ?? 'Medium'} options={priorities}/>
            <Select label="Status" name="status" value={action?.status} options={actionStatuses}/>
            <Input type="date" label="Due date" name="due_date" value={action?.due_date}/>
            <Area label="Description" name="description" value={action?.description}/>
            <Area label="Notes" name="notes" value={action?.notes}/>
          </>}
        </>}
      </div>
      <footer className="dialog-footer">
        {error && <p className="error" role="alert">{error}</p>}
        <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="primary" disabled={busy}>{busy?'Saving…':'Save record'}</button>
      </footer>
    </form>
  </dialog>;
}
