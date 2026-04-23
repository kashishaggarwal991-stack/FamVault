import { Link } from 'react-router-dom';
import { Pin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const categoryStyles = {
  'Identity Proof': 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/30',
  'Medical Record': 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30',
  'Insurance Policy': 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/30',
  'Financial Document': 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
  'Educational Certificate': 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30',
  'Legal Document': 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30',
  'Property Document': 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/30',
  'Tax Document': 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30',
  Uncategorized: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/30',
  Other: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-400/30',
};

const statusStyles = {
  pending: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  done: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  failed: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
};

const Spinner = () => (
  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

export default function DocumentCard({
  document,
  onDelete,
  isPinned = false,
  onPinToggle,
  pinLoading = false,
  variant = 'default',
}) {
  const { user } = useAuth();
  const uploaderId = document?.uploadedBy?._id || document?.uploadedBy?.id || document?.uploadedBy;
  const canDelete = user?.role === 'admin' || (user?._id && uploaderId && String(user._id) === String(uploaderId));
  const tags = Array.isArray(document?.tags) ? document.tags.slice(0, 3) : [];
  const displayName = document?.label?.trim() || document?.originalName || 'Untitled document';

  const statusLabel =
    document?.aiStatus === 'pending' ? 'Processing' : document?.aiStatus === 'done' ? 'Ready' : 'Failed';
  const isPinnedVariant = variant === 'pinned';

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border p-5 pr-14 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:bg-slate-900 ${
        isPinnedVariant
          ? 'border-l-4 border-l-amber-400/70 border-white/10 bg-amber-500/[0.06]'
          : 'border-white/10 bg-slate-900/70'
      }`}
    >
      {onPinToggle ? (
        <button
          type="button"
          title={isPinned ? 'Unpin document' : 'Pin document'}
          aria-label={isPinned ? 'Unpin document' : 'Pin document'}
          disabled={pinLoading}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onPinToggle(document._id, isPinned);
          }}
          className={`absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 ${
            isPinned ? 'text-amber-300' : 'text-slate-400 hover:text-white'
          }`}
        >
          {pinLoading ? (
            <Spinner />
          ) : (
            <Pin className="h-5 w-5" fill={isPinned ? 'currentColor' : 'none'} />
          )}
        </button>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={`/documents/${document._id}`} className="flex min-w-0 items-center gap-2">
            {document.isPasswordProtected ? (
              <span
                title="Password protected"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10 text-sm text-amber-200"
              >
                🔒
              </span>
            ) : null}
            <h3 className="truncate text-lg font-semibold text-white transition group-hover:text-sky-300">
              {displayName}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-slate-400 truncate">{document.originalName}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            categoryStyles[document.category] || categoryStyles.Other
          }`}
        >
          {document.category || 'Other'}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
        {document.aiStatus === 'pending' ? <Spinner /> : null}
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[document.aiStatus] || statusStyles.pending}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10">
              #{tag}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No tags yet</span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-400">
        <p>
          Uploaded by <span className="font-medium text-slate-200">{document?.uploadedBy?.name || 'Unknown'}</span>{' '}
          <span className="text-slate-500">({document?.uploadedBy?.role || 'member'})</span>
        </p>
        <p>{new Date(document.createdAt).toLocaleString()}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Link
          to={`/documents/${document._id}`}
          className="inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
        >
          Open
        </Link>

        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(document._id)}
            className="inline-flex items-center rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-rose-100"
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  );
}
