import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function UploadModal({ open, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [protectDocument, setProtectDocument] = useState(false);
  const [documentPassword, setDocumentPassword] = useState('');
  const [confirmDocumentPassword, setConfirmDocumentPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successProtected, setSuccessProtected] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setLabel('');
      setProtectDocument(false);
      setDocumentPassword('');
      setConfirmDocumentPassword('');
      setUploading(false);
      setError('');
      setSuccessProtected(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError('Please choose a PDF or image file.');
      return;
    }

    if (protectDocument) {
      if (documentPassword.length < 4) {
        setError('Document password must be at least 4 characters.');
        return;
      }

      if (documentPassword !== confirmDocumentPassword) {
        setError('Document passwords do not match.');
        return;
      }
    }

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (label.trim()) formData.append('label', label.trim());
      formData.append('isPasswordProtected', protectDocument ? 'true' : 'false');
      if (protectDocument) formData.append('documentPassword', documentPassword);

      const { data } = await api.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccessProtected(protectDocument);
      onUploaded?.(data.document || data);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const passwordsMatch =
    protectDocument &&
    documentPassword.length >= 4 &&
    confirmDocumentPassword.length > 0 &&
    documentPassword === confirmDocumentPassword;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Upload document</h2>
            <p className="mt-1 text-sm text-slate-400">PDF, JPG, PNG or WEBP up to 10 MB.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">File</span>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full cursor-pointer rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Label (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Dad's Aadhaar"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={protectDocument}
                onChange={(e) => setProtectDocument(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <span>
                <span className="block font-medium text-slate-200">Protect this document with a password</span>
                <span className="mt-1 block text-sm text-slate-400">Require a document password before this file opens.</span>
              </span>
            </label>

            <div className={`grid transition-all duration-300 ${protectDocument ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Document Password</span>
                    <input
                      type="password"
                      value={documentPassword}
                      onChange={(e) => setDocumentPassword(e.target.value)}
                      placeholder="Enter document password"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
                    />
                    <span className={`mt-1 block text-xs ${documentPassword.length >= 4 ? 'text-emerald-300' : 'text-slate-500'}`}>
                      {documentPassword.length}/4 characters minimum
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">Confirm Password</span>
                    <input
                      type="password"
                      value={confirmDocumentPassword}
                      onChange={(e) => setConfirmDocumentPassword(e.target.value)}
                      placeholder="Confirm document password"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/20"
                    />
                    {confirmDocumentPassword ? (
                      <span className={`mt-1 block text-xs font-medium ${passwordsMatch ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}
                      </span>
                    ) : null}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          {successProtected ? <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">🔒 Uploaded with password protection.</p> : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-5 py-2 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
