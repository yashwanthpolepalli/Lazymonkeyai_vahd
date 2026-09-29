import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import type { CustomerProfile } from '@/types/customer';

export function MemberCard({ profile }: { profile: CustomerProfile }) {
  const memberId = profile.member_code || `CUS-${profile.id}`;

  return (
    <div className="card p-6 bg-gradient-to-br from-navy-900 via-brand-900 to-navy-950 text-white relative overflow-hidden shadow-2xl border border-brand-500/20">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 80% 20%, rgba(59,130,246,0.5) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(168,85,247,0.3) 0%, transparent 50%)',
        }}
      />

      <div className="relative flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
            {profile.profile_image ? (
              <img src={profile.profile_image} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-brand-300">
                {profile.full_name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono tracking-widest text-brand-300 uppercase font-bold">DIGITAL MEMBER ID</span>
              <Badge variant="success" dot>Active</Badge>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">{profile.full_name}</h2>
            <div className="text-xs text-navy-200 font-mono font-semibold mt-0.5">ID: {memberId}</div>
            <div className="text-xs text-brand-200 mt-1 font-medium capitalize">{profile.membership?.plan_name || 'No Active Plan'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
