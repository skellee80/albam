import type { Metadata } from 'next';

import { SiteHeader } from '@/components/SiteHeader';
import { TrackForm } from '@/components/TrackForm';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '배송 조회',
  robots: { index: false, follow: false },
};

export default async function TrackPage() {
  const settings = await getSettings();

  return (
    <>
      <SiteHeader active="track" />
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-6 pb-10">
        <h1 className="px-1 font-display text-[1.5rem]">배송 조회</h1>
        <p className="mt-1.5 px-1 text-[0.9rem] leading-relaxed text-ink-soft">
          주문할 때 적은 입금자명과 연락처를 넣으면 진행 상태를 볼 수 있습니다.
        </p>

        <TrackForm contactPhone={settings.contactPhone} />
      </main>
    </>
  );
}
