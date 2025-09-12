'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  provider: 'email' | 'google';
  createdAt: string;
}

export default function Purchase() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentUser, userData, logout } = useAuth();
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

  // 로그인한 사용자 정보로 폼 자동 채우기
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        name: userData.name || '',
        phone: userData.phone || '',
        address: userData.address || ''
        // 수취인 정보는 사용자가 직접 입력하도록 변경
      }));
      // 주문자와 수취인이 동일 체크박스는 기본적으로 체크되지 않음
      setSameAsOrderer(false);
    }
  }, [userData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const [sameAsOrderer, setSameAsOrderer] = useState(false);
  
  // 전화번호 유효성 검사 상태
  const [phoneError, setPhoneError] = useState('');
  const [recipientPhoneError, setRecipientPhoneError] = useState('');

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value: string, setError: (error: string) => void) => {
    // 숫자만 추출
    const numbersOnly = value.replace(/[^0-9]/g, '');
    
    // 에러 초기화
    setError('');
    
    // 빈 값이면 그대로 반환
    if (numbersOnly.length === 0) {
      return '';
    }
    
    // 한국 휴대폰 번호 형식 검증
    if (!numbersOnly.startsWith('01')) {
      setError('한국 이동통신 전화번호는 01로 시작해야 합니다.');
      return value; // 현재 입력값 그대로 유지
    }
    
    if (numbersOnly.length > 3 && !['010', '011', '016', '017', '018', '019'].includes(numbersOnly.substring(0, 3))) {
      setError('올바른 한국 이동통신 번호가 아닙니다. (010, 011, 016, 017, 018, 019)');
      return value; // 현재 입력값 그대로 유지
    }
    
    if (numbersOnly.length > 11) {
      setError('전화번호는 11자리를 초과할 수 없습니다.');
      return numbersOnly.substring(0, 11); // 11자리까지만 잘라서 포맷팅
    }
    
    // 자동 하이픈 추가
    if (numbersOnly.length <= 3) {
      return numbersOnly;
    } else if (numbersOnly.length <= 7) {
      return numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3);
    } else {
      return numbersOnly.substring(0, 3) + '-' + numbersOnly.substring(3, 7) + '-' + numbersOnly.substring(7);
    }
  };
  const [infoCards, setInfoCards] = useState([
    {
      id: 1,
      title: '📦 배송 안내',
      type: 'info',
      items: [
        '• 주문 확인 후 2-3일 내 배송',
        '• 5kg 이상 주문 시 무료배송',
        '• 제주도/도서지역 추가 배송비',
        '• 신선도 유지를 위한 특수 포장'
      ]
    },
    {
      id: 2,
      title: '💳 결제 안내',
      type: 'success',
      items: [
        '• 농협 계좌 입금',
        '• 현금 결제 (직접 방문 시)',
        '• 주문 확인 전화 시 계좌 안내'
      ]
    },
    {
      id: 3,
      title: '📞 농장 연락처',
      type: 'contact',
      items: [
        '청양 칠갑산 알밤 농장',
        '📱 010-9123-9287',
        '📍 충남 청양군 남양면 충절로 265-27'
      ]
    }
  ]);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newCard, setNewCard] = useState({ title: '', type: 'info', items: [''] });
  const [products, setProducts] = useState([
    { id: 1, name: '알밤 1kg', price: '15,000원', emoji: '🌰' },
    { id: 2, name: '알밤 3kg', price: '40,000원', emoji: '🌰' },
    { id: 3, name: '알밤 5kg', price: '65,000원', emoji: '🌰' },
    { id: 4, name: '껍질 깐 알밤 500g', price: '12,000원', emoji: '🌰' },
    { id: 5, name: '구운 알밤 1kg', price: '18,000원', emoji: '🌰' },
    { id: 6, name: '알밤 선물세트', price: '35,000원', emoji: '🎁' }
  ]);

  // Firestore에서 상품 데이터 로드
  const loadProductsFromFirestore = async () => {
    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      console.log('구매 페이지: Firestore에서 상품 데이터 로드 시도...');
      const productsCollection = collection(db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      
      if (!productsSnapshot.empty) {
        const firestoreProducts = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: parseInt(doc.id),
            name: data.name || '',
            price: data.price || '',
            emoji: data.emoji || '🌰'
          };
        });
        
        // ID 순으로 정렬
        firestoreProducts.sort((a, b) => a.id - b.id);
        
        console.log('✅ 구매 페이지: Firestore에서 상품 데이터 로드 완료:', firestoreProducts.length);
        setProducts(firestoreProducts);
        return true;
      } else {
        console.log('⚠ 구매 페이지: Firestore에 상품 데이터가 없음');
        return false;
      }
    } catch (error) {
      console.error('❌ 구매 페이지: Firestore 상품 로드 실패:', error);
      return false;
    }
  };

  // 상품 목록 로드 (Firestore 우선, 실패 시 localStorage)
  useEffect(() => {
    const loadProducts = async () => {
      const firestoreLoaded = await loadProductsFromFirestore();
      
      if (!firestoreLoaded) {
        // Firestore 로드 실패 시 localStorage에서 로드
        const savedProducts = localStorage.getItem('chestnutProducts');
        if (savedProducts) {
          console.log('구매 페이지: localStorage에서 상품 데이터 로드');
          setProducts(JSON.parse(savedProducts));
        }
      }
    };
    
    loadProducts();
  }, []);

  // 안내 카드 로드
  useEffect(() => {
    const savedInfoCards = localStorage.getItem('purchaseInfoCards');
    if (savedInfoCards) {
      setInfoCards(JSON.parse(savedInfoCards));
    }
  }, []);

  // 안내 카드 관리 함수들
  const handleAddCard = () => {
    if (!newCard.title.trim() || newCard.items.some(item => !item.trim())) {
      alert('제목과 모든 항목을 입력해주세요.');
      return;
    }

    const cardToAdd = {
      ...newCard,
      id: Date.now(),
      items: newCard.items.filter(item => item.trim())
    };

    const updatedCards = [...infoCards, cardToAdd];
    setInfoCards(updatedCards);
    localStorage.setItem('purchaseInfoCards', JSON.stringify(updatedCards));
    
    setNewCard({ title: '', type: 'info', items: [''] });
    setShowAddCardForm(false);
  };

  const handleEditCard = (card: any) => {
    setEditingCard({ ...card });
  };

  const handleUpdateCard = () => {
    if (!editingCard.title.trim() || editingCard.items.some((item: string) => !item.trim())) {
      alert('제목과 모든 항목을 입력해주세요.');
      return;
    }

    const updatedCards = infoCards.map(card => 
      card.id === editingCard.id 
        ? { ...editingCard, items: editingCard.items.filter((item: string) => item.trim()) }
        : card
    );
    
    setInfoCards(updatedCards);
    localStorage.setItem('purchaseInfoCards', JSON.stringify(updatedCards));
    setEditingCard(null);
  };

  const handleDeleteCard = (cardId: number) => {
    if (confirm('이 안내 카드를 삭제하시겠습니까?')) {
      const updatedCards = infoCards.filter(card => card.id !== cardId);
      setInfoCards(updatedCards);
      localStorage.setItem('purchaseInfoCards', JSON.stringify(updatedCards));
    }
  };

  const addNewCardItem = () => {
    setNewCard({
      ...newCard,
      items: [...newCard.items, '']
    });
  };

  const removeNewCardItem = (index: number) => {
    setNewCard({
      ...newCard,
      items: newCard.items.filter((_, i) => i !== index)
    });
  };

  const addEditCardItem = () => {
    setEditingCard({
      ...editingCard,
      items: [...editingCard.items, '']
    });
  };

  const removeEditCardItem = (index: number) => {
    setEditingCard({
      ...editingCard,
      items: editingCard.items.filter((_: string, i: number) => i !== index)
    });
  };

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
    setRecipientPhoneError(''); // 에러 상태 초기화
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
    const now = new Date();
    const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC + 9시간 (KST)
    const year = kstTime.getUTCFullYear().toString().slice(-2); // YY
    const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0'); // MM
    const day = String(kstTime.getUTCDate()).padStart(2, '0'); // DD
    const hour = String(kstTime.getUTCHours()).padStart(2, '0'); // HH
    const minute = String(kstTime.getUTCMinutes()).padStart(2, '0'); // MM
    const second = String(kstTime.getUTCSeconds()).padStart(2, '0'); // SS
    return `A${year}${month}${day}${hour}${minute}${second}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.recipientName || !formData.phone || !formData.recipientPhone || !formData.address) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 전화번호 에러 상태 확인
    if (phoneError) {
      alert('주문자 연락처를 올바르게 입력해주세요.');
      return;
    }

    // 수취인 연락처 에러 상태 확인
    if (recipientPhoneError) {
      alert('수취인 연락처를 올바르게 입력해주세요.');
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

      // 로컬 스토리지에 주문 데이터 저장
      const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      existingOrders.push(orderData);
      localStorage.setItem('orders', JSON.stringify(existingOrders));

      // Firebase Firestore에도 주문 데이터 저장
      if (currentUser) {
        try {
          const { collection, addDoc } = await import('firebase/firestore');
          const { db } = await import('@/lib/firebase');
          
          const firestoreOrderData = {
            ...orderData,
            userId: currentUser.uid,
            userEmail: currentUser.email,
            createdAt: new Date().toISOString()
          };
          
          console.log('Firestore 주문 저장 시도:', {
            collection: 'orders',
            userId: currentUser.uid,
            orderNumber: orderData.orderNumber,
            projectId: db.app.options.projectId,
            databaseId: 'albam'
          });
          
          const docRef = await addDoc(collection(db, 'orders'), firestoreOrderData);
          console.log('✅ 주문 데이터가 Firestore에 저장되었습니다!', {
            docId: docRef.id,
            collection: 'orders',
            databaseId: 'albam'
          });
        } catch (firestoreError: any) {
          console.error('❌ Firestore 주문 저장 실패:', {
            code: firestoreError?.code,
            message: firestoreError?.message,
            stack: firestoreError?.stack
          });
          // Firestore 저장 실패해도 주문은 계속 진행
        }
      } else {
        console.log('⚠ 비로그인 사용자 - Firestore 저장 건너뜀');
      }

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
  칠갑산 알밤 농장
            </Link>
            <nav className="nav">
              <Link href="/" className="nav-link">상품</Link>
              <Link href="/purchase" className="nav-link">구매하기</Link>
              <Link href="/farm-intro" className="nav-link">농장 이야기</Link>
              <Link href="/storage" className="nav-link">저장 방법</Link>
              <Link href="/location" className="nav-link">오시는 길</Link>
              <Link href="/notice" className="nav-link">농장 공지사항</Link>
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
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>주문자 연락처:</span>
                  <span>{formData.phone}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>수취인:</span>
                  <span>{formData.recipientName}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--warm-beige)', paddingBottom: '0.5rem'}}>
                  <span style={{fontWeight: 'bold', color: 'var(--chestnut-brown)'}}>수취인 연락처:</span>
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
칠갑산 알밤 농장
          </Link>
          <nav className="nav">
            <Link href="/" className="nav-link">상품</Link>
            <Link href="/purchase" className="nav-link nav-link-active">구매하기</Link>
            <Link href="/farm-intro" className="nav-link">농장 이야기</Link>
            <Link href="/storage" className="nav-link">저장 방법</Link>
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
        <h1 style={{textAlign: 'center', color: 'var(--primary-brown)', marginBottom: '2rem'}}>
          🛒 알밤 주문하기
        </h1>

        <div className="purchase-layout">
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
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  background: 'white'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.quantity > 1) {
                        setFormData(prev => ({...prev, quantity: prev.quantity - 1}));
                      }
                    }}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: 'var(--soft-beige)',
                      color: 'var(--chestnut-brown)',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--chestnut-light)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'var(--soft-beige)';
                      e.currentTarget.style.color = 'var(--chestnut-brown)';
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    max="50"
                    style={{
                      width: '80px',
                      textAlign: 'center',
                      border: 'none',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      background: 'transparent',
                      outline: 'none'
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.quantity < 50) {
                        setFormData(prev => ({...prev, quantity: prev.quantity + 1}));
                      }
                    }}
                    style={{
                      width: '40px',
                      height: '40px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      background: 'var(--soft-beige)',
                      color: 'var(--chestnut-brown)',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--chestnut-light)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'var(--soft-beige)';
                      e.currentTarget.style.color = 'var(--chestnut-brown)';
                    }}
                  >
                    +
                  </button>
                </div>
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
                
                <div className="form-row">
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
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value, setPhoneError);
                        setFormData({...formData, phone: formattedValue});
                      }}
                      className="form-input"
                      placeholder="010-1234-5678"
                      style={{
                        border: phoneError ? '1px solid #ff4444' : undefined
                      }}
                      required
                    />
                    {phoneError && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem',
                        padding: '0.25rem',
                        backgroundColor: '#fff5f5',
                        border: '1px solid #ffcccc',
                        borderRadius: '3px'
                      }}>
                        {phoneError}
                      </div>
                    )}
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
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    color: 'var(--chestnut-brown)',
                    margin: 0,
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📦 수취인 정보
                  </h3>
                  <label style={{
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.3rem', 
                    fontSize: '0.9rem', 
                    color: 'var(--chestnut-brown)',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '15px',
                    border: '1px solid var(--chestnut-light)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={sameAsOrderer}
                      onChange={(e) => handleSameAsOrderer(e.target.checked)}
                      style={{
                        accentColor: 'var(--chestnut-brown)',
                        transform: 'scale(1.1)',
                        cursor: 'pointer'
                      }}
                    />
                    ✓ 주문자와 동일
                  </label>
                </div>
                
                <div className="form-row">
                  <div className="form-group" style={{margin: 0}}>
                    <label className="form-label">수취인 이름 *</label>
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
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value, setRecipientPhoneError);
                        setFormData({...formData, recipientPhone: formattedValue});
                      }}
                      disabled={sameAsOrderer}
                      className="form-input"
                      placeholder="010-1234-5678"
                      style={{
                        background: sameAsOrderer ? '#f5f5f5' : 'white',
                        border: recipientPhoneError ? '1px solid #ff4444' : undefined
                      }}
                      required
                    />
                    {recipientPhoneError && !sameAsOrderer && (
                      <div style={{
                        color: '#ff4444',
                        fontSize: '0.8rem',
                        marginTop: '0.25rem',
                        padding: '0.25rem',
                        backgroundColor: '#fff5f5',
                        border: '1px solid #ffcccc',
                        borderRadius: '3px'
                      }}>
                        {recipientPhoneError}
                      </div>
                    )}
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
            <h2 style={{marginBottom: '1rem'}}>주문 요약</h2>
            
            {selectedProduct && (
              <>
                <div style={{padding: '1rem', background: 'var(--soft-beige)', borderRadius: '10px', marginBottom: '1rem'}}>
                  <h3 style={{marginBottom: '0.5rem'}}>{selectedProduct.name}</h3>
                  <p style={{color: 'var(--text-light)'}}>단가: {selectedProduct.price}</p>
                  <p style={{color: 'var(--text-light)'}}>수량: {formData.quantity}개</p>
                </div>

                <div style={{fontSize: '1.2rem', fontWeight: '600', color: 'var(--warm-orange)', marginBottom: '2rem'}}>
                  총 금액: {totalPrice.toLocaleString()}원
                </div>

                {/* 구분선 */}
                <div style={{
                  width: '100%',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent 0%, var(--chestnut-light) 20%, var(--chestnut-light) 80%, transparent 100%)',
                  margin: '2rem 0',
                  borderRadius: '1px'
                }}></div>
              </>
            )}

            {/* 동적 안내 카드들 */}
            {infoCards.map(card => (
              <div 
                key={card.id} 
                className={`alert ${card.type === 'info' ? 'alert-info' : card.type === 'success' ? 'alert-success' : ''}`}
                style={card.type === 'contact' ? {
                  marginTop: '2rem', 
                  padding: '1rem', 
                  background: 'var(--warm-gradient)', 
                  borderRadius: '10px'
                } : {}}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                  <h4 style={{margin: 0}}>{card.title}</h4>
                  {isAdmin && (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button 
                        onClick={() => handleEditCard(card)}
                        style={{
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '5px',
                          background: 'rgba(255,255,255,0.2)'
                        }}
                      >
                        ✏️ 편집
                      </button>
                      <button 
                        onClick={() => handleDeleteCard(card.id)}
                        style={{
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '5px',
                          background: 'rgba(255,0,0,0.2)'
                        }}
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  )}
                </div>
                {card.items.map((item: string, index: number) => (
                  <p key={index} style={{margin: '0.5rem 0'}}>
                    {card.type === 'contact' && index === 0 ? <strong>{item}</strong> : item}
                  </p>
                ))}
              </div>
            ))}

            {/* 관리자 카드 추가 버튼 */}
            {isAdmin && (
              <div style={{margin: '1rem 0', textAlign: 'center'}}>
                <button 
                  onClick={() => setShowAddCardForm(true)}
                  className="btn btn-secondary"
                  style={{fontSize: '0.9rem'}}
                >
                  ➕ 안내 카드 추가
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 카드 추가 모달 */}
      {showAddCardForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{marginBottom: '1.5rem'}}>새 안내 카드 추가</h3>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>제목</label>
              <input
                type="text"
                value={newCard.title}
                onChange={(e) => setNewCard({...newCard, title: e.target.value})}
                placeholder="예: 📦 배송 안내"
                style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
              />
            </div>

            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>카드 유형</label>
              <select
                value={newCard.type}
                onChange={(e) => setNewCard({...newCard, type: e.target.value})}
                style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
              >
                <option value="info">정보 (파란색)</option>
                <option value="success">성공 (초록색)</option>
                <option value="contact">연락처 (그라데이션)</option>
              </select>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>내용</label>
              {newCard.items.map((item, index) => (
                <div key={index} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updatedItems = [...newCard.items];
                      updatedItems[index] = e.target.value;
                      setNewCard({...newCard, items: updatedItems});
                    }}
                    placeholder="내용을 입력하세요"
                    style={{flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  />
                  {newCard.items.length > 1 && (
                    <button
                      onClick={() => removeNewCardItem(index)}
                      style={{
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addNewCardItem}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                ➕ 항목 추가
              </button>
            </div>

            <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => {
                  setShowAddCardForm(false);
                  setNewCard({ title: '', type: 'info', items: [''] });
                }}
                style={{
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddCard}
                style={{
                  background: 'var(--chestnut-brown)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카드 편집 모달 */}
      {editingCard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{marginBottom: '1.5rem'}}>안내 카드 편집</h3>
            
            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>제목</label>
              <input
                type="text"
                value={editingCard.title}
                onChange={(e) => setEditingCard({...editingCard, title: e.target.value})}
                style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
              />
            </div>

            <div style={{marginBottom: '1rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>카드 유형</label>
              <select
                value={editingCard.type}
                onChange={(e) => setEditingCard({...editingCard, type: e.target.value})}
                style={{width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
              >
                <option value="info">정보 (파란색)</option>
                <option value="success">성공 (초록색)</option>
                <option value="contact">연락처 (그라데이션)</option>
              </select>
            </div>

            <div style={{marginBottom: '1.5rem'}}>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 'bold'}}>내용</label>
              {editingCard.items.map((item: string, index: number) => (
                <div key={index} style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updatedItems = [...editingCard.items];
                      updatedItems[index] = e.target.value;
                      setEditingCard({...editingCard, items: updatedItems});
                    }}
                    style={{flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '5px'}}
                  />
                  {editingCard.items.length > 1 && (
                    <button
                      onClick={() => removeEditCardItem(index)}
                      style={{
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '0.5rem',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addEditCardItem}
                style={{
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                ➕ 항목 추가
              </button>
            </div>

            <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
              <button
                onClick={() => setEditingCard(null)}
                style={{
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleUpdateCard}
                style={{
                  background: 'var(--chestnut-brown)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }}
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

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
