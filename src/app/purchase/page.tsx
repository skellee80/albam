'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderData {
  name: string;
  recipientName: string;
  phone: string;
  recipientPhone: string;
  address: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  orderNumber: string;
  isShipped?: boolean;
  note?: string;
}

export default function Purchase() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    recipientName: '',
    phone: '',
    recipientPhone: '',
    address: '',
    productId: '1',
    quantity: 1
  });

  // 관리자 세션 확인
  useEffect(() => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession === 'true') {
      setIsAdmin(true);
    }
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const products = [
    { id: '1', name: '알밤 1kg', price: 15000 },
    { id: '2', name: '알밤 3kg', price: 40000 },
    { id: '3', name: '알밤 5kg', price: 65000 },
    { id: '4', name: '껍질 깐 알밤 500g', price: 12000 },
    { id: '5', name: '구운 알밤 1kg', price: 18000 },
    { id: '6', name: '알밤 선물세트', price: 35000 }
  ];

  const selectedProduct = products.find(p => p.id === formData.productId);
  const totalPrice = selectedProduct ? selectedProduct.price * formData.quantity : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ALB${year}${month}${day}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.recipientName || !formData.phone || !formData.recipientPhone || !formData.address) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderNum = generateOrderNumber();
      const orderData: OrderData = {
        name: formData.name,
        recipientName: formData.recipientName,
        phone: formData.phone,
        recipientPhone: formData.recipientPhone,
        address: formData.address,
        productId: formData.productId,
        productName: selectedProduct?.name || '',
        quantity: formData.quantity,
        totalPrice: totalPrice,
        orderDate: new Date().toLocaleDateString('ko-KR'),
        orderNumber: orderNum,
        isShipped: false,
        note: ''
      };

      // 로컬 스토리지에 주문 데이터 저장 (실제로는 서버 API 호출)
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.push(orderData);
      localStorage.setItem('orders', JSON.stringify(existingOrders));

      setOrderNumber(orderNum);
      setOrderComplete(true);
    } catch (error) {
      console.error('주문 처리 중 오류가 발생했습니다:', error);
      alert('주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <>
        <header className="header">
          <div className="header-content">
            <Link href="/" className="logo">
              🌰 청양 칠갑산<br/>알밤 농장
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
          <div className="card" style={{textAlign: 'center', maxWidth: '600px', margin: '3rem auto'}}>
            <h1 style={{color: 'var(--primary-brown)', marginBottom: '2rem'}}>🎉 주문이 완료되었습니다!</h1>
            
            <div className="alert alert-success">
              <h3>주문번호: {orderNumber}</h3>
              <p>소중한 주문 감사합니다. 신선한 알밤을 정성껏 준비해서 배송해드리겠습니다.</p>
            </div>

            <div style={{margin: '2rem 0', padding: '1.5rem', background: 'var(--soft-beige)', borderRadius: '10px'}}>
              <h4 style={{marginBottom: '1rem'}}>배송 및 결제 안내</h4>
              <p>📞 주문 확인 연락: 1-2일 내 연락드립니다</p>
              <p>🚚 배송기간: 주문 확인 후 2-3일 소요</p>
              <p>💰 결제방법: 농협계좌 입금 또는 현금결제</p>
              <p>📱 문의사항: 010-9123-9287</p>
            </div>

            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <Link href="/" className="btn">홈으로 돌아가기</Link>
              <button 
                onClick={() => {
                  setOrderComplete(false);
                  setOrderNumber('');
                  setFormData({
                    name: '',
                    recipientName: '',
                    phone: '',
                    recipientPhone: '',
                    address: '',
                    productId: '1',
                    quantity: 1
                  });
                }} 
                className="btn btn-secondary"
              >
                추가 주문하기
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
            🌰 청양 칠갑산<br/>알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">홈</Link>
            <Link href="/purchase" className="nav-link">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 소개</Link>
            <Link href="/production" className="nav-link">생산 과정</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
            <Link href="/location" className="nav-link">오시는 길</Link>
            <Link href="/notice" className="nav-link">농장 공지사항</Link>
          </nav>
        </div>
      </header>

      <div className="container">
        <h1 style={{textAlign: 'center', color: 'var(--primary-brown)', marginBottom: '2rem'}}>
          🛒 알밤 주문하기
        </h1>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start'}}>
          {/* 주문 폼 */}
          <div className="card">
            <h2>주문 정보 입력</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">상품 선택 *</label>
                <select 
                  name="productId" 
                  value={formData.productId} 
                  onChange={handleInputChange}
                  className="form-input"
                  required
                >
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.price.toLocaleString()}원
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">수량 *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  max="50"
                  className="form-input"
                  required
                />
              </div>

              {/* 주문자 정보 그룹 */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f8f5f0 0%, #f5f2ed 100%)',
                borderRadius: '15px',
                border: '2px solid var(--chestnut-light)',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  color: 'var(--chestnut-brown)',
                  marginBottom: '1.5rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  👤 주문자 정보
                </h3>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="form-group" style={{margin: 0}}>
                    <label className="form-label">주문자 이름 *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="주문자 이름"
                      required
                    />
                  </div>
                  
                  <div className="form-group" style={{margin: 0}}>
                    <label className="form-label">주문자 연락처 *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="010-0000-0000"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 수취인 정보 그룹 */}
              <div style={{
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #f0f8f5 0%, #edf5f2 100%)',
                borderRadius: '15px',
                border: '2px solid var(--chestnut-light)',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  color: 'var(--chestnut-brown)',
                  marginBottom: '1.5rem',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📦 수취인 정보
                </h3>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div className="form-group" style={{margin: 0}}>
                    <label className="form-label">수취인 이름 *</label>
                    <input
                      type="text"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="받으실 분 이름"
                      required
                    />
                  </div>
                  
                  <div className="form-group" style={{margin: 0}}>
                    <label className="form-label">수취인 연락처 *</label>
                    <input
                      type="tel"
                      name="recipientPhone"
                      value={formData.recipientPhone}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="010-0000-0000"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">배송 주소 *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="form-input form-textarea"
                  placeholder="배송받을 주소를 상세히 입력해주세요"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn" 
                style={{width: '100%', marginTop: '1rem'}}
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="loading"></span> : '주문하기'}
              </button>
            </form>
          </div>

          {/* 주문 요약 */}
          <div className="card">
            <h2>주문 요약</h2>
            
            {selectedProduct && (
              <>
                <div style={{padding: '1rem', background: 'var(--soft-beige)', borderRadius: '10px', marginBottom: '1rem'}}>
                  <h3 style={{marginBottom: '0.5rem'}}>{selectedProduct.name}</h3>
                  <p style={{color: 'var(--text-light)'}}>단가: {selectedProduct.price.toLocaleString()}원</p>
                  <p style={{color: 'var(--text-light)'}}>수량: {formData.quantity}개</p>
                </div>

                <div style={{fontSize: '1.2rem', fontWeight: '600', color: 'var(--warm-orange)', marginBottom: '2rem'}}>
                  총 금액: {totalPrice.toLocaleString()}원
                </div>
              </>
            )}

            <div className="alert alert-info">
              <h4>📦 배송 안내</h4>
              <p>• 주문 확인 후 2-3일 내 배송</p>
              <p>• 5kg 이상 주문 시 무료배송</p>
              <p>• 제주도/도서지역 추가 배송비</p>
              <p>• 신선도 유지를 위한 특수 포장</p>
            </div>

            <div className="alert alert-success">
              <h4>💳 결제 안내</h4>
              <p>• 농협 계좌 입금</p>
              <p>• 현금 결제 (직접 방문 시)</p>
              <p>• 주문 확인 전화 시 계좌 안내</p>
            </div>

            <div style={{marginTop: '2rem', padding: '1rem', background: 'var(--warm-gradient)', borderRadius: '10px'}}>
              <h4 style={{marginBottom: '1rem'}}>📞 농장 연락처</h4>
              <p><strong>청양 칠갑산 알밤 농장</strong></p>
              <p>📱 010-9123-9287</p>
              <p>📍 충남 청양군 남양면 충절로 265-27</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
