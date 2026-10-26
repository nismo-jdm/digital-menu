import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, configured, db } from '../firebase.js';
import SetupNotice from '../components/SetupNotice.jsx';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';

function Centered({ children }) {
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">{children}</main>;
}

function NotAdmin({ user }) {
  return (
    <Centered>
      <h1 className="text-3xl font-bold tracking-tight">No admin access yet</h1>
      <p className="mt-3 text-muted">
        You are signed in as <strong className="text-fg">{user.email}</strong>, but this account has not been approved
        as an admin.
      </p>
      <p className="mt-3 text-muted">Send this ID to the restaurant owner so they can approve it:</p>
      <p className="mt-2 select-all break-all rounded-md border border-line bg-surface p-3 font-mono text-sm">
        {user.uid}
      </p>
      <div className="mt-6 flex gap-3">
        <button type="button" className="btn" onClick={() => signOut(auth)}>
          Sign out
        </button>
        <Link to="/" className="btn">
          Back to the menu
        </Link>
      </div>
    </Centered>
  );
}

export default function Admin() {
  const [user, setUser] = useState(undefined); // undefined while Firebase checks the saved session
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAdmin(null);
      if (!u) return;
      try {
        const snap = await getDoc(doc(db, 'admins', u.uid));
        setIsAdmin(snap.exists());
      } catch {
        setIsAdmin(false);
      }
    });
  }, []);

  if (!configured) return <SetupNotice />;
  if (user === undefined || (user && isAdmin === null)) {
    return (
      <Centered>
        <p className="text-muted">Loading...</p>
      </Centered>
    );
  }
  if (!user) return <Login />;
  if (!isAdmin) return <NotAdmin user={user} />;
  return <Dashboard user={user} />;
}
