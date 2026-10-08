'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, Monitor, ShieldCheck, Square } from 'lucide-react';
import type { RunState } from '@/types/visa';
export default function LiveBrowserView({ run, busy, bn, onResume, onStop }: { run?: RunState; busy: boolean; bn: boolean; onResume: (otp?: string) => void; onStop: () => void }) {
  const [otp, setOtp] = useState('');
  useEffect(() => setOtp(''), [run?.id]);
  const t = (en: string, text: string) => bn ? text : en;
  const checkpoint = run?.result?.checkpoint, stopped = run?.status === 'cancelled';
  return <section className="card overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 p-4"><h2 className="flex items-center gap-2 font-semibold"><Monitor size={17}/>{t('Live browser','লাইভ ব্রাউজার')}</h2>
      <div className="flex gap-3">{run?.liveViewUrl && !stopped && <a className="text-xs" href={run.liveViewUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{t('Open preview','প্রিভিউ খুলুন')} <ExternalLink size={12} className="inline"/></a>}
      {run && !stopped && <button className="secondary" disabled={busy} onClick={onStop}><Square size={12}/>{t('Stop & clean up','বন্ধ ও পরিষ্কার করুন')}</button>}</div></div>
    <div className="h-[360px] bg-white sm:h-[460px]">{run?.liveViewUrl && !stopped ? <iframe title={t('Cloud live view','ক্লাউড লাইভ ভিউ')} src={run.liveViewUrl} referrerPolicy="no-referrer" allow="fullscreen" className="h-full w-full border-0"/> : <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500"><Monitor size={36}/><p className="text-sm">{t('No live browser attached','লাইভ ব্রাউজার যুক্ত নেই')}</p></div>}</div>
    {(checkpoint === 'otp_required' || checkpoint === 'review_required') && !stopped && <div role="alert" className="border-t border-amber-200 bg-amber-50 p-4"><h3 className="flex items-center gap-2 font-semibold text-amber-900"><ShieldCheck size={17}/>{checkpoint === 'otp_required' ? t('OTP required','OTP প্রয়োজন') : t('Human review required','মানব পর্যালোচনা প্রয়োজন')}</h3><p className="my-2 text-sm">{run?.result?.message}</p><form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); const code = checkpoint === 'otp_required' ? otp : undefined; setOtp(''); onResume(code); }}>{checkpoint === 'otp_required' && <input aria-label="OTP" type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g,'').slice(0,6))} className="field w-40"/>}<button className="primary" disabled={busy || (checkpoint === 'otp_required' && otp.length !== 6)}>{t('Verify / continue','যাচাই / চালিয়ে যান')}</button></form></div>}
    <p className="border-t border-zinc-200 p-3 text-xs leading-5 text-zinc-500">{t('Preview URLs are credentials. Closing the page does not stop billing. Use Open preview if embedding is blocked.','প্রিভিউ লিংক গোপন রাখুন। পেজ বন্ধ করলে বিলিং বন্ধ হয় না। এমবেড কাজ না করলে প্রিভিউ লিংক খুলুন।')}</p>
  </section>;
}
