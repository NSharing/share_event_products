// -------------------------------------------------------------
// 설정 및 상수
// -------------------------------------------------------------
const API_URL = 'https://script.google.com/macros/s/AKfycbzhawNm5Wulg9AMFuw2x1BwYCoOOnRxmh-mqeXnrcTY8ERQNWm85dGZpDVsliAOZWWdAQ/exec'; 

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소
  const postsContainer = document.querySelector('.posts');
  const openWriteButton = document.getElementById('open-write');
  const closeWriteButtonX = document.getElementById('close-write-x');
  const closeWriteButtonUpload = document.getElementById('close-write-upload');
  const writeModal = document.getElementById('write-modal');
  const detailView = document.getElementById('detail-view');
  const backToListButton = document.getElementById('back-to-list');
  
  // 상세 페이지 요소
  const detailTitle = document.getElementById('detail-title');
  const detailItem = document.getElementById('detail-item');
  const detailPrice = document.getElementById('detail-price');
  const detailLocation = document.getElementById('detail-location');
  const detailContent = document.getElementById('detail-content');

  // 메시지 박스 동적 생성 (HTML에 없으므로 JS로 생성)
  let messageBox = document.getElementById('message-box');
  if (!messageBox) {
    messageBox = document.createElement('div');
    messageBox.id = 'message-box';
    document.body.appendChild(messageBox);
  }

  // -------------------------------------------------------------
  // 유틸리티 함수
  // -------------------------------------------------------------
  
  // 알림 메시지 표시
  function showMessage(text, isError = false, showLoader = false) {
    messageBox.innerHTML = `
        ${showLoader ? '<span class="loading-indicator"></span>' : ''}
        <span>${text}</span>
    `;
    messageBox.style.backgroundColor = isError ? 'rgba(255, 60, 60, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    messageBox.classList.add('show');
    
    if (!showLoader) {
        setTimeout(() => {
            messageBox.classList.remove('show');
        }, 3000);
    }
  }

  // 상대 시간 계산
  function timeSince(timestamp) {
    const now = new Date();
    const past = new Date(timestamp); 
    if (isNaN(past.getTime())) return "방금 전";

    const seconds = Math.floor((now - past) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "년 전";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "개월 전";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "일 전";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "시간 전";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "분 전";
    
    if (seconds < 5) return "방금"; 
    return Math.floor(seconds) + "초 전";
  }

  // 숫자 포맷 (1,000원)
  function formatPrice(price) {
    if (!price) return '가격 미정';
    return Number(price).toLocaleString() + '원';
  }

  // -------------------------------------------------------------
  // 서버 통신 함수 (GET/POST)
  // -------------------------------------------------------------

  // 게시글 불러오기 (GET)
  async function fetchData() {
    // 로딩 중 표시 (기존 목록 유지하면서 투명도만 조절하거나, 메시지 띄우기)
    console.log("데이터 불러오는 중...");

    try {
        const response = await fetch(API_URL);
        const data = await response.json(); 
        
        const posts = data.post || [];
        postsContainer.innerHTML = ''; // 기존 목록 초기화

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); padding-top:50px;">아직 등록된 글이 없습니다.<br>첫 번째 글을 작성해보세요!</p>';
            return;
        }

        // 최신순 정렬
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        posts.forEach(post => {
            // 데이터 매핑
            const title = post.item_name || '제목 없음'; // 제목
            const itemType = post.item_type || '기타';   // 품목
            const price = formatPrice(post.price);
            const relativeTime = timeSince(post.timestamp);
            
            // memo 필드에서 장소와 내용 분리 시도 (단순히 전체를 내용으로 사용하되, 줄바꿈 처리)
            // 저장할 때 "장소: 강남역\n내용..." 형식으로 저장할 예정이므로 이를 고려
            const rawMemo = post.memo || '';
            
            // 미리보기 텍스트 생성
            const previewText = rawMemo.substring(0, 40) + (rawMemo.length > 40 ? '...' : '');

            const postElement = document.createElement('article');
            postElement.className = 'post';
            
            // 상세 보기 클릭 시 사용할 전체 데이터 저장
            postElement.dataset.json = JSON.stringify(post);

            postElement.innerHTML = `
                <div class="post-row">
                    <div>
                        <h2 class="title">${title}</h2>
                        <p class="preview" style="color:#555;">${itemType} · ${price}</p>
                        <p class="preview">${previewText}</p>
                        <p class="post-time">${relativeTime}</p>
                    </div>
                    <div class="comment-box">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6436" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>
                        <span class="comment-count">-</span> 
                    </div>
                </div>
            `;
            
            // 클릭 이벤트 리스너 (상세보기)
            postElement.addEventListener('click', () => openDetailView(post));
            
            postsContainer.appendChild(postElement);
        });

    } catch (error) {
        console.error("데이터 로딩 오류:", error);
        showMessage('데이터를 불러오는데 실패했습니다.', true);
    }
  }

  // 게시글 저장하기 (POST)
  async function savePost() {
    const titleInput = document.getElementById('post-title-field');
    const itemInput = document.getElementById('item-name-write');
    const priceInput = document.getElementById('price-write');
    const locationInput = document.getElementById('location-write');
    const contentInput = document.getElementById('post-content-write');

    // 필수 값 체크
    if (!titleInput.value.trim() || !itemInput.value.trim()) {
        showMessage('제목과 품목은 필수입니다.', true);
        return;
    }

    showMessage('게시글을 저장하고 있습니다...', false, true);
    closeWriteButtonUpload.disabled = true; // 중복 클릭 방지

    // Apps Script로 보낼 데이터 구성
    // memo 필드에 장소와 내용을 합쳐서 보냅니다.
    const fullMemo = `[장소: ${locationInput.value.trim()}]\n${contentInput.value.trim()}`;
    // 가격에서 숫자만 추출
    const cleanPrice = priceInput.value.replace(/[^0-9]/g, '');

    const postData = {
        action_type: 'new_post',
        item_name: titleInput.value.trim(), // 제목 -> item_name
        item_type: itemInput.value.trim(),  // 품목 -> item_type
        price: parseInt(cleanPrice) || 0,
        memo: fullMemo,
        comment_author_id: '익명User' // 로그인 기능이 없으므로 고정/임의값
    };

    const formData = new URLSearchParams({
        payload: JSON.stringify(postData)
    });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData 
        });
        const data = await response.json();

        if (data.success) {
            showMessage('✅ 게시글이 등록되었습니다!', false);
            
            // 입력 필드 초기화
            titleInput.value = '';
            itemInput.value = '';
            priceInput.value = '';
            locationInput.value = '';
            contentInput.value = '';
            
            closeWriteModal(); // 모달 닫기
            fetchData(); // 목록 새로고침
        } else {
            showMessage(`❌ 저장 실패: ${data.message}`, true);
        }

    } catch (error) {
        console.error("POST 요청 오류:", error);
        showMessage('네트워크 오류가 발생했습니다.', true);
    } finally {
        closeWriteButtonUpload.disabled = false;
    }
  }


  // -------------------------------------------------------------
  // UI 제어 함수
  // -------------------------------------------------------------

  function openDetailView(postData) {
    // 데이터 파싱 (Memo에서 장소 분리)
    let contentText = postData.memo || '';
    let locationText = '장소 미정';

    // "[장소: ...]" 패턴 찾기
    const locMatch = contentText.match(/^\[장소:\s*(.*?)\]\n?/);
    if (locMatch) {
        locationText = locMatch[1]; // 괄호 안의 텍스트 추출
        contentText = contentText.replace(locMatch[0], ''); // 원문에서 장소 태그 제거
    }

    // 상세 화면 채우기
    detailTitle.textContent = postData.item_name;
    detailItem.textContent = postData.item_type;
    detailPrice.textContent = formatPrice(postData.price);
    detailLocation.textContent = locationText;
    detailContent.textContent = contentText; // 줄바꿈은 CSS white-space로 처리됨

    // 댓글 목록 초기화 (서버 댓글 기능이 없으므로 비워둠)
    document.getElementById('comment-list').innerHTML = '<p style="text-align:center; color:#999; font-size:12px;">댓글 기능 준비 중입니다.</p>';

    // 뷰 전환
    detailView.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailView() {
    detailView.classList.remove('is-open');
    document.body.style.overflow = 'auto';
  }

  function openWriteModal() {
    writeModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeWriteModal() {
    writeModal.classList.remove('is-open');
    document.body.style.overflow = 'auto';
  }


  // -------------------------------------------------------------
  // 이벤트 리스너 등록
  // -------------------------------------------------------------

  // 초기 데이터 로드
  fetchData();
  
  // 30초마다 자동 새로고침
  setInterval(fetchData, 30000); 

  // 버튼 이벤트
  openWriteButton.addEventListener('click', openWriteModal);
  closeWriteButtonX.addEventListener('click', closeWriteModal);
  closeWriteButtonUpload.addEventListener('click', savePost);
  backToListButton.addEventListener('click', closeDetailView);

});