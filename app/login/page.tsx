import {configured} from '../../lib/config';
import LoginForm from './form';
import {Brand} from '../ui';

export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const params = await searchParams;
  const mode = params.mode === 'request' || params.mode === 'update' ? params.mode : 'login';
  return <main className="login"><section className="login-card panel">
    <Brand/>
    {configured ? <LoginForm key={mode} mode={mode} expired={params.expired === '1'} updated={params.updated === '1'}/> : <>
      <h1>Connect your workspace</h1>
      <p>Set up your Supabase development project, then restart the app to sign in.</p>
      <p className="notice">Follow the local setup steps in the project README.</p>
    </>}
  </section></main>;
}
