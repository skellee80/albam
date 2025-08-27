'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 세션 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }
  }, []);
  const chestnutProducts = [
    {
      id: 1,
      name: "알밤 1kg",
      description: "신선하고 달콤한 청양 알밤 1kg입니다. 당일 수확한 싱싱한 알밤을 드시는 즉시 맛보실 수 있습니다.",
      price: "15,000원",
      emoji: "🌰"
    },
    {
      id: 2,
      name: "알밤 3kg",
      description: "가족이 함께 드시기 좋은 3kg 대용량 포장입니다. 신선도와 품질을 보장합니다.",
      price: "40,000원",
      emoji: "🌰"
    },
    {
      id: 3,
      name: "알밤 5kg",
      description: "대가족이나 업체용으로 적합한 5kg 포장입니다. 대량 주문 시 할인 혜택이 있습니다.",
      price: "65,000원",
      emoji: "🌰"
    },
    {
      id: 4,
      name: "껍질 깐 알밤 500g",
      description: "바로 드실 수 있도록 껍질을 깐 알밤입니다. 요리나 간식용으로 편리하게 이용하세요.",
      price: "12,000원",
      emoji: "🥜"
    },
    {
      id: 5,
      name: "구운 알밤 1kg",
      description: "전통 방식으로 구운 고소하고 달콤한 알밤입니다. 따뜻할 때 드시면 더욱 맛있습니다.",
      price: "18,000원",
      emoji: "🔥"
    },
    {
      id: 6,
      name: "알밤 선물세트",
      description: "고급 포장지에 담은 프리미엄 선물세트입니다. 명절이나 특별한 날 선물하기 좋습니다.",
      price: "35,000원",
      emoji: "🎁"
    }
  ];

  return (
    <>
      {/* 헤더 */}
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
            🌰 청양 칠갑산<br/>알밤 농장
          </Link>
          <nav className="nav">
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

      {/* 메인 컨텐츠 */}
      <div className="container">
        {/* 히어로 섹션 */}
        <section className="hero">
          <h1>🍂 수확의 계절, 청양 알밤 🍂</h1>
          <p>
            충남 청양의 청정 자연에서 정성껏 키운 달콤하고 고소한 알밤을 
            농가에서 직접 판매합니다. 신선함과 품질을 보장하는 청양 칠갑산 알밤 농장의 알밤을 만나보세요.
          </p>
        </section>

        {/* 알밤 상품 썸네일 */}
        <section>
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '2.5rem', 
            color: 'var(--primary-brown)', 
            marginBottom: '3rem',
            fontWeight: '700'
          }}>
            🌰 알밤 상품 둘러보기
          </h2>
          
          <div className="thumbnails-grid">
            {chestnutProducts.map((product) => (
              <div key={product.id} className="thumbnail-card">
                <div className="thumbnail-image">
                  {product.emoji}
                </div>
                <div className="thumbnail-content">
                  <h3 className="thumbnail-title">{product.name}</h3>
                  <p className="thumbnail-description">{product.description}</p>
                  <p className="thumbnail-price">{product.price}</p>
                  <Link href={`/purchase?product=${product.id}`} className="btn" style={{marginTop: '1rem'}}>
                    주문하기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 농장 소개 미리보기 */}
        <section className="card">
          <h2>🚜 청양 칠갑산 알밤 농장 이야기</h2>
          <p>
            30년간 알밤 재배에만 전념해온 청양 칠갑산 알밤 농장은 충남 청양의 청정 자연환경에서 
            무농약으로 알밤을 재배하고 있습니다. 건강하고 맛있는 알밤을 생산하기 위해 
            끊임없이 연구하고 노력하고 있습니다.
          </p>
          <Link href="/farm-intro" className="btn" style={{marginTop: '1rem'}}>
            농장 소개 자세히 보기
          </Link>
        </section>


      </div>

      {/* 푸터 */}
      <footer className="footer">
        <div className="footer-content">
          <h3>🌰 청양 칠갑산 알밤 농장</h3>
          <p>주소: 충남 청양군 남양면 충절로 265-27</p>
          <p>대표자: 이기영</p>
          <p>연락처: 010-9123-9287</p>
          <p style={{marginTop: '2rem', opacity: '0.8'}}>
            © 2024 청양 칠갑산 알밤 농장. 신선하고 건강한 알밤을 정성껏 전해드립니다.
          </p>
        </div>
      </footer>
    </>
  );
}