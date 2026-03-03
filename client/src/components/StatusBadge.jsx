export default function StatusBadge({ status }) {
    const styles = {
        scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
        in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
        completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        cancelled: 'bg-red-100 text-red-700 border-red-200',
        active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        expired: 'bg-slate-100 text-slate-600 border-slate-200',
        payment_failed: 'bg-red-100 text-red-700 border-red-200',
    };

    const labels = {
        scheduled: 'Scheduled',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
        active: 'Active',
        expired: 'Expired',
        payment_failed: 'Payment Failed',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'completed' || status === 'active' ? 'bg-emerald-500' :
                    status === 'in_progress' ? 'bg-amber-500' :
                        status === 'scheduled' ? 'bg-blue-500' :
                            'bg-red-500'
                }`}></span>
            {labels[status] || status}
        </span>
    );
}
