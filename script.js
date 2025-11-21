// -------------------------------------------------------------
// 설정 및 상수
// -------------------------------------------------------------
const API_URL = 'https://script.google.com/macros/s/AKfycbzhawNm5Wulg9AMFuw2x1BwYCoOOnRxmh-mqeXnrcTY8ERQNWm85dGZpDVsliAOZWWdAQ/exec'; 

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ 자바스크립트 로드 완료");

  // DOM 요소 가져오기
  const postsContainer = document.querySelector('.posts');
  const openWriteButton = document.getElementById('open-write');
  const closeWriteButtonX = document.getElementById('close-write-x');
  const closeWriteButtonUpload = document.getElementById('close-write-upload');
  const writeModal = document.getElementById('write-modal');
  const detailView = document.getElementById('detail-view');
  const backToListButton = document.getElementById('back-to-list');
  
  const detailTitle = document.getElementById('detail-title');
  const detailItem = document.getElementById('detail-item');
  const detailPrice = document.getElementById('detail-price');
  const detailLocation = document.getElementById('detail-location');
  const detailContent = document.getElementById('detail-content');

  // 댓글 요소 가져오기
  const commentList = document.getElementById('comment-list');
  const commentInputAuthor = document.getElementById('comment-author');
  const commentInputText = document.getElementById('comment-text');
  const commentSubmitButton = document.getElementById('submit-comment');

  // 전역 변수
  let allPosts = [];
  let allComments = [];
  let currentPostId = null; 

  // 메시지 박스 생성
  let messageBox = document.getElementById('message-box');
  if (!messageBox) {
    messageBox = document.createElement('div');
    messageBox.id = 'message-box';
    document.body.appendChild(messageBox);
  }

  // -------------------------------------------------------------
  // 유틸리티 함수
  // -------------------------------------------------------------
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

  function timeSince(timestamp) {
    const now = new Date();
    const past = new Date(timestamp); 
    if (isNaN(past.getTime())) return "방금 전";
    const seconds = Math.floor((now - past) / 1000);
    if (seconds < 60) return "방금 전";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  }

  function formatPrice(price) {
    if (!price) return '가격 미정';
    return Number(price).toLocaleString() + '원';
  }

  function scrollToBottom() {
    const scrollArea = document.getElementById('detail-scroll-area');
    if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  // -------------------------------------------------------------
  // 기능 함수들
  // -------------------------------------------------------------

  async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json(); 
        allPosts = data.post || [];
        allComments = data.comment || [];
        renderPosts(); 
        if (detailView.classList.contains('is-open') && currentPostId) {
            renderComments(currentPostId);
        }
    } catch (error) {
        console.error("데이터 로딩 오류:", error);
    }
  }

  function renderPosts() {
    postsContainer.innerHTML = ''; 
    if (allPosts.length === 0) {
        postsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); padding-top:50px;">등록된 글이 없습니다.</p>';
        return;
    }
    allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    allPosts.forEach(post => {
        const title = post.item_name || '제목 없음';
        const itemType = post.item_type || '기타';
        const price = formatPrice(post.price);
        const relativeTime = timeSince(post.timestamp);
        const rawMemo = post.memo || '';
        const previewText = rawMemo.substring(0, 40) + (rawMemo.length > 40 ? '...' : '');
        
        const commentCount = allComments.filter(c => String(c.post_id) === String(post.timestamp)).length;

        const postElement = document.createElement('article');
        postElement.className = 'post';
        postElement.addEventListener('click', () => openDetailView(post));
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
                    <span class="comment-count">${commentCount}</span> 
                </div>
            </div>
        `;
        postsContainer.appendChild(postElement);
    });
  }

  function openDetailView(postData) {
    currentPostId = postData.timestamp; 
    
    let contentText = postData.memo || '';
    let locationText = '장소 미정';
    const locMatch = contentText.match(/^\[장소:\s*(.*?)\]\n?/);
    if (locMatch) {
        locationText = locMatch[1]; 
        contentText = contentText.replace(locMatch[0], '');
    }

    detailTitle.textContent = postData.item_name;
    detailItem.textContent = postData.item_type;
    detailPrice.textContent = formatPrice(postData.price);
    detailLocation.textContent = locationText;
    detailContent.textContent = contentText;

    renderComments(currentPostId);
    detailView.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    
    setTimeout(scrollToBottom, 100);
  }

  function renderComments(postId) {
    commentList.innerHTML = '';
    const filteredComments = allComments.filter(c => String(c.post_id) === String(postId));

    if (filteredComments.length === 0) {
        commentList.innerHTML = '<p style="text-align:center; color:#999; font-size:13px; padding:20px;">첫 댓글을 남겨보세요!</p>';
        return;
    }
    
    // [오래된 순 정렬]
    filteredComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    filteredComments.forEach(comment => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `
            <div class="comment-item-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${timeSince(comment.timestamp)}</span>
            </div>
            <p class="comment-text">${comment.content}</p>
        `;
        commentList.appendChild(item);
    });
    scrollToBottom();
  }

  async function handleCommentSubmit(e) {
    e.preventDefault();
    const author = commentInputAuthor.value.trim() || '익명';
    const content = commentInputText.value.trim();

    if (!content) { alert("내용을 입력하세요!"); return; }
    if (!currentPostId) return;

    commentSubmitButton.disabled = true;
    commentSubmitButton.style.opacity = '0.5';

    const commentData = {
        action_type: 'new_comment',
        post_id: currentPostId, 
        author: author,
        content: content
    };

    const formData = new URLSearchParams({ payload: JSON.stringify(commentData) });

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            commentInputText.value = ''; 
            
            // 가짜 댓글 추가 (반응 속도 향상)
            const fakeComment = document.createElement('div');
            fakeComment.className = 'comment-item';
            fakeComment.style.border = "1px solid var(--accent)";
            fakeComment.innerHTML = `
                <div class="comment-item-header">
                    <span class="comment-author">${author}</span>
                    <span class="comment-time">방금</span>
                </div>
                <p class="comment-text">${content}</p>
            `;
            commentList.appendChild(fakeComment);
            
            scrollToBottom();
            fetchData(); 
        } else {
            showMessage(`❌ 실패: ${data.message}`, true);
        }
    } catch (error) {
        console.error(error);
        showMessage('전송 오류', true);
    } finally {
        commentSubmitButton.disabled = false;
        commentSubmitButton.style.opacity = '1';
    }
  }

  async function savePost() {
    const titleInput = document.getElementById('post-title-field');
    const itemInput = document.getElementById('item-name-write');
    const priceInput = document.getElementById('price-write');
    const locationInput = document.getElementById('location-write');
    const contentInput = document.getElementById('post-content-write');

    if (!titleInput.value.trim() || !itemInput.value.trim()) return;

    showMessage('게시글 저장 중...', false, true);
    closeWriteButtonUpload.disabled = true;

    const fullMemo = `[장소: ${locationInput.value.trim()}]\n${contentInput.value.trim()}`;
    const cleanPrice = priceInput.value.replace(/[^0-9]/g, '');

    const postData = {
        action_type: 'new_post',
        item_name: titleInput.value.trim(),
        item_type: itemInput.value.trim(),
        price: parseInt(cleanPrice) || 0,
        memo: fullMemo,
        comment_author_id: '익명User' 
    };

    const formData = new URLSearchParams({ payload: JSON.stringify(postData) });
    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        if(data.success) {
            showMessage('✅ 게시글 등록 완료!', false);
            titleInput.value = ''; itemInput.value = ''; priceInput.value = ''; locationInput.value = ''; contentInput.value = '';
            closeWriteModal();
            fetchData();
        }
    } catch(e) { showMessage('오류 발생', true); }
    closeWriteButtonUpload.disabled = false;
  }

  function closeDetailView() {
    detailView.classList.remove('is-open');
    document.body.style.overflow = 'auto';
    currentPostId = null;
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
  // 이벤트 리스너 연결
  // -------------------------------------------------------------
  fetchData();
  setInterval(fetchData, 30000); 

  openWriteButton.addEventListener('click', openWriteModal);
  closeWriteButtonX.addEventListener('click', closeWriteModal);
  closeWriteButtonUpload.addEventListener('click', savePost);
  backToListButton.addEventListener('click', closeDetailView);
  
  if (commentSubmitButton) {
      commentSubmitButton.onclick = handleCommentSubmit;
  }

});