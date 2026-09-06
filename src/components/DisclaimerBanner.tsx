import { DISCLAIMER } from '@/lib/legal/constants';

export function DisclaimerBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <p className="mx-auto max-w-5xl px-4 py-2 text-xs sm:text-sm">
        <span className="font-semibold">Aviso:</span> {DISCLAIMER}
      </p>
    </div>
  );
}
