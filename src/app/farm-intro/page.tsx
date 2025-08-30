'use client';

import { useState, useEffect } from 'react';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 관리자 세션 및 사용자 로그인 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }

    // 현재 로그인한 사용자 확인
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
      }
    }
  }, []);

  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setShowLogoutModal(false);
  };
  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">홈</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link nav-link-active">농장 소개</Link>
            <Link href="/production" className="nav-link">생산 과정</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">공지사항</Link>
            {isAdmin && (
              <>
                <Link href="/admin" className="nav-link" style={{background: 'rgba(255, 255, 255, 0.2)', fontWeight: 'bold'}}>
                  📊 주문 현황
                </Link>
                <button onClick={() => {
                  setIsAdmin(false);
                  localStorage.removeItem('adminSession');
                }} className="nav-link" style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}>
                  관리자 로그아웃
                </button>
              </>
            )}
            {currentUser ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <div style={{
                  color: 'white', 
                  fontSize: '0.85rem', 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  안녕하세요, {currentUser.name}님! ✨
                </div>
                <Link href="/mypage" className="nav-link" style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)', 
                  fontWeight: 'bold',
                  borderRadius: '20px',
                  padding: '0.4rem 0.8rem',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(10px)'
                }}>
                  👤 마이페이지
                </Link>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  className="nav-link"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.1) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    color: 'white',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link href="/auth" className="nav-link" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)', 
                fontWeight: 'bold',
                borderRadius: '20px',
                padding: '0.4rem 0.8rem',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)'
              }}>
                🔐 로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="container">
        <h1 style={{textAlign: 'center', color: 'var(--primary-brown)', marginBottom: '3rem'}}>
          🚜 청양 칠갑산 알밤 농장 소개
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
