import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { auth } from '../firebase.js';

function explain(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'The email or password is incorrect.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact the restaurant owner.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, or reset your password.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    default:
      return 'Could not sign in. Try again.';
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setNote('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(explain(err.code));
      setBusy(false);
    }
  }

  async function reset() {
    setError('');
    setNote('');
    if (!email.trim()) {
      setError('Enter your email above, then choose Forgot password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      if (err.code === 'auth/invalid-email') {
        setError('Enter a valid email address.');
        return;
      }
      if (err.code === 'auth/network-request-failed') {
        setError('No connection. Check your internet and try again.');
        return;
      }
      // For any other result, say the same thing so the form never reveals which emails have accounts.
    }
    setNote('If an admin account exists for that email, a reset link is on its way. Check your inbox and spam folder.');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Admin sign in</h1>
      <p className="mt-2 text-muted">Sign in with the email and password for your admin account.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-muted"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="text-sm font-medium text-accent">
            {note}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary w-full">
          {busy ? 'Signing in...' : 'Sign in'}
        </button>
        <button type="button" onClick={reset} className="w-full text-center text-sm font-semibold text-accent underline">
          Forgot password
        </button>
      </form>

      <Link to="/" className="mt-10 text-sm text-muted underline">
        Back to the menu
      </Link>
    </main>
  );
}
