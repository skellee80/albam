'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  provider: 'email' | 'google';
  createdAt: string;
}

export default function FarmIntro() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { currentUser, userData, logout } = useAuth();

  // 관리자 세션 및 사용자 로그인 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }

  }, []);

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };
  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">상품</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link nav-link-active">농장 이야기</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">공지사항</Link>
            {isAdmin && (
              <>
                <Link href="/admin" className="nav-link">
                  📊 주문 현황
                </Link>
                <button onClick={async () => {
                  setIsAdmin(false);
                  localStorage.removeItem('adminSession');
                  try {
                    await logout();
                  } catch (error) {
                    console.error('Firebase 로그아웃 오류:', error);
                  }
                }} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                  관리자 로그아웃
                </button>
              </>
            )}
            {currentUser && userData && localStorage.getItem('adminSession') !== 'true' ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <div style={{
                  color: 'white', 
                  fontSize: '0.85rem'
                }}>
                  안녕하세요, {userData.name}님! ✨
                </div>
                <Link href="/mypage" className="nav-link" style={{background: 'none'}}>
                  👤 마이페이지
                </Link>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="nav-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : localStorage.getItem('adminSession') !== 'true' ? (
              <Link href="/auth" className="nav-link">
                🔐 로그인
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      <div className="container">
        <h1 style={{textAlign: 'center', color: 'var(--primary-brown)', marginBottom: '3rem'}}>
          🚜 청양 칠갑산 알밤 농장 이야기
        </h1>

        {/* 농장주 소개 */}
        <section className="card">
          <h2>👨‍🌾 농장주 이기영을 소개합니다</h2>
          <div className="farmer-intro-layout">
            <div style={{
              width: '200px',
              height: '200px',
              background: 'var(--autumn-gradient)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              color: 'white',
              margin: '0 auto'
            }}>
              👨‍🌾
            </div>
            <div>
              <h3>30년 경력의 알밤 재배 전문가</h3>
              <p>
                안녕하세요, 청양 칠갑산 알밤 농장의 이기영입니다. 1994년부터 충남 청양에서 
                알밤 재배에만 전념해온 지 벌써 30년이 되었습니다. 
              </p>
              <p>
                처음에는 작은 밭에서 시작했지만, 꾸준한 연구와 노력을 통해 
                지금은 청양 지역에서 손꼽히는 알밤 농장으로 성장했습니다.
              </p>
              <p>
                &ldquo;정직하고 건강한 농산물로 고객의 건강과 행복에 기여한다&rdquo;는 
                마음가짐으로 매일 농장을 돌보고 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 농장 특징 */}
        <section className="card">
          <h2>🌱 청양 칠갑산 알밤 농장의 특별함</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              background: 'var(--soft-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🌿</div>
              <h3>무농약 재배</h3>
              <p>
                화학 농약을 일절 사용하지 않고 천연 방법으로만 재배합니다. 
                건강한 토양에서 자란 알밤은 맛과 영양이 풍부합니다.
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--soft-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🏔️</div>
              <h3>청정 자연환경</h3>
              <p>
                청양의 깨끗한 공기와 맑은 물, 비옥한 토양에서 재배되는 
                알밤은 자연 그대로의 단맛과 고소함을 자랑합니다.
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--soft-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🔬</div>
              <h3>과학적 재배법</h3>
              <p>
                전통적인 재배 방법과 현대적인 농업 기술을 접목하여 
                최고 품질의 알밤을 생산하고 있습니다.
              </p>
            </div>
          </div>
        </section>

        {/* 농장 연혁 */}
        <section className="card">
          <h2>📅 농장 연혁</h2>
          
          <div style={{position: 'relative', paddingLeft: '2rem'}}>
            <div style={{
              position: 'absolute',
              left: '0',
              top: '0',
              bottom: '0',
              width: '3px',
              background: 'var(--autumn-gradient)'
            }}></div>

            <div style={{marginBottom: '2rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.5rem',
                width: '12px',
                height: '12px',
                background: 'var(--warm-orange)',
                borderRadius: '50%'
              }}></div>
              <h3>1994년</h3>
              <p>청양 칠갑산 알밤 농장 설립, 첫 알밤 재배 시작 (1,000평)</p>
            </div>

            <div style={{marginBottom: '2rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.5rem',
                width: '12px',
                height: '12px',
                background: 'var(--warm-orange)',
                borderRadius: '50%'
              }}></div>
              <h3>2001년</h3>
              <p>농장 확장 (3,000평), 무농약 재배 방식 도입</p>
            </div>

            <div style={{marginBottom: '2rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.5rem',
                width: '12px',
                height: '12px',
                background: 'var(--warm-orange)',
                borderRadius: '50%'
              }}></div>
              <h3>2010년</h3>
              <p>친환경 인증 획득, 온라인 직판 시작</p>
            </div>

            <div style={{marginBottom: '2rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.5rem',
                width: '12px',
                height: '12px',
                background: 'var(--warm-orange)',
                borderRadius: '50%'
              }}></div>
              <h3>2018년</h3>
              <p>농장 현대화 작업 완료, 저온 저장 시설 도입</p>
            </div>

            <div style={{position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-1.5rem',
                top: '0.5rem',
                width: '12px',
                height: '12px',
                background: 'var(--warm-orange)',
                borderRadius: '50%'
              }}></div>
              <h3>2024년</h3>
              <p>창립 30주년, 연간 50톤 생산 규모 달성</p>
            </div>
          </div>
        </section>

        {/* 인증 및 수상 */}
        <section className="card">
          <h2>🏆 인증 및 수상 내역</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem'}}>
            <div style={{
              padding: '1rem',
              border: '2px solid var(--light-brown)',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>✅</div>
              <h4>친환경 농산물 인증</h4>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>국립농산물품질관리원</p>
            </div>

            <div style={{
              padding: '1rem',
              border: '2px solid var(--light-brown)',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>🥇</div>
              <h4>우수농가 선정</h4>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>충청남도청 (2022년)</p>
            </div>

            <div style={{
              padding: '1rem',
              border: '2px solid var(--light-brown)',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>⭐</div>
              <h4>품질 우수상</h4>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>청양군 농업박람회 (2023년)</p>
            </div>
          </div>
        </section>

        {/* 농장 비전 */}
        <section className="card" style={{background: 'var(--warm-gradient)', textAlign: 'center'}}>
          <h2>🎯 농장 비전</h2>
          <div style={{fontSize: '1.2rem', lineHeight: '1.8'}}>
            <p style={{marginBottom: '1rem'}}>
              <strong>&ldquo;건강한 땅에서 건강한 먹거리를&rdquo;</strong>
            </p>
            <p>
              청양 칠갑산 알밤 농장은 지속가능한 농업을 통해 다음 세대에게 
              깨끗한 환경과 건강한 먹거리를 물려주는 것을 목표로 합니다.
            </p>
            <p>
              고객 여러분의 건강과 행복이 바로 저희 농장의 가장 큰 보람입니다.
            </p>
          </div>
        </section>

        {/* 알밤 생산 과정 */}
        <section className="card">
          <h2>🌱 알밤 생산 과정</h2>
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <p style={{fontSize: '1.1rem', color: 'var(--text-secondary)'}}>
              정성과 시간이 만들어내는 최고의 알밤. 1년 동안의 정성스러운 관리를 통해 탄생합니다.
            </p>
          </div>
          
          {/* 연간 생산 일정 */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #98FB98 0%, #90EE90 100%)',
              borderRadius: '15px',
              textAlign: 'center',
              color: 'var(--text-primary)'
            }}>
              <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>🌸</div>
              <h3>봄 (3-5월)</h3>
              <p><strong>새싹 관리 및 토양 준비</strong></p>
              <p>• 밭갈이 및 비료 주기</p>
              <p>• 새순 정리 및 가지치기</p>
              <p>• 해충 방제 (천연 방법)</p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #87CEEB 0%, #87CEFA 100%)',
              borderRadius: '15px',
              textAlign: 'center',
              color: 'var(--text-primary)'
            }}>
              <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>☀️</div>
              <h3>여름 (6-8월)</h3>
              <p><strong>성장기 집중 관리</strong></p>
              <p>• 물주기 및 제초작업</p>
              <p>• 열매 솎기 작업</p>
              <p>• 병해충 예방 관리</p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--chestnut-gradient)',
              borderRadius: '15px',
              textAlign: 'center',
              color: 'white'
            }}>
              <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>🍂</div>
              <h3>가을 (9-11월)</h3>
              <p><strong>수확 및 저장</strong></p>
              <p>• 알밤 수확 (9월 중순~)</p>
              <p>• 선별 및 품질 관리</p>
              <p>• 저장 및 출하 준비</p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, #E6E6FA 0%, #DDA0DD 100%)',
              borderRadius: '15px',
              textAlign: 'center',
              color: 'var(--text-primary)'
            }}>
              <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>❄️</div>
              <h3>겨울 (12-2월)</h3>
              <p><strong>휴식기 및 준비</strong></p>
              <p>• 나무 정지 작업</p>
              <p>• 농기구 정비</p>
              <p>• 다음 해 계획 수립</p>
            </div>
          </div>
        </section>

        {/* 무농약 재배 방법 */}
        <section className="card">
          <h2>🌿 무농약 재배의 비밀</h2>
          
          <div style={{background: 'var(--soft-beige)', padding: '2rem', borderRadius: '15px', marginBottom: '2rem'}}>
            <h3 style={{textAlign: 'center', marginBottom: '2rem'}}>💚 자연 친화적 관리 방법</h3>
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem'}}>
              <div>
                <h4>🐛 천연 방제법</h4>
                <ul>
                  <li>님오일, 계피 우린 물 활용</li>
                  <li>천적 곤충 활용한 생물학적 방제</li>
                  <li>규조토, 황토를 이용한 물리적 차단</li>
                  <li>동반식물 재배로 해충 기피</li>
                </ul>
              </div>
              
              <div>
                <h4>🌱 유기농 비료</h4>
                <ul>
                  <li>자가 제조 퇴비 활용</li>
                  <li>해조류 우린 물 영양제</li>
                  <li>쌀겨, 깻묵 등 천연 유기물</li>
                  <li>미생물 발효액 정기 공급</li>
                </ul>
              </div>
              
              <div>
                <h4>💧 물 관리</h4>
                <ul>
                  <li>빗물 저장 시설 활용</li>
                  <li>점적 관수 시스템 도입</li>
                  <li>멀칭으로 수분 증발 방지</li>
                  <li>토양 수분 센서 활용</li>
                </ul>
              </div>
              
              <div>
                <h4>🌾 토양 관리</h4>
                <ul>
                  <li>녹비작물 재배로 토양 개선</li>
                  <li>미생물 활성화 관리</li>
                  <li>유기물 함량 증대</li>
                  <li>토양 압축 방지 작업</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 품질 관리 */}
        <section className="card">
          <h2>✅ 품질 관리 기준</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              border: '2px solid var(--chestnut-brown)',
              borderRadius: '15px'
            }}>
              <h3>🔍 선별 기준</h3>
              <ul>
                <li><strong>크기:</strong> 직경 2.5cm 이상</li>
                <li><strong>무게:</strong> 개당 15g 이상</li>
                <li><strong>외관:</strong> 상처, 벌레구멍 없음</li>
                <li><strong>색상:</strong> 균일한 갈색</li>
                <li><strong>촉감:</strong> 단단하고 묵직함</li>
              </ul>
            </div>
            
            <div style={{
              padding: '1.5rem',
              border: '2px solid var(--chestnut-brown)',
              borderRadius: '15px'
            }}>
              <h3>📦 포장 기준</h3>
              <ul>
                <li><strong>세척:</strong> 깨끗한 물로 3회 세척</li>
                <li><strong>건조:</strong> 자연 건조 24시간</li>
                <li><strong>포장:</strong> 통풍이 잘 되는 망 포장</li>
                <li><strong>라벨:</strong> 수확일, 중량 표시</li>
                <li><strong>보관:</strong> 저온(0-2℃) 보관</li>
              </ul>
            </div>
            
            <div style={{
              padding: '1.5rem',
              border: '2px solid var(--chestnut-brown)',
              borderRadius: '15px'
            }}>
              <h3>🚚 배송 기준</h3>
              <ul>
                <li><strong>포장재:</strong> 친환경 완충재 사용</li>
                <li><strong>온도:</strong> 냉장 택배 발송</li>
                <li><strong>시간:</strong> 수확 후 24시간 내 발송</li>
                <li><strong>추적:</strong> 실시간 배송 현황 안내</li>
                <li><strong>보장:</strong> 신선도 100% 보장</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 연락처 */}
        <section className="card">
          <h2>📞 농장 연락처</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
            <div>
              <h4>📱 전화번호</h4>
              <p>010-9123-9287</p>
            </div>
            <div>
              <h4>📍 농장 주소</h4>
              <p>충남 청양군 남양면 충절로 265-27</p>
            </div>
            <div>
              <h4>👨‍🌾 대표자</h4>
              <p>이기영</p>
            </div>
            <div>
              <h4>🕒 운영시간</h4>
              <p>오전 8시 ~ 오후 6시</p>
            </div>
          </div>
          
          <div style={{marginTop: '2rem', textAlign: 'center'}}>
            <Link href="/location" className="btn">농장 찾아오는 길</Link>
            <Link href="/purchase" className="btn" style={{marginLeft: '1rem'}}>알밤 주문하기</Link>
          </div>
        </section>
      </div>

      {/* 세련된 로그아웃 모달 */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🌰</div>
            <div className="modal-title">안전하게 로그아웃</div>
            <div className="modal-message">
              소중한 시간을 함께해 주셔서 감사합니다.<br/>
              다음에 또 만나요!
            </div>
            <button 
              className="modal-button"
              onClick={handleLogout}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
