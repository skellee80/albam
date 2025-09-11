import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">🌰 청양 칠갑산 알밤 농장</Link>
          <nav className="nav">
            <Link href="/" className="nav-link">상품</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 소개</Link>
            <Link href="/notice" className="nav-link">농장 공지사항</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          <div style={{fontSize: '8rem', marginBottom: '2rem'}}>🌰</div>
          
          <h1 style={{
            fontSize: '3rem',
            color: 'var(--primary-brown)',
            marginBottom: '1rem'
          }}>
            404
          </h1>
          
          <h2 style={{
            fontSize: '1.5rem',
            color: 'var(--text-secondary)',
            marginBottom: '2rem'
          }}>
            앗! 길을 잃으셨네요
          </h2>
          
          <p style={{
            fontSize: '1.1rem',
            color: 'var(--text-light)',
            marginBottom: '3rem',
            lineHeight: '1.6'
          }}>
            요청하신 페이지를 찾을 수 없습니다.<br/>
            농장으로 돌아가서 맛있는 알밤을 구경해보세요!
          </p>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Link href="/" className="btn">
              🌰 상품 페이지로 돌아가기
            </Link>
            <Link href="/purchase" className="btn btn-secondary">
              🌰 알밤 주문하기
            </Link>
          </div>

          <div style={{
            marginTop: '3rem',
            padding: '2rem',
            background: 'var(--warm-gradient)',
            borderRadius: '15px'
          }}>
            <h3 style={{marginBottom: '1rem'}}>🌾 추천 페이지</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '1rem'
            }}>
              <Link href="/farm-intro" style={{
                display: 'block',
                padding: '0.8rem',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit'
              }}>
                <div style={{fontSize: '1.5rem'}}>👨‍🌾</div>
                <div>농장 소개</div>
              </Link>
              
              <Link href="/production" style={{
                display: 'block',
                padding: '0.8rem',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit'
              }}>
                <div style={{fontSize: '1.5rem'}}>🌱</div>
                <div>생산 과정</div>
              </Link>
              
              <Link href="/storage" style={{
                display: 'block',
                padding: '0.8rem',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit'
              }}>
                <div style={{fontSize: '1.5rem'}}>📦</div>
                <div>저장 방법</div>
              </Link>
              
              <Link href="/location" style={{
                display: 'block',
                padding: '0.8rem',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'inherit'
              }}>
                <div style={{fontSize: '1.5rem'}}>🗺️</div>
                <div>오시는 길</div>
              </Link>
            </div>
          </div>

          <div style={{
            marginTop: '2rem',
            fontSize: '0.9rem',
            color: 'var(--text-light)'
          }}>
            문제가 지속되면 <strong>010-9123-9287</strong>로 연락주세요.
          </div>
        </div>
      </div>
    </>
  );
}
