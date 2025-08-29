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
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [editableOrderData, setEditableOrderData] = useState<any>(null);
  const [sameAsOrderer, setSameAsOrderer] = useState(false);
  const [products, setProducts] = useState([
    { id: 1, name: '알밤 1kg', price: '15,000원', emoji: '🌰' },
    { id: 2, name: '알밤 3kg', price: '40,000원', emoji: '🌰' },
    { id: 3, name: '알밤 5kg', price: '65,000원', emoji: '🌰' },
    { id: 4, name: '껍질 깐 알밤 500g', price: '12,000원', emoji: '🌰' },
    { id: 5, name: '구운 알밤 1kg', price: '18,000원', emoji: '🌰' },
    { id: 6, name: '알밤 선물세트', price: '35,000원', emoji: '🎁' }
  ]);

  // 상품 목록 로드
  useEffect(() => {
    const savedProducts = localStorage.getItem('chestnutProducts');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
  }, []);

  const selectedProduct = products.find(p => p.id.toString() === formData.productId);
  const totalPrice = selectedProduct ? parseInt(selectedProduct.price.replace(/[^0-9]/g, '')) * formData.quantity : 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value) || 1 : value
    }));
  };

  // 연락처 형식 검증
  const validatePhoneNumber = (phone: string) => {
    // 한국 휴대폰 번호 형식: 010-1234-5678, 01012345678, 010 1234 5678
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$|^01[0-9]\s?[0-9]{3,4}\s?[0-9]{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  // 수취인 정보 동일 체크 처리
  const handleSameAsOrderer = (checked: boolean) => {
    setSameAsOrderer(checked);
    if (checked) {
      setFormData({
        ...formData,
        recipientName: formData.name,
        recipientPhone: formData.phone
      });
    } else {
      setFormData({
        ...formData,
        recipientName: '',
        recipientPhone: ''
      });
    }
  };

  const generateOrderNumber = () => {
    // 한국 시간(KST) 기준으로 주문번호 생성 - 구매하기용 (A 접두사)
    const kstTime = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)); // UTC + 9시간
    const month = String(kstTime.getMonth() + 1).padStart(2, '0'); // MM
    const year = kstTime.getFullYear().toString().slice(-2); // YY
    const day = String(kstTime.getDate()).padStart(2, '0'); // DD
    const hour = String(kstTime.getHours()).padStart(2, '0'); // HH
    const minute = String(kstTime.getMinutes()).padStart(2, '0'); // MM
    const second = String(kstTime.getSeconds()).padStart(2, '0'); // SS
    return `A${month}${year}${day}${hour}${minute}${second}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.recipientName || !formData.phone || !formData.recipientPhone || !formData.address) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 연락처 형식 검증
    if (!validatePhoneNumber(formData.phone)) {
      alert('주문자 연락처 형식이 올바르지 않습니다.\n올바른 형식: 010-1234-5678 또는 01012345678');
      return;
    }

    if (!validatePhoneNumber(formData.recipientPhone)) {
      alert('수취인 연락처 형식이 올바르지 않습니다.\n올바른 형식: 010-1234-5678 또는 01012345678');
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
          <div className="card" style={{textAlign: 'center', maxWidth: '600px', margin: '3rem auto'}}>
            <h1 style={{color: 'var(--primary-brown)', marginBottom: '2rem'}}>🎉 주문이 완료되었습니다!</h1>
            
            <div className="alert alert-success">
              <h3>주문번호: {orderNumber}</h3>
              <p>소중한 주문 감사합니다. 신선한 알밤을 정성껏 준비해서 배송해드리겠습니다.</p>
            </div>

            {/* 주문 요약 정보 */}
            <div style={{
              margin: '2rem 0',
              padding: '1.5rem',
              background: 'var(--creamy-white)',
              borderRadius: '10px',
              textAlign: 'left',
              border: '2px solid var(--chestnut-light)'
            }}>
              <h4 style={{textAlign: 'center', marginBottom: '1.5rem', color: 'var(--chestnut-brown)'}}>📋 주문 내용</h4>
              
              <div style={{display: 'grid', gap: '0.8rem'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>주문자:</span>
                  <span>{formData.name}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>수취인:</span>
                  <span>{formData.recipientName}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>연락처:</span>
                  <span>{formData.recipientPhone}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>배송지:</span>
                  <span style={{textAlign: 'right', maxWidth: '60%'}}>{formData.address}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>상품:</span>
                  <span>{selectedProduct?.name}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>수량:</span>
                  <span>{formData.quantity}개</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', marginTop: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>총 금액:</span>
                  <span style={{fontWeight: 'bold', color: 'var(--golden-brown)'}}>{totalPrice.toLocaleString()}원</span>
                </div>
              </div>
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
                  setSameAsOrderer(false);
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
                      <option key={product.id} value={product.id.toString()}>
                        {product.name} - {product.price}
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
                      pattern="01[0-9]-?[0-9]{3,4}-?[0-9]{4}|01[0-9]\s?[0-9]{3,4}\s?[0-9]{4}"
                      title="연락처 형식은 010-1234-5678로 작성하세요"
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
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem'}}>
                      <label className="form-label" style={{margin: 0}}>수취인 이름 *</label>
                      <label style={{display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', color: 'var(--text-light)'}}>
                        <input
                          type="checkbox"
                          checked={sameAsOrderer}
                          onChange={(e) => handleSameAsOrderer(e.target.checked)}
                          style={{accentColor: 'var(--chestnut-brown)'}}
                        />
                        주문자와 동일
                      </label>
                    </div>
                    <input
                      type="text"
                      name="recipientName"
                      value={formData.recipientName}
                      onChange={handleInputChange}
                      disabled={sameAsOrderer}
                      className="form-input"
                      placeholder="받으실 분 이름"
                      style={{background: sameAsOrderer ? '#f5f5f5' : 'white'}}
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
                      disabled={sameAsOrderer}
                      className="form-input"
                      placeholder="010-0000-0000"
                      pattern="01[0-9]-?[0-9]{3,4}-?[0-9]{4}|01[0-9]\s?[0-9]{3,4}\s?[0-9]{4}"
                      title="연락처 형식은 010-1234-5678로 작성하세요"
                      style={{background: sameAsOrderer ? '#f5f5f5' : 'white'}}
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
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
              <h2>주문 요약</h2>
              {isAdmin && (
                <button
                  onClick={() => {
                    if (isEditingOrder) {
                      setIsEditingOrder(false);
                      setEditableOrderData(null);
                    } else {
                      setIsEditingOrder(true);
                      setEditableOrderData({
                        productName: selectedProduct?.name || '',
                        quantity: formData.quantity,
                        unitPrice: selectedProduct ? parseInt(selectedProduct.price.replace(/[^0-9]/g, '')) : 0,
                        totalPrice: totalPrice
                      });
                    }
                  }}
                  className="btn btn-secondary"
                  style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
                >
                  {isEditingOrder ? '편집 취소' : '✏️ 편집'}
                </button>
              )}
            </div>
            
            {selectedProduct && (
              <>
                {isEditingOrder && editableOrderData ? (
                  <div style={{padding: '1rem', background: 'var(--soft-beige)', borderRadius: '10px', marginBottom: '1rem'}}>
                    <div className="form-group" style={{marginBottom: '1rem'}}>
                      <label className="form-label">상품명</label>
                      <input
                        type="text"
                        value={editableOrderData.productName}
                        onChange={(e) => setEditableOrderData({...editableOrderData, productName: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem'}}>
                      <div className="form-group" style={{margin: 0}}>
                        <label className="form-label">수량</label>
                        <input
                          type="number"
                          min="1"
                          value={editableOrderData.quantity}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            setEditableOrderData({
                              ...editableOrderData, 
                              quantity: newQuantity,
                              totalPrice: editableOrderData.unitPrice * newQuantity
                            });
                          }}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{margin: 0}}>
                        <label className="form-label">단가</label>
                        <input
                          type="number"
                          value={editableOrderData.unitPrice}
                          onChange={(e) => {
                            const newUnitPrice = parseInt(e.target.value) || 0;
                            setEditableOrderData({
                              ...editableOrderData, 
                              unitPrice: newUnitPrice,
                              totalPrice: newUnitPrice * editableOrderData.quantity
                            });
                          }}
                          className="form-input"
                        />
                      </div>
                    </div>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <strong>총 금액: {editableOrderData.totalPrice.toLocaleString()}원</strong>
                      <button
                        onClick={() => {
                          // 편집된 내용을 실제 폼 데이터에 반영
                          setFormData(prev => ({
                            ...prev,
                            quantity: editableOrderData.quantity
                          }));
                          setIsEditingOrder(false);
                          setEditableOrderData(null);
                        }}
                        className="btn"
                        style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
                      >
                        적용
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{padding: '1rem', background: 'var(--soft-beige)', borderRadius: '10px', marginBottom: '1rem'}}>
                      <h3 style={{marginBottom: '0.5rem'}}>{selectedProduct.name}</h3>
                      <p style={{color: 'var(--text-light)'}}>단가: {selectedProduct.price}</p>
                      <p style={{color: 'var(--text-light)'}}>수량: {formData.quantity}개</p>
                    </div>

                    <div style={{fontSize: '1.2rem', fontWeight: '600', color: 'var(--warm-orange)', marginBottom: '2rem'}}>
                      총 금액: {totalPrice.toLocaleString()}원
                    </div>
                  </>
                )}
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
