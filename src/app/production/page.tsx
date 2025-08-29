'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Production() {
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
        <h1 style={{textAlign: 'center', color: 'var(--primary-brown)', marginBottom: '3rem'}}>
          🌱 알밤 생산 과정
        </h1>

        <section className="hero" style={{marginBottom: '3rem'}}>
          <h2>🍂 정성과 시간이 만들어내는 최고의 알밤</h2>
          <p>
            청양 칠갑산 알밤 농장의 알밤은 1년 동안의 정성스러운 관리를 통해 탄생합니다. 
            봄부터 가을까지, 자연의 리듬에 맞춰 정직하게 키워낸 알밤의 생산 과정을 소개합니다.
          </p>
        </section>

        {/* 연간 생산 일정 */}
        <section className="card">
          <h2>📅 연간 알밤 생산 일정</h2>
          
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
              background: 'var(--autumn-gradient)',
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

        {/* 상세 생산 과정 */}
        <section className="card">
          <h2>🔍 상세 생산 과정</h2>
          
          <div style={{position: 'relative', paddingLeft: '3rem'}}>
            <div style={{
              position: 'absolute',
              left: '1rem',
              top: '0',
              bottom: '0',
              width: '4px',
              background: 'var(--autumn-gradient)',
              borderRadius: '2px'
            }}></div>

            <div style={{marginBottom: '3rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-2rem',
                top: '1rem',
                width: '20px',
                height: '20px',
                background: 'var(--warm-orange)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>1</div>
              <h3>🌱 토양 준비 및 재배지 관리</h3>
              <p>
                <strong>시기:</strong> 3월 ~ 4월<br/>
                <strong>내용:</strong> 토양 검사를 통한 pH 조절, 유기질 비료 투입, 
                배수로 정비 등 기본적인 재배 환경을 조성합니다.
              </p>
              <ul style={{marginTop: '1rem', paddingLeft: '1.5rem'}}>
                <li>토양 산도 조절 (pH 6.0-6.5 유지)</li>
                <li>퇴비 및 유기질 비료 시용</li>
                <li>배수시설 점검 및 정비</li>
                <li>잡초 제거 및 경운 작업</li>
              </ul>
            </div>

            <div style={{marginBottom: '3rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-2rem',
                top: '1rem',
                width: '20px',
                height: '20px',
                background: 'var(--warm-orange)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>2</div>
              <h3>🌿 새순 관리 및 가지치기</h3>
              <p>
                <strong>시기:</strong> 4월 ~ 5월<br/>
                <strong>내용:</strong> 건강한 성장을 위한 가지치기와 새순 정리를 통해 
                양질의 알밤이 열릴 수 있는 환경을 만듭니다.
              </p>
              <ul style={{marginTop: '1rem', paddingLeft: '1.5rem'}}>
                <li>불필요한 가지 및 새순 제거</li>
                <li>통풍과 채광을 위한 수형 정리</li>
                <li>병해충 서식지 사전 제거</li>
                <li>나무별 맞춤형 관리</li>
              </ul>
            </div>

            <div style={{marginBottom: '3rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-2rem',
                top: '1rem',
                width: '20px',
                height: '20px',
                background: 'var(--warm-orange)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>3</div>
              <h3>🌸 개화 및 수정 관리</h3>
              <p>
                <strong>시기:</strong> 5월 ~ 6월<br/>
                <strong>내용:</strong> 꽃이 피는 시기에 최적의 수정 환경을 조성하여 
                착과율을 높이고 품질 좋은 알밤이 열리도록 관리합니다.
              </p>
              <ul style={{marginTop: '1rem', paddingLeft: '1.5rem'}}>
                <li>벌통 설치로 자연 수정 촉진</li>
                <li>개화기 물 관리 (적정 수분 유지)</li>
                <li>바람과 비에 대한 보호</li>
                <li>영양분 공급 관리</li>
              </ul>
            </div>

            <div style={{marginBottom: '3rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-2rem',
                top: '1rem',
                width: '20px',
                height: '20px',
                background: 'var(--warm-orange)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>4</div>
              <h3>🌰 열매 관리 및 성장기 관리</h3>
              <p>
                <strong>시기:</strong> 6월 ~ 8월<br/>
                <strong>내용:</strong> 알밤이 자라는 중요한 시기에 최적의 영양과 환경을 제공하여 
                크고 맛있는 알밤으로 키웁니다.
              </p>
              <ul style={{marginTop: '1rem', paddingLeft: '1.5rem'}}>
                <li>열매 솎기 작업 (품질 향상)</li>
                <li>정기적인 관수 및 배수 관리</li>
                <li>천연 영양제 공급</li>
                <li>병해충 예방 및 방제</li>
              </ul>
            </div>

            <div style={{marginBottom: '3rem', position: 'relative'}}>
              <div style={{
                position: 'absolute',
                left: '-2rem',
                top: '1rem',
                width: '20px',
                height: '20px',
                background: 'var(--warm-orange)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>5</div>
              <h3>🍂 수확 및 후처리</h3>
              <p>
                <strong>시기:</strong> 9월 ~ 10월<br/>
                <strong>내용:</strong> 최적의 숙성도에 맞춰 수확하고, 철저한 선별과 관리를 통해 
                최상품의 알밤을 고객에게 전달합니다.
              </p>
              <ul style={{marginTop: '1rem', paddingLeft: '1.5rem'}}>
                <li>자연 낙과 위주의 수확</li>
                <li>크기별, 품질별 선별 작업</li>
                <li>세척 및 건조 처리</li>
                <li>저온 저장으로 신선도 유지</li>
              </ul>
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
              border: '2px solid var(--warm-orange)',
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
              border: '2px solid var(--warm-orange)',
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
              border: '2px solid var(--warm-orange)',
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

        {/* 고객 만족을 위한 노력 */}
        <section className="card" style={{background: 'var(--warm-gradient)', textAlign: 'center'}}>
          <h2>💝 고객 만족을 위한 약속</h2>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginTop: '2rem'}}>
            <div>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🌟</div>
              <h3>품질 보장</h3>
              <p>30년 경험으로 보장하는 최고 품질</p>
            </div>
            <div>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🚀</div>
              <h3>신속 배송</h3>
              <p>수확 후 24시간 내 신선 배송</p>
            </div>
            <div>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🛡️</div>
              <h3>안전 보장</h3>
              <p>무농약 재배로 안심하고 드세요</p>
            </div>
            <div>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>💬</div>
              <h3>소통 중시</h3>
              <p>언제든 연락주시면 친절히 안내</p>
            </div>
          </div>
        </section>

        <div style={{textAlign: 'center', marginTop: '3rem'}}>
          <Link href="/purchase" className="btn" style={{fontSize: '1.2rem', padding: '1rem 2rem'}}>
            정성껏 기른 알밤 주문하기 🌰
          </Link>
        </div>
      </div>
    </>
  );
}
