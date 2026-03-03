import StatusBadge from './StatusBadge';

export default function ServiceCard({ service, onStatusUpdate, showActions = true }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all hover:border-sky-200 group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <h3 className="font-semibold text-navy-900 group-hover:text-sky-600 transition">{service.appliance_name}</h3>
                    <p className="text-sm text-slate-500">{service.property_name || service.category}</p>
                </div>
                <StatusBadge status={service.status} />
            </div>

            <div className="space-y-1.5 text-sm">
                {service.vendor_name && (
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Vendor</span>
                        <span className="font-medium text-navy-900">{service.vendor_name}</span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Scheduled</span>
                    <span className="font-medium">{service.scheduled_date || '—'}</span>
                </div>
                {service.completed_date && (
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Completed</span>
                        <span className="font-medium text-emerald-600">{service.completed_date}</span>
                    </div>
                )}
                {service.cost > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Cost</span>
                        <span className="font-bold text-navy-900">₹{service.cost.toFixed(2)}</span>
                    </div>
                )}
            </div>

            {service.notes && (
                <p className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-2">{service.notes}</p>
            )}

            {showActions && onStatusUpdate && service.status !== 'completed' && service.status !== 'cancelled' && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    {service.status === 'scheduled' && (
                        <button
                            onClick={() => onStatusUpdate(service.id, 'in_progress')}
                            className="flex-1 bg-amber-50 text-amber-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-amber-100 transition"
                        >
                            Start
                        </button>
                    )}
                    {(service.status === 'scheduled' || service.status === 'in_progress') && (
                        <>
                            <button
                                onClick={() => onStatusUpdate(service.id, 'completed')}
                                className="flex-1 bg-emerald-50 text-emerald-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-emerald-100 transition"
                            >
                                Complete
                            </button>
                            <button
                                onClick={() => onStatusUpdate(service.id, 'cancelled')}
                                className="flex-1 bg-red-50 text-red-600 text-xs font-semibold py-1.5 rounded-lg hover:bg-red-100 transition"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
