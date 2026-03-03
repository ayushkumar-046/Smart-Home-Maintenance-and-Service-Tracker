import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [appliances, setAppliances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [uploadForm, setUploadForm] = useState({ file: null, appliance_id: '', type: 'warranty' });

    useEffect(() => { fetchAll(); }, []);

    async function fetchAll() {
        try {
            const [docRes, appRes] = await Promise.all([
                axios.get('/api/documents'),
                axios.get('/api/appliances').catch(() => ({ data: { appliances: [] } }))
            ]);
            setDocuments(docRes.data.documents);
            setAppliances(appRes.data.appliances);
        } catch { toast.error('Failed to load'); }
        finally { setLoading(false); }
    }

    async function handleUpload(e) {
        e.preventDefault();
        if (!uploadForm.file) return toast.error('Select a file');
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', uploadForm.file);
            formData.append('type', uploadForm.type);
            if (uploadForm.appliance_id) formData.append('appliance_id', uploadForm.appliance_id);

            await axios.post('/api/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Document uploaded!');
            setShowUpload(false);
            setUploadForm({ file: null, appliance_id: '', type: 'warranty' });
            fetchAll();
        } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
        finally { setUploading(false); }
    }

    async function handleDownload(id, filename) {
        try {
            const response = await axios.get(`/api/documents/download/${id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch { toast.error('Download failed'); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this document?')) return;
        try { await axios.delete(`/api/documents/${id}`); toast.success('Deleted'); fetchAll(); }
        catch { toast.error('Failed'); }
    }

    const typeIcon = { warranty: '📄', invoice: '🧾', report: '📊', general: '📎' };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Documents 📄</h1>
                    <p className="text-slate-500 mt-1">{documents.length} documents stored</p>
                </div>
                <button onClick={() => setShowUpload(!showUpload)} className="bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                    {showUpload ? 'Cancel' : '⬆ Upload'}
                </button>
            </div>

            {showUpload && (
                <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in">
                    <h3 className="font-semibold text-navy-900 mb-4">Upload Document</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">File (PDF, JPG, PNG, max 5MB) *</label>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Type</label>
                            <select value={uploadForm.type} onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="warranty">Warranty</option>
                                <option value="invoice">Invoice</option>
                                <option value="report">Service Report</option>
                                <option value="general">General</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-navy-900 mb-1">Appliance (optional)</label>
                            <select value={uploadForm.appliance_id} onChange={e => setUploadForm({ ...uploadForm, appliance_id: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white">
                                <option value="">None</option>
                                {appliances.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={uploading} className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2">
                        {uploading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                        {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </form>
            )}

            {documents.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-5xl mb-4">📂</p>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No documents yet</h3>
                    <p className="text-slate-500">Upload warranties, invoices, or service reports.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Document</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Appliance</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Uploaded</th>
                                <th className="text-left px-4 py-3 font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {documents.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 flex items-center gap-2">
                                        <span className="text-lg">{typeIcon[d.type] || '📎'}</span>
                                        <span className="font-medium text-navy-900 truncate max-w-[200px]">{d.filename}</span>
                                    </td>
                                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 rounded-lg text-xs font-medium capitalize">{d.type}</span></td>
                                    <td className="px-4 py-3 text-slate-600">{d.appliance_name || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{new Date(d.uploaded_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDownload(d.id, d.filename)} className="text-sky-500 hover:text-sky-600 text-sm font-medium">Download</button>
                                            <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-600 text-sm font-medium">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
