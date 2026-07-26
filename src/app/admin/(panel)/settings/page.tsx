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
    </div>
  );
}
