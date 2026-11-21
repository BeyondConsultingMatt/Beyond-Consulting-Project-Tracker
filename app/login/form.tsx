'use client';
import {useActionState} from 'react';
import Link from 'next/link';
import {authenticate} from '../auth/actions';

export default function LoginForm({mode,expired,updated}:{mode:string;expired:boolean;updated:boolean}) {
  const [state,action,pending] = useActionState(authenticate,{message:''});
  return <>
    <h1>{mode === 'login' ? 'Sign in' : mode === 'request' ? 'Reset password' : 'Set a new password'}</h1>
    {expired && <p className="notice" role="status">This reset link has expired or was already used.</p>}
    {updated && <p className="notice" role="status">Password updated. Sign in with your new password.</p>}
    <form action={action} className="stack">
      <input type="hidden" name="mode" value={mode}/>
      {mode !== 'update' && <label>Email address<input name="email" type="email" autoComplete="username" maxLength={254} required/></label>}
      {mode !== 'request' && <label>{mode === 'update' ? 'New password' : 'Password'}<input name="password" type="password" autoComplete={mode === 'update' ? 'new-password' : 'current-password'} minLength={mode === 'update' ? 12 : undefined} maxLength={mode === 'update' ? 72 : 256} required/></label>}
      {state.message && <p className={state.success ? 'notice' : 'error'} role="status">{state.message}</p>}
      <button className="primary" disabled={pending}>{pending ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'request' ? 'Send reset link' : 'Update password'}</button>
    </form>
    <Link href={mode === 'login' ? '/login?mode=request' : '/login'}>{mode === 'login' ? 'Forgot password?' : 'Back to sign in'}</Link>
  </>;
}
