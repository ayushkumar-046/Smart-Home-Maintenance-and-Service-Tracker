export default function WarrantyAlert({ appliances }) {
    if (!appliances) return null;

    const today = new Date();
    const expiringAppliances = appliances.filter(a => {
        if (!a.warranty_expiry) return false;
        const expiry = new Date(a.warranty_expiry);
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return daysUntil > 0 && daysUntil <= 30;
    }).map(a => {
        const expiry = new Date(a.warranty_expiry);
        const daysUntil = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return { ...a, daysUntil };
    });

    const expiredAppliances = appliances.filter(a => {
        if (!a.warranty_expiry) return false;
        return new Date(a.warranty_expiry) < today;
    });

    if (expiringAppliances.length === 0 && expiredAppliances.length === 0) return null;

    return (
        <div className="space-y-3">
            {expiringAppliances.map(a => (
                <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">⚠️</span>
                    </div>
                    <div>
                        <h4 className="font-semibold text-amber-800">Warranty Expiring Soon</h4>
                        <p className="text-sm text-amber-700">
                            <span className="font-medium">{a.name}</span> ({a.brand} {a.model}) warranty expires in{' '}
                            <span className="font-bold">{a.daysUntil} day{a.daysUntil !== 1 ? 's' : ''}</span> on {a.warranty_expiry}.
                        </p>
                    </div>
                </div>
            ))}

            {expiredAppliances.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">🚨</span>
                    </div>
                    <div>
                        <h4 className="font-semibold text-red-800">{expiredAppliances.length} Expired Warrant{expiredAppliances.length > 1 ? 'ies' : 'y'}</h4>
                        <p className="text-sm text-red-700">
                            {expiredAppliances.map(a => a.name).join(', ')} — warranties have expired. Consider extended warranty or service plans.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
