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

export default function Storage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 관리자 세션 확인
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
            <Link href="/" className="nav-link">홈</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 이야기</Link>
            <Link href="/storage" className="nav-link nav-link-active">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">공지사항</Link>
            {isAdmin && (
              <>
                <Link href="/admin" className="nav-link">
                  📊 주문 현황
                </Link>
                <button onClick={() => {
                  setIsAdmin(false);
                  localStorage.removeItem('adminSession');
                }} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer'}}>
                  관리자 로그아웃
                </button>
              </>
            )}
            {currentUser && userData ? (
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
                  안녕하세요, {userData.name}님! ✨
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
              <Link href="/auth" className="nav-link">
                🔐 로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="container">
        <h1 style={{textAlign: 'center', color: 'var(--chestnut-brown)', marginBottom: '3rem'}}>
          📦 알밤 보관 방법
        </h1>

        <section className="hero" style={{marginBottom: '3rem'}}>
          <h2>🌰 신선함을 오래 유지하는 알밤 저장법</h2>
          <p>
            신선하고 맛있는 알밤을 더 오래 즐기실 수 있도록 
            올바른 보관 방법을 자세히 안내해드립니다.
          </p>
        </section>

        {/* 김치냉장고 보관 방법 */}
        <section className="card">
          <h2>🥬 김치냉장고 저장 방법 (최고의 선택!)</h2>
          
          <div style={{
            padding: '2rem',
            background: 'var(--warm-gradient)',
            borderRadius: '15px',
            border: '3px solid var(--chestnut-brown)',
            marginTop: '2rem'
          }}>
            <div style={{textAlign: 'center', marginBottom: '2rem'}}>
              <div style={{fontSize: '4rem', marginBottom: '1rem'}}>❄️🥬</div>
              <h3 style={{fontSize: '1.8rem', color: 'var(--chestnut-brown)'}}>김치냉장고 보관법</h3>
              <p style={{color: 'var(--golden-brown)', fontWeight: 'bold', fontSize: '1.2rem'}}>
                보관기간: 6개월 이상
              </p>
            </div>
            
            <div style={{marginBottom: '2rem'}}>
              <h4 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>🔧 준비 과정</h4>
              <ol style={{paddingLeft: '1.5rem', lineHeight: '1.8'}}>
                <li><strong>알밤 선별:</strong> 상처나 벌레구멍이 없는 건강한 알밤만 선택</li>
                <li><strong>세척:</strong> 깨끗한 찬물에 3번 세척하여 이물질 제거</li>
                <li><strong>물기 제거:</strong> 키친타월로 완전히 물기를 제거</li>
                <li><strong>건조:</strong> 통풍이 잘 되는 곳에서 30분간 자연 건조</li>
              </ol>
            </div>
            
            <div style={{marginBottom: '2rem'}}>
              <h4 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>📦 포장 방법</h4>
              <ol style={{paddingLeft: '1.5rem', lineHeight: '1.8'}}>
                <li><strong>소분 포장:</strong> 한 번에 사용할 양씩(500g-1kg) 나누어 포장</li>
                <li><strong>밀폐 포장:</strong> 진공포장지나 지퍼백에 공기를 완전히 빼고 밀봉</li>
                <li><strong>이중 포장:</strong> 냉동용 비닐봉지로 한 번 더 포장</li>
                <li><strong>라벨링:</strong> 포장 날짜와 중량을 라벨로 표시</li>
              </ol>
            </div>
            
            <div style={{marginBottom: '2rem'}}>
              <h4 style={{color: 'var(--chestnut-brown)', marginBottom: '1rem'}}>🌡️ 보관 설정</h4>
              <div style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                background: 'rgba(255, 255, 255, 0.7)',
                padding: '1rem',
                borderRadius: '10px'
              }}>
                <div>
                  <strong>온도:</strong><br/>
                  -1°C ~ 0°C
                </div>
                <div>
                  <strong>습도:</strong><br/>
                  85-90%
                </div>
                <div>
                  <strong>위치:</strong><br/>
                  김치냉장고 하단부
                </div>
                <div>
                  <strong>모드:</strong><br/>
                  야채/과일 모드
                </div>
              </div>
            </div>
            
            <div className="alert alert-success">
              <h4>💡 김치냉장고 보관의 장점</h4>
              <ul style={{margin: '1rem 0', paddingLeft: '1.5rem'}}>
                <li>일정한 온도와 습도 유지로 장기 보관 가능</li>
                <li>알밤의 당분 손실을 최소화</li>
                <li>벌레나 곰팡이 발생 방지</li>
                <li>냉동실보다 식감과 맛 보존 우수</li>
                <li>해동 과정 없이 바로 사용 가능</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 보관 시 주의사항 */}
        <section className="card">
          <h2>⚠️ 보관 시 주의사항</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              background: '#ffebee',
              borderRadius: '10px',
              border: '1px solid #f44336'
            }}>
              <h3 style={{color: '#d32f2f', marginBottom: '1rem'}}>❌ 하지 말아야 할 것</h3>
              <ul>
                <li>🚫 세척하지 않고 바로 보관</li>
                <li>🚫 물기가 남은 상태로 포장</li>
                <li>🚫 상한 알밤과 함께 보관</li>
                <li>🚫 너무 많은 양을 한 봉지에 포장</li>
                <li>🚫 온도 변화가 심한 곳에 보관</li>
                <li>🚫 공기가 들어간 상태로 밀봉</li>
              </ul>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: '#e8f5e8',
              borderRadius: '10px',
              border: '1px solid #4caf50'
            }}>
              <h3 style={{color: '#2e7d32', marginBottom: '1rem'}}>✅ 꼭 지켜야 할 것</h3>
              <ul>
                <li>✅ 깨끗하게 세척 후 완전 건조</li>
                <li>✅ 진공 밀폐 포장으로 보관</li>
                <li>✅ 적정 온도와 습도 유지</li>
                <li>✅ 정기적인 상태 확인</li>
                <li>✅ 선입선출 원칙 준수</li>
                <li>✅ 포장 날짜 표시</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 알밤 상태 확인법 */}
        <section className="card">
          <h2>🔍 알밤 상태 확인하는 방법</h2>
          
          <div className="storage-check-layout">
            <div>
              <h3 style={{marginBottom: '1.5rem'}}>👀 육안으로 확인하기</h3>
              
              <div style={{marginBottom: '2rem'}}>
                <h4 style={{color: 'var(--chestnut-brown)'}}>✅ 신선한 알밤</h4>
                <ul>
                  <li>🟤 균일한 갈색</li>
                  <li>✨ 윤기가 흐르는 표면</li>
                  <li>🔘 탄탄하고 단단한 촉감</li>
                  <li>🚫 벌레구멍이나 상처 없음</li>
                </ul>
              </div>
              
              <div>
                <h4 style={{color: 'var(--chestnut-dark)'}}>❌ 상한 알밤</h4>
                <ul>
                  <li>⚫ 검은 반점이나 곰팡이</li>
                  <li>💧 표면이 끈적하거나 젖어있음</li>
                  <li>🤏 눌렀을 때 말랑거림</li>
                  <li>🕳️ 벌레구멍이나 갈라진 틈</li>
                  <li>👃 이상한 냄새</li>
                </ul>
              </div>
            </div>
            
            <div style={{
              padding: '2rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <h3>🌊 물에 띄워서 확인하기</h3>
              <div style={{fontSize: '4rem', margin: '1rem 0'}}>🥣</div>
              <p style={{marginBottom: '1.5rem'}}>
                <strong>신선한 알밤은 가라앉고,<br/>
                상한 알밤은 물에 뜹니다!</strong>
              </p>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                fontSize: '0.9rem'
              }}>
                <p>💡 <strong>방법:</strong></p>
                <p>큰 그릇에 물을 담고 알밤을 넣어보세요. 
                물에 뜨는 알밤은 속이 비어있거나 상한 것이니 제거해주세요.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 용도별 활용법 */}
        <section className="card">
          <h2>🍽️ 용도별 알밤 활용법</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-gradient)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🍯</div>
              <h3>생으로 먹기</h3>
              <p><strong>보관법:</strong> 김치냉장고 보관</p>
              <p><strong>기간:</strong> 6개월</p>
              <p><strong>팁:</strong> 먹기 전 30분 전에 꺼내어 상온에 두면 더 달콤합니다.</p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-gradient)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🔥</div>
              <h3>구워 먹기</h3>
              <p><strong>보관법:</strong> 김치냉장고 보관</p>
              <p><strong>기간:</strong> 6개월</p>
              <p><strong>팁:</strong> 십자 칼집을 내고 구우면 터지지 않습니다.</p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-gradient)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🍲</div>
              <h3>요리용</h3>
              <p><strong>보관법:</strong> 김치냉장고 보관</p>
              <p><strong>기간:</strong> 6개월</p>
              <p><strong>팁:</strong> 껍질을 벗겨서 보관하면 바로 요리에 사용할 수 있습니다.</p>
            </div>
            
            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-gradient)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🍰</div>
              <h3>디저트용</h3>
              <p><strong>보관법:</strong> 김치냉장고 보관</p>
              <p><strong>기간:</strong> 6개월</p>
              <p><strong>팁:</strong> 미리 쪄서 으깬 후 보관하면 베이킹에 편리합니다.</p>
            </div>
          </div>
        </section>

        {/* 보관 관련 FAQ */}
        <section className="card">
          <h2>❓ 자주 묻는 질문</h2>
          
          <div style={{marginTop: '2rem'}}>
            <details style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--warm-beige)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}>
              <summary style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                Q. 김치냉장고가 없으면 어떻게 보관하나요?
              </summary>
              <p style={{marginTop: '1rem', paddingLeft: '1rem'}}>
                A. 일반 냉장고의 야채칸을 이용하세요. 온도를 최대한 낮게 설정하고(0-2℃), 
                습도 조절을 위해 젖은 키친타월과 함께 밀폐용기에 보관하시면 됩니다.
              </p>
            </details>
            
            <details style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--warm-beige)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}>
              <summary style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                Q. 껍질을 까서 김치냉장고에 보관해도 되나요?
              </summary>
              <p style={{marginTop: '1rem', paddingLeft: '1rem'}}>
                A. 네, 가능합니다. 다만 껍질을 깐 후에는 물에 담가 변색을 방지하고, 
                물기를 완전히 제거한 후 진공포장하여 보관하세요. 보관기간은 3개월 정도입니다.
              </p>
            </details>
            
            <details style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--warm-beige)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}>
              <summary style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                Q. 김치냉장고에서 꺼낸 알밤은 어떻게 해동하나요?
              </summary>
              <p style={{marginTop: '1rem', paddingLeft: '1rem'}}>
                A. 김치냉장고 보관 시에는 냉동상태가 아니므로 별도 해동이 필요 없습니다. 
                바로 사용하시거나, 상온에서 20-30분 정도 두시면 더욱 맛있게 드실 수 있습니다.
              </p>
            </details>
            
            <details style={{
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--warm-beige)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}>
              <summary style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                Q. 김치냉장고에 보관한 알밤에서 이상한 냄새가 나면?
              </summary>
              <p style={{marginTop: '1rem', paddingLeft: '1rem'}}>
                A. 이상한 냄새가 나는 알밤은 상한 것이므로 즉시 버리세요. 
                김치냉장고 내부도 청소하고, 다른 알밤도 꼼꼼히 확인해주세요.
              </p>
            </details>
          </div>
        </section>

        {/* 연락처 */}
        <section className="card">
          <h2>📞 보관 관련 문의</h2>
          <p style={{textAlign: 'center', fontSize: '1.1rem'}}>
            알밤 보관이나 저장에 관해 궁금한 점이 있으시면 언제든 연락해주세요!
          </p>
          <div style={{textAlign: 'center', marginTop: '2rem'}}>
            <p><strong>📱 청양 칠갑산 알밤 농장: 010-9123-9287</strong></p>
            <p>📍 충남 청양군 남양면 충절로 265-27</p>
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