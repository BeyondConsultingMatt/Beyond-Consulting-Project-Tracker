'use server';
import {redirect} from 'next/navigation';
import {configured} from '../../lib/config';
import {database} from '../../lib/server';

type Result = {message: string; success?: boolean};
export async function authenticate(_: Result, form: FormData): Promise<Result> {
  if (!configured) return {message:'Connect your Supabase development project first.'};
  const mode = form.get('mode');
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const db = await database();
  if (mode === 'request') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return {message:'Enter a valid email address.'};
    const origin = process.env.APP_URL;
    if (!origin) return {message:'Set APP_URL before requesting a reset.'};
    await db.auth.resetPasswordForEmail(email, {redirectTo: new URL('/auth/confirm', origin).href});
    return {message:'If the account can receive reset emails, a link will arrive shortly.',success:true};
  }
  if (mode === 'update') {
    if (password.length < 12 || password.length > 72) return {message:'Use a password between 12 and 72 characters.'};
    const {data:{user}} = await db.auth.getUser();
    if (!user || !(await db.from('users').select('id').eq('id',user.id).maybeSingle()).data) return {message:'Open a new reset link to continue.'};
    const {error} = await db.auth.updateUser({password});
    if (error) return {message:'Password could not be updated. Try a fresh reset link.'};
    await db.auth.signOut({scope:'global'});
    redirect('/login?updated=1');
  }
  if (mode !== 'login' || !email || !password || email.length > 254 || password.length > 256) return {message:'Enter your email and password.'};
  const {data,error} = await db.auth.signInWithPassword({email,password});
  if (error || !data.user) return {message:'Sign-in failed. Check your email and password.'};
  const profile = await db.from('users').select('id').eq('id',data.user.id).maybeSingle();
  if (!profile.data) {
    await db.auth.signOut({scope:'local'});
    return {message:'This account does not have dashboard access.'};
  }
  redirect('/');
}

export async function signOut() {
  if (configured) await (await database()).auth.signOut({scope:'local'});
  redirect('/login');
}
