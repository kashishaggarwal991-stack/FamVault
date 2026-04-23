import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AddMemberModal({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setLoading(false);
      setSubmittingId('');
      setMessage('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    const username = query.trim();
    if (!username) {
      setError('Enter a username to search.');
      setResults([]);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.get('/api/users/search', { params: { username } });
      setResults(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        setMessage('No available members found.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (memberId) => {
    setSubmittingId(memberId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.post('/api/family/request', { memberId });
      setResults((prev) => prev.filter((user) => user._id !== memberId));
      setMessage(data?.message || 'Request sent.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send request.');
    } finally {
      setSubmittingId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Add family member</h2>
            <p className="mt-1 text-sm text-slate-400">Search members by username and send a join request.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error ? <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
        {message ? <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}

        <div className="mt-5 space-y-3">
          {results.map((member) => (
            <div key={member._id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">{member.name}</p>
                <p className="text-sm text-slate-400">@{member.username} • {member.email}</p>
              </div>
              <button
                type="button"
                onClick={() => sendRequest(member._id)}
                disabled={submittingId === member._id}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingId === member._id ? 'Sending...' : 'Send request'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
