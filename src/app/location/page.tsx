'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Location() {
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 세션 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }
  }, []);
  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
🌰 청양 칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">홈</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 소개</Link>
            <Link href="/production" className="nav-link">생산 과정</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">농장 공지사항</Link>
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
          </nav>
        </div>
      </header>

      <div className="container">
        <h1 style={{textAlign: 'center', color: 'var(--chestnut-brown)', marginBottom: '3rem'}}>
          🗺️ 농장 오시는 길
        </h1>

        <section className="hero" style={{marginBottom: '3rem'}}>
          <h2>🚗 청양 칠갑산 알밤 농장으로 놀러오세요!</h2>
          <p>
            충남 청양의 아름다운 자연 속에서 직접 알밤을 보시고, 
            농장의 정성을 느껴보실 수 있습니다.
          </p>
        </section>

        {/* 기본 정보 */}
        <section className="card">
          <h2>📍 농장 기본 정보</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📮</div>
              <h3>농장 주소</h3>
              <p style={{fontSize: '1.1rem', fontWeight: 'bold'}}>
                충남 청양군 남양면 충절로 265-27
              </p>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                (우편번호: 33324)
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>👨‍🌾</div>
              <h3>농장주</h3>
              <p style={{fontSize: '1.1rem', fontWeight: 'bold'}}>
                이기영
              </p>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                30년 경력의 알밤 재배 전문가
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📱</div>
              <h3>연락처</h3>
              <p style={{fontSize: '1.1rem', fontWeight: 'bold'}}>
                010-9123-9287
              </p>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                언제든 연락주세요!
              </p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🕒</div>
              <h3>운영시간</h3>
              <p style={{fontSize: '1.1rem', fontWeight: 'bold'}}>
                오전 8:00 ~ 오후 6:00
              </p>
              <p style={{fontSize: '0.9rem', color: 'var(--text-light)'}}>
                연중무휴 (추석 당일 제외)
              </p>
            </div>
          </div>
        </section>

        {/* 지도 */}
        <section className="card">
          <h2>🗺️ 농장 위치</h2>
          
          <div style={{
            width: '100%',
            height: '400px',
            background: 'linear-gradient(135deg, #E8F5E8 0%, #C8E6C9 100%)',
            borderRadius: '15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--chestnut-light)',
            marginBottom: '2rem'
          }}>
            <div style={{fontSize: '4rem', marginBottom: '1rem'}}>🗺️</div>
            <h3>지도 위치</h3>
            <p style={{textAlign: 'center', marginBottom: '1rem'}}>
              충남 청양군 남양면 충절로 265-27<br/>
              청양 칠갑산 알밤 농장
            </p>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              <a 
                href="https://map.naver.com/v5/search/충남%20청양군%20남양면%20충절로%20265-27" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn"
              >
                네이버 지도에서 보기
              </a>
              <a 
                href="https://map.kakao.com/link/search/충남%20청양군%20남양면%20충절로%20265-27" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                카카오맵에서 보기
              </a>
            </div>
          </div>

          <div className="alert alert-info">
            <h4>📱 네비게이션 이용 시</h4>
            <p><strong>주소 입력:</strong> 충남 청양군 남양면 충절로 265-27</p>
            <p><strong>또는 검색:</strong> &ldquo;청양 칠갑산 알밤 농장&rdquo; 또는 &ldquo;청양 알밤 농장&rdquo;</p>
          </div>
        </section>

        {/* 교통편별 안내 */}
        <section className="card">
          <h2>🚗 교통편별 오시는 길</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            {/* 자가용 */}
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
              borderRadius: '15px',
              border: '2px solid var(--golden-brown)'
            }}>
              <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>🚗</div>
                <h3>자가용 이용</h3>
                <p style={{color: 'var(--golden-brown)', fontWeight: 'bold'}}>가장 편리한 방법</p>
              </div>
              
              <div style={{marginBottom: '1.5rem'}}>
                <h4>🛣️ 서울에서 출발</h4>
                <ol style={{paddingLeft: '1.5rem', fontSize: '0.9rem'}}>
                  <li>경부고속도로 → 천안JC</li>
                  <li>논산천안고속도로 → 청양IC</li>
                  <li>청양IC에서 충절로 방향</li>
                  <li>충절로 265-27 도착</li>
                </ol>
                <p style={{color: 'var(--text-light)', fontSize: '0.8rem'}}>
                  소요시간: 약 2시간 30분
                </p>
              </div>
              
              <div style={{marginBottom: '1.5rem'}}>
                <h4>🛣️ 대전에서 출발</h4>
                <ol style={{paddingLeft: '1.5rem', fontSize: '0.9rem'}}>
                  <li>대전 → 공주 방향 32번 국도</li>
                  <li>공주 → 청양 방향</li>
                  <li>청양시내 → 충절로</li>
                  <li>충절로 265-27 도착</li>
                </ol>
                <p style={{color: 'var(--text-light)', fontSize: '0.8rem'}}>
                  소요시간: 약 1시간 20분
                </p>
              </div>
              
              <div className="alert alert-success">
                <strong>🅿️ 주차:</strong> 농장 내 무료 주차 가능 (10대)
              </div>
            </div>

            {/* 대중교통 */}
            <div style={{
              padding: '2rem',
              background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
              borderRadius: '15px',
              border: '2px solid var(--golden-brown)'
            }}>
              <div style={{textAlign: 'center', marginBottom: '1.5rem'}}>
                <div style={{fontSize: '3rem', marginBottom: '0.5rem'}}>🚌</div>
                <h3>대중교통 이용</h3>
                <p style={{color: 'var(--golden-brown)', fontWeight: 'bold'}}>버스 + 도보</p>
              </div>
              
              <div style={{marginBottom: '1.5rem'}}>
                <h4>🚌 서울에서 출발</h4>
                <ol style={{paddingLeft: '1.5rem', fontSize: '0.9rem'}}>
                  <li>서울고속버스터미널 → 청양터미널</li>
                  <li>청양터미널에서 시내버스 탑승</li>
                  <li>충절로 정류장 하차</li>
                  <li>도보 약 5분</li>
                </ol>
                <p style={{color: 'var(--text-light)', fontSize: '0.8rem'}}>
                  소요시간: 약 3시간 30분
                </p>
              </div>
              
              <div style={{marginBottom: '1.5rem'}}>
                <h4>🚌 대전에서 출발</h4>
                <ol style={{paddingLeft: '1.5rem', fontSize: '0.9rem'}}>
                  <li>대전복합터미널 → 청양터미널</li>
                  <li>청양터미널에서 시내버스</li>
                  <li>충절로 정류장 하차</li>
                  <li>도보 약 5분</li>
                </ol>
                <p style={{color: 'var(--text-light)', fontSize: '0.8rem'}}>
                  소요시간: 약 2시간
                </p>
              </div>
              
              <div className="alert alert-info">
                <strong>📞 픽업 서비스:</strong> 청양터미널에서 농장까지 
                픽업 서비스를 제공합니다. (사전 연락 필수)
              </div>
            </div>
          </div>
        </section>

        {/* 주변 관광지 */}
        <section className="card">
          <h2>🏞️ 주변 관광지</h2>
          <p style={{textAlign: 'center', marginBottom: '2rem'}}>
            농장 방문과 함께 청양의 아름다운 관광지도 둘러보세요!
          </p>
          
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem'}}>
            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🌶️</div>
              <h3>청양고추박물관</h3>
              <p><strong>거리:</strong> 농장에서 차로 10분</p>
              <p>청양고추의 모든 것을 알 수 있는 박물관</p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>⛰️</div>
              <h3>칠갑산</h3>
              <p><strong>거리:</strong> 농장에서 차로 20분</p>
              <p>가을 단풍이 아름다운 청양의 명산</p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💧</div>
              <h3>청양온천</h3>
              <p><strong>거리:</strong> 농장에서 차로 15분</p>
              <p>천연 온천에서 피로를 풀어보세요</p>
            </div>

            <div style={{
              padding: '1.5rem',
              background: 'var(--warm-beige)',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🏔️</div>
              <h3>알프스마을</h3>
              <p><strong>거리:</strong> 농장에서 차로 12분</p>
              <p>유럽풍 건물과 아름다운 풍경을 즐길 수 있는 곳</p>
            </div>
          </div>
        </section>

        {/* 연락처 및 예약 */}
        <section className="card" style={{background: 'var(--chestnut-gradient)', color: 'white', textAlign: 'center'}}>
          <h2 style={{color: 'white'}}>📞 연락처 및 문의</h2>
          
          <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '2rem', 
            marginTop: '2rem',
            marginBottom: '2rem'
          }}>
            <div>
              <h3>📱 전화 문의</h3>
              <p style={{fontSize: '1.2rem', fontWeight: 'bold'}}>010-9123-9287</p>
              <p>오전 8시 ~ 오후 6시</p>
            </div>
            
            <div>
              <h3>📍 농장 주소</h3>
              <p>충남 청양군 남양면 충절로 265-27</p>
              <p>청양 칠갑산 알밤 농장</p>
            </div>
            
            <div>
              <h3>👨‍🌾 농장주</h3>
              <p style={{fontSize: '1.2rem', fontWeight: 'bold'}}>이기영</p>
              <p>30년 경력의 알밤 전문가</p>
            </div>
          </div>

          <div className="alert alert-success" style={{background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)'}}>
            <h4 style={{color: 'white'}}>🌟 방문하기 전에 꼭 연락주세요!</h4>
            <p>농장 상황과 날씨를 미리 확인하여 최고의 경험을 제공해드리겠습니다.</p>
          </div>

          <div style={{marginTop: '2rem'}}>
            <Link href="/purchase" className="btn btn-secondary" style={{marginRight: '1rem'}}>
              알밤 주문하기
            </Link>
            <Link href="/farm-intro" className="btn btn-secondary">
              농장 소개 보기
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}