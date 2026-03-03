import { HiOutlineStar, HiStar } from 'react-icons/hi';

export default function VendorCard({ vendor, onSelect, selected }) {
    const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(vendor.rating));

    return (
        <div
            className={`bg-white rounded-xl border p-4 hover:shadow-lg transition-all cursor-pointer ${selected ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-lg' : 'border-slate-200 hover:border-sky-200'
                }`}
            onClick={() => onSelect && onSelect(vendor)}
        >
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-blue-100 rounded-xl flex items-center justify-center text-sky-600 font-bold text-lg flex-shrink-0">
                    {vendor.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-navy-900 truncate">{vendor.name}</h3>
                    <p className="text-sm text-slate-500">{vendor.category}</p>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                    {stars.map((filled, i) => filled ? (
                        <HiStar key={i} className="w-4 h-4 text-amber-400" />
                    ) : (
                        <HiOutlineStar key={i} className="w-4 h-4 text-slate-300" />
                    ))}
                    <span className="ml-1.5 text-sm font-semibold text-navy-900">{vendor.rating}</span>
                </div>
                <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                    {vendor.total_jobs} jobs
                </span>
            </div>

            {(vendor.phone || vendor.email) && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                    {vendor.phone && <p>📞 {vendor.phone}</p>}
                    {vendor.email && <p>✉️ {vendor.email}</p>}
                </div>
            )}
        </div>
    );
}
