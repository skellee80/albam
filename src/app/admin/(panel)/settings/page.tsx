import Link from 'next/link';

import { SettingsForm } from '@/components/admin/SettingsForm';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="px-1 font-display text-[1.4rem]">설정</h1>
      <SettingsForm settings={settings} />

      <p className="mt-6 rounded-xl bg-burr-tint px-4 py-3.5 text-[0.83rem] leading-relaxed text-burr-deep">
        관리자 비밀번호와 입금 문자 연동 토큰은 이 화면에서 바꾸지 않습니다. 서버에 따로 보관되어
        있어, 바꾸려면 README의 <b>시크릿 바꾸기</b> 안내를 따라야 합니다.
      </p>

      {/*
        평소 쓸 일이 없는 도구라 메뉴에 넣지 않고 여기에만 둔다.
        메뉴가 늘어나면 아버지가 매일 쓰는 네 칸이 흐려진다.
      */}
      <Link
        href="/admin/test"
        className="mt-3 flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5"
      >
        <span>
          <span className="block text-[0.92rem] font-semibold">입금 문자 테스트</span>
          <span className="mt-0.5 block text-[0.8rem] text-ink-soft">
            입금이 들어왔을 때 어떻게 처리되는지 미리 확인합니다
          </span>
        </span>
        <span className="shrink-0 text-ink-faint">›</span>
      </Link>
    </div>
  );
}
