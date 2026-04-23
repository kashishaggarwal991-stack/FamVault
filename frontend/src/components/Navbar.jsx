// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';

// const roleStyles = {
//   admin: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30',
//   member: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30',
// };

// export default function Navbar({ onAddMember }) {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/login');
//   };

//   return (
//     <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
//       <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
//         <div>
//           <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Family Digital Vault</p>
//           <h1 className="mt-1 text-lg font-semibold text-white">Secure family archive</h1>
//         </div>

//         <div className="flex items-center gap-3">
//           {user ? (
//             <>
//               <div className="hidden text-right sm:block">
//                 <div className="text-sm font-semibold text-white">{user.name}</div>
//                 <div className="text-xs text-slate-400">{user.email}</div>
//               </div>
//               <span
//                 className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
//                   roleStyles[user.role] || roleStyles.member
//                 }`}
//               >
//                 {user.role || 'member'}
//               </span>
//               {user.role === 'admin' ? (
//                 <button
//                   type="button"
//                   onClick={onAddMember}
//                   className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
//                 >
//                   + Add Member
//                 </button>
//               ) : null}
//               <button
//                 type="button"
//                 onClick={handleLogout}
//                 className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
//               >
//                 Logout
//               </button>
//             </>
//           ) : null}
//         </div>
//       </div>
//     </header>
//   );
// }

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getEmergencyDocs, removeFromEmergency } from '../api/emergency';

const roleStyles = {
  admin: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30',
  member: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30',
};

export default function Navbar({ onAddMember, familyRefreshKey = 0, pinCount = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showFamily, setShowFamily] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [emergencyDocs, setEmergencyDocs] = useState([]);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyError, setEmergencyError] = useState('');
  const [removingId, setRemovingId] = useState('');
  const emergencyBtnRef = useRef(null);

  useEffect(() => {
    if (!user?.familyId) {
      setFamilyMembers([]);
      return;
    }

    api.get('/api/family/members')
      .then(({ data }) => setFamilyMembers(Array.isArray(data) ? data : []))
      .catch(() => setFamilyMembers([]));
  }, [familyRefreshKey, user?.familyId]);

  // Click outside to close emergency panel
  useEffect(() => {
    if (!showEmergency) return;
    const handleClick = (e) => {
      if (emergencyBtnRef.current && !emergencyBtnRef.current.contains(e.target)) {
        setShowEmergency(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showEmergency]);

  // Fetch emergency docs when panel opens
  useEffect(() => {
    if (!showEmergency) {
      setEmergencyDocs([]);
      return;
    }
    setEmergencyLoading(true);
    setEmergencyError('');
    getEmergencyDocs()
      .then(({ data }) => {
        setEmergencyDocs(Array.isArray(data.documents) ? data.documents : []);
      })
      .catch((err) => {
        setEmergencyError(err?.response?.data?.message || 'Failed to load emergency documents');
      })
      .finally(() => {
        setEmergencyLoading(false);
      });
  }, [showEmergency]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRemoveFromEmergency = async (documentId) => {
    setRemovingId(documentId);
    try {
      await removeFromEmergency(documentId);
      setEmergencyDocs((prev) => prev.filter((doc) => doc._id !== documentId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to remove from emergency');
    } finally {
      setRemovingId('');
    }
  };

  const handleEmergencyDocClick = (docId) => {
    setShowEmergency(false);
    navigate(`/documents/${docId}`);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Family Digital Vault</p>
          <h1 className="mt-1 text-lg font-semibold text-white">Secure family archive</h1>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Family members toggle */}
              {user.familyId && familyMembers.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFamily((v) => !v)}
                    className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
                  >
                    <span>Family</span>
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-300">
                      {familyMembers.length}
                    </span>
                  </button>

                  {showFamily && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-xl">
                      <p className="mb-2 text-xs uppercase tracking-widest text-slate-500">Family members</p>
                      <div className="space-y-2">
                        {familyMembers.map((member) => (
                          <div key={member._id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{member.name}</p>
                              <p className="truncate text-xs text-slate-400">@{member.username}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                                roleStyles[member.role] || roleStyles.member
                              }`}
                            >
                              {member.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Emergency tab */}
              {user.familyId && (
                <div className="relative" ref={emergencyBtnRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmergency((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
                  >
                    <span className="text-lg">⚠</span>
                    <span>Emergency</span>
                    {emergencyDocs.length > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                        {emergencyDocs.length}
                      </span>
                    )}
                  </button>

                  {showEmergency && (
                    <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-rose-400/20 bg-slate-900 p-3 shadow-xl">
                      <p className="mb-3 text-sm font-bold text-rose-300">🚨 Emergency Documents</p>
                      {emergencyLoading ? (
                        <div className="flex items-center justify-center py-4 text-slate-400">
                          <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </div>
                      ) : emergencyError ? (
                        <p className="text-sm text-rose-300">{emergencyError}</p>
                      ) : emergencyDocs.length === 0 ? (
                        <p className="text-sm text-slate-400">No emergency documents added yet</p>
                      ) : (
                        <div className="space-y-2">
                          {emergencyDocs.map((doc) => {
                            const displayName = doc.label?.trim() || doc.originalName || 'Untitled document';
                            return (
                              <div
                                key={doc._id}
                                className="group relative flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 transition hover:border-rose-400/50 hover:bg-rose-500/10"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleEmergencyDocClick(doc._id)}
                                  className="flex-1 text-left"
                                >
                                  <p className="truncate text-sm font-medium text-white group-hover:text-rose-200">
                                    {displayName}
                                  </p>
                                  <p className="truncate text-xs text-slate-400">{doc.category || 'Uncategorized'}</p>
                                </button>
                                {user.role === 'admin' && (
                                  <button
                                    type="button"
                                    disabled={removingId === doc._id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromEmergency(doc._id);
                                    }}
                                    className="hidden shrink-0 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 group-hover:block disabled:cursor-not-allowed disabled:opacity-60 sm:block"
                                  >
                                    {removingId === doc._id ? 'Removing...' : '✕'}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {pinCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/dashboard#pinned');
                    window.setTimeout(() => {
                      document.getElementById('pinned')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                  }}
                  className="hidden items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 hover:text-white sm:flex"
                  title="Pinned documents"
                >
                  <Pin className="h-4 w-4" fill="currentColor" />
                  <span>{pinCount}</span>
                </button>
              ) : null}

              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-slate-400">{user.email}</div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  roleStyles[user.role] || roleStyles.member
                }`}
              >
                {user.role || 'member'}
              </span>
              {user.role === 'admin' ? (
                <button
                  type="button"
                  onClick={onAddMember}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400"
                >
                  + Add Member
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
