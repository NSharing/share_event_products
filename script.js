// -------------------------------------------------------------
// Apps Script 웹 앱 URL (반드시 본인의 배포 URL로 변경해야 합니다!)
// -------------------------------------------------------------
// 현재 예시 URL을 사용자의 실제 배포 URL로 바꿔주세요.
const API_URL = 'https://script.google.com/macros/s/AKfycbzhawNm5Wulg9AMFuw2x1BwYCoOOnRxmh-mqeXnrcTY8ERQNWm85dGZpDVsliAOZWWdAQ/exec'; 

// -------------------------------------------------------------
// UI 메시지 함수 (alert() 대신 사용)
// -------------------------------------------------------------
const messageBox = document.getElementById('message-box');
function showMessage(text, isError = false, showLoader = false) {
    messageBox.innerHTML = `
        ${showLoader ? '<span class="loading-indicator"></span> ' : ''}
        ${text}
    `;
    if (isError) {
        messageBox.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    } else {
        messageBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    }
    messageBox.classList.add('show');
    
    if (!showLoader) {
        setTimeout(() => {
            messageBox.classList.remove('show');
        }, 3000); // 3초 후 메시지 숨김
    }
}

// -------------------------------------------------------------
// 핵심 기능 1: 상대 시간 계산 함수 ('n분 전' 구현)
// -------------------------------------------------------------
function timeSince(timestamp) {
    const now = new Date();
    const past = new Date(timestamp); 
    // 유효하지 않은 타임스탬프 처리
    if (isNaN(past.getTime())) return "시간 정보 없음";

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

// -------------------------------------------------------------
// 핵심 기능 2: Apps Script에 게시글 데이터 저장 (POST)
// -------------------------------------------------------------
async function savePost(postData) {
    showMessage('게시글 저장 중입니다. 잠시만 기다려주세요...', false, true);
    const submitButton = document.getElementById('submit-post');
    submitButton.disabled = true; // 중복 제출 방지

    // Apps Script가 인식하는 URLSearchParams 형식으로 데이터 변환
    const formData = new URLSearchParams({
        payload: JSON.stringify(postData)
    });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData 
        });
        const data = await response.json();

        // 로딩 메시지 제거
        showMessage(' ', false, false);

        if (data.success) {
            showMessage('✅ 게시글이 성공적으로 등록되었습니다!', false);
            // 성공 시 목록을 새로고침하여 새 글을 표시
            fetchData(); 
        } else {
            showMessage(`❌ 저장 실패: ${data.message}`, true);
        }

    } catch (error) {
        console.error("POST 요청 중 오류 발생:", error);
        showMessage('❌ 네트워크 오류가 발생했습니다. Apps Script URL을 확인해주세요.', true);
    } finally {
        submitButton.disabled = false;
    }
}

// -------------------------------------------------------------
// 핵심 기능 3: Apps Script에서 게시글/댓글 데이터 불러오기 (GET)
// -------------------------------------------------------------
async function fetchData() {
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = '<p style="text-align: center; color: var(--muted);">데이터를 불러오는 중입니다...</p>';

    try {
        const response = await fetch(API_URL);
        const data = await response.json(); 
        
        const posts = data.post || [];

        postsContainer.innerHTML = ''; 

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p style="text-align: center; color: var(--muted);">아직 등록된 행사가 없습니다. 첫 글을 작성해 보세요!</p>';
            return;
        }

        // 가장 최근 글이 위로 오도록 내림차순 정렬
        posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));


        posts.forEach(post => {
            // 시트 컬럼 이름: item_name, item_type, price, memo, status, timestamp
            const relativeTime = timeSince(post.timestamp);
            const itemType = post.item_type || '기타';
            const status = post.status || '모집 중';
            const price = post.price ? `${post.price}원` : '가격 미정';
            // 메모의 첫 줄만 가져와 미리보기로 사용
            const memoPreview = (post.memo || '').split('\n')[0].substring(0, 30) + '...';

            const postElement = document.createElement('article');
            postElement.className = 'post';

            // 게시글 HTML 구성
            postElement.innerHTML = `
                <div class="post-row">
                    <div>
                        <h2 class="title">[${itemType}] ${post.item_name || '제목 없음'}</h2>
                        <p class="preview">${memoPreview}</p>
                        <p class="post-time">
                            <span style="color: #1a73e8; font-weight: 600;">${status}</span> | 
                            분담금: ${price} | 
                            <span style="color: var(--accent); font-weight: 600;">${relativeTime}</span>
                        </p>
                    </div>
                    <div class="comment-box">
                        <!-- 댓글 카운트 (현재는 0으로 고정) -->
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6436" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>
                        <span class="comment-count">0</span>
                    </div>
                </div>
            `;
            postsContainer.appendChild(postElement);
        });

    } catch (error) {
        console.error("데이터 로딩 오류:", error);
        postsContainer.innerHTML = '<p style="text-align: center; color: red;">데이터 로딩에 실패했습니다. Apps Script URL과 시트 이름을 확인하세요.</p>';
    }
}


// -------------------------------------------------------------
// DOM 로드 및 이벤트 리스너 설정
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const openButton = document.getElementById('open-write');
    const submitButton = document.getElementById('submit-post');
    const refreshButton = document.getElementById('refresh-posts');
    const writeModal = document.getElementById('write-modal');

    // 1. 게시글 목록 초기 로드 및 새로고침 이벤트
    fetchData(); 
    // 30초마다 자동 새로고침하여 시간 업데이트
    setInterval(fetchData, 30000); 
    refreshButton.addEventListener('click', fetchData);


    // 2. 모달 열기 함수 (✎ 버튼 클릭)
    openButton.addEventListener('click', () => {
        writeModal.classList.add('is-open');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    });

    // 3. 모달 닫기 및 게시글 저장 처리 ('글 올리기' 버튼 클릭)
    submitButton.addEventListener('click', async () => {
        
        const itemName = document.getElementById('item-name').value.trim();
        const itemType = document.getElementById('item-type').value;
        const price = document.getElementById('price').value;
        const memo = document.getElementById('memo').value.trim();
        const postId = document.getElementById('post-id').value.trim(); // 익명 ID

        // 필수 입력 필드 검증 (품목명 및 익명 ID)
        if (!itemName || !postId) {
            showMessage('❗ 품목명과 익명 ID는 필수 입력 사항입니다.', true);
            return;
        }

        // Apps Script에 보낼 데이터 객체 구성 (시트 컬럼명과 일치해야 함)
        const postData = {
            action_type: 'new_post',
            item_name: itemName,
            item_type: itemType,
            // price는 숫자로 변환, 실패 시 0
            price: parseInt(price) || 0, 
            memo: memo,
            comment_author_id: postId 
        };
        
        // 데이터 저장 함수 호출
        await savePost(postData);

        // 저장 후 모달 닫기 및 필드 초기화
        writeModal.classList.remove('is-open');
        document.body.style.overflow = 'auto';
        
        document.getElementById('item-name').value = '';
        document.getElementById('item-type').value = '음료';
        document.getElementById('price').value = '';
        document.getElementById('memo').value = '';
        document.getElementById('post-id').value = '';
    });
    
});