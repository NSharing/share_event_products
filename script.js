// -------------------------------------------------------------
// 설정 및 상수
// -------------------------------------------------------------
const API_URL = 'https://script.google.com/macros/s/AKfycbzhawNm5Wulg9AMFuw2x1BwYCoOOnRxmh-mqeXnrcTY8ERQNWm85dGZpDVsliAOZWWdAQ/exec'; 

document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ 자바스크립트 로드 완료");

  // DOM 요소
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
  const detailStatus = document.getElementById('detail-status'); // [NEW]
  const markCompleteBtn = document.getElementById('mark-complete-btn'); // [NEW]

  const commentList = document.getElementById('comment-list');
  const commentInputAuthor = document.getElementById('comment-author');
  const commentInputText = document.getElementById('comment-text');
  const commentSubmitButton = document.getElementById('submit-comment');

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');
  const openMenuBtn = document.getElementById('open-menu-btn');
  const openMenuBtnStats = document.getElementById('open-menu-btn-stats');
  const menuHome = document.getElementById('menu-home');
  const menuStats = document.getElementById('menu-stats');
  const statsView = document.getElementById('stats-view');
  const statsContainer = document.getElementById('stats-container');
  const dashboardGrid = document.getElementById('dashboard-grid');

  // [NEW] 필터 버튼들
  const filterBtns = document.querySelectorAll('.filter-btn');

  let allPosts = [];
  let allComments = [];
  let currentPostId = null; 
  let currentFilter = 'all'; // 현재 선택된 필터

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
    messageBox.innerHTML = `${showLoader ? '<span class="loading-indicator"></span>' : ''}<span>${text}</span>`;
    messageBox.style.backgroundColor = isError ? 'rgba(255, 60, 60, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    messageBox.classList.add('show');
    if (!showLoader) setTimeout(() => messageBox.classList.remove('show'), 3000);
  }
  function timeSince(timestamp) {
    const now = new Date(); const past = new Date(timestamp); 
    if (isNaN(past.getTime())) return "방금 전";
    const seconds = Math.floor((now - past) / 1000);
    if (seconds < 60) return "방금 전";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  }
  function formatPrice(price) { return Number(price).toLocaleString() + '원'; }
  function scrollToBottom() {
    const scrollArea = document.getElementById('detail-scroll-area');
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
  }

  // -------------------------------------------------------------
  // [NEW] 필터링 로직
  // -------------------------------------------------------------
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 스타일 업데이트
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 필터 적용
        currentFilter = btn.dataset.cat;
        renderPosts(); // 목록 다시 그리기
    });
  });

  // -------------------------------------------------------------
  // [NEW] 상태 변경 (거래완료) 로직
  // -------------------------------------------------------------
  async function markAsComplete() {
    const password = prompt("게시글 작성 시 설정한 비밀번호(4자리)를 입력하세요.");
    if (!password) return;

    showMessage('확인 중...', false, true);
    
    const payload = {
        action_type: 'update_status',
        post_id: currentPostId, // timestamp
        password: password
    };

    const formData = new URLSearchParams({ payload: JSON.stringify(payload) });

    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            showMessage('🎉 거래가 완료되었습니다!', false);
            // UI 즉시 반영
            document.getElementById('detail-status').textContent = '거래완료';
            document.getElementById('detail-status').style.color = '#94a3b8';
            markCompleteBtn.style.display = 'none'; // 버튼 숨기기
            fetchData(); // 전체 데이터 갱신
        } else {
            alert(data.message); // "비밀번호가 틀렸습니다" 등
            showMessage('❌ 실패: ' + data.message, true);
        }
    } catch (e) {
        showMessage('오류가 발생했습니다.', true);
    }
  }

  // -------------------------------------------------------------
  // 데이터 통신 및 렌더링
  // -------------------------------------------------------------
  async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json(); 
        allPosts = data.post || [];
        allComments = data.comment || [];
        renderPosts(); 
        if (detailView.classList.contains('is-open') && currentPostId) {
            // 상세화면이 열려있으면 해당 글 정보를 찾아서 업데이트 (상태 변경 등 반영)
            const post = allPosts.find(p => p.timestamp === currentPostId);
            if (post) openDetailView(post);
        }
        if (statsView.classList.contains('is-active')) renderStats();
    } catch (error) { console.error("로딩 오류:", error); }
  }

  function renderPosts() {
    postsContainer.innerHTML = ''; 
    // 필터링 적용
    let filtered = allPosts;
    if (currentFilter !== 'all') {
        filtered = allPosts.filter(p => p.item_type === currentFilter);
    }

    if (filtered.length === 0) {
        postsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); padding-top:50px;">해당하는 글이 없습니다.</p>';
        return;
    }
    
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    filtered.forEach(post => {
        const title = post.item_name || '제목 없음';
        const itemType = post.item_type || '기타';
        const price = formatPrice(post.price);
        const relativeTime = timeSince(post.timestamp);
        const rawMemo = post.memo || '';
        const previewText = rawMemo.substring(0, 40) + (rawMemo.length > 40 ? '...' : '');
        const commentCount = allComments.filter(c => String(c.post_id) === String(post.timestamp)).length;
        const isCompleted = post.status === '거래완료';

        const postElement = document.createElement('article');
        postElement.className = `post ${isCompleted ? 'completed' : ''}`;
        postElement.addEventListener('click', () => openDetailView(post));
        
        postElement.innerHTML = `
            <div class="post-row">
                <div>
                    <h2 class="title">${title} ${isCompleted ? '<span style="font-size:10px;color:#999;">(완료)</span>' : ''}</h2>
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
    if (locMatch) { locationText = locMatch[1]; contentText = contentText.replace(locMatch[0], ''); }

    detailTitle.textContent = postData.item_name;
    detailItem.textContent = postData.item_type;
    detailPrice.textContent = formatPrice(postData.price);
    detailLocation.textContent = locationText;
    detailContent.textContent = contentText;
    
    // 상태 표시
    const statusEl = document.getElementById('detail-status');
    statusEl.textContent = postData.status || '모집 중';
    
    if (postData.status === '거래완료') {
        statusEl.style.color = '#94a3b8'; // 회색
        markCompleteBtn.style.display = 'none'; // 이미 완료되면 버튼 숨김
    } else {
        statusEl.style.color = 'var(--accent)';
        markCompleteBtn.style.display = 'block'; // 모집 중이면 버튼 보임
    }

    renderComments(currentPostId);
    detailView.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(scrollToBottom, 100);
  }

  // (댓글 렌더링, 전송 등 나머지 함수들은 기존과 동일)
  function renderComments(postId) {
    commentList.innerHTML = '';
    const filteredComments = allComments.filter(c => String(c.post_id) === String(postId));
    if (filteredComments.length === 0) {
        commentList.innerHTML = '<p style="text-align:center; color:#999; font-size:13px; padding:20px;">첫 댓글을 남겨보세요!</p>';
        return;
    }
    filteredComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    filteredComments.forEach(comment => {
        const item = document.createElement('div');
        item.className = 'comment-item';
        item.innerHTML = `<div class="comment-item-header"><span class="comment-author">${comment.author}</span><span class="comment-time">${timeSince(comment.timestamp)}</span></div><p class="comment-text">${comment.content}</p>`;
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
    commentSubmitButton.disabled = true; commentSubmitButton.style.opacity = '0.5';
    const commentData = { action_type: 'new_comment', post_id: currentPostId, author: author, content: content };
    const formData = new URLSearchParams({ payload: JSON.stringify(commentData) });
    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) {
            commentInputText.value = ''; 
            const fakeComment = document.createElement('div');
            fakeComment.className = 'comment-item';
            fakeComment.style.border = "1px solid var(--accent)";
            fakeComment.innerHTML = `<div class="comment-item-header"><span class="comment-author">${author}</span><span class="comment-time">방금</span></div><p class="comment-text">${content}</p>`;
            commentList.appendChild(fakeComment);
            scrollToBottom();
            fetchData(); 
        } else { showMessage(`❌ 실패: ${data.message}`, true); }
    } catch (error) { showMessage('전송 오류', true); } 
    finally { commentSubmitButton.disabled = false; commentSubmitButton.style.opacity = '1'; }
  }

  async function savePost() {
    const titleInput = document.getElementById('post-title-field');
    const itemInput = document.getElementById('item-name-write');
    const priceInput = document.getElementById('price-write');
    const locationInput = document.getElementById('location-write');
    const contentInput = document.getElementById('post-content-write');
    const passwordInput = document.getElementById('password-write'); // [NEW]

    if (!titleInput.value.trim() || !itemInput.value || !passwordInput.value.trim()) { 
        alert("제목, 품목, 비밀번호는 필수입니다."); return; 
    }

    showMessage('게시글 저장 중...', false, true);
    closeWriteButtonUpload.disabled = true;
    const fullMemo = `[장소: ${locationInput.value.trim()}]\n${contentInput.value.trim()}`;
    const cleanPrice = priceInput.value.replace(/[^0-9]/g, '');
    
    const postData = { 
        action_type: 'new_post', 
        item_name: titleInput.value.trim(), 
        item_type: itemInput.value, 
        price: parseInt(cleanPrice) || 0, 
        memo: fullMemo, 
        comment_author_id: '익명User',
        password: passwordInput.value.trim() // [NEW] 비밀번호 전송
    };
    
    const formData = new URLSearchParams({ payload: JSON.stringify(postData) });
    try {
        const response = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await response.json();
        if(data.success) {
            showMessage('✅ 게시글 등록 완료!', false);
            titleInput.value = ''; itemInput.value = ''; priceInput.value = ''; 
            locationInput.value = ''; contentInput.value = ''; passwordInput.value = '';
            closeWriteModal();
            fetchData();
        }
    } catch(e) { showMessage('오류 발생', true); }
    closeWriteButtonUpload.disabled = false;
  }

  // (나머지 뷰 제어 함수들)
  function closeDetailView() { detailView.classList.remove('is-open'); document.body.style.overflow = 'auto'; currentPostId = null; }
  function openWriteModal() { writeModal.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeWriteModal() { writeModal.classList.remove('is-open'); document.body.style.overflow = 'auto'; }
  function toggleSidebar(show) {
      if (show) { sidebar.classList.add('is-open'); overlay.classList.add('is-open'); } 
      else { sidebar.classList.remove('is-open'); overlay.classList.remove('is-open'); }
  }
  function switchTab(tabName) {
      toggleSidebar(false);
      if (tabName === 'home') {
          statsView.classList.remove('is-active'); openWriteButton.classList.remove('hidden'); menuHome.classList.add('active'); menuStats.classList.remove('active');
      } else if (tabName === 'stats') {
          statsView.classList.add('is-active'); openWriteButton.classList.add('hidden'); menuStats.classList.add('active'); menuHome.classList.remove('active'); renderStats();
      }
  }
  function renderStats() { /* (이전 코드와 동일 - 생략 가능하나 전체 코드로 제공함) */
      const totalPosts = allPosts.length;
      const totalComments = allComments.length;
      const todayStr = new Date().toISOString().split('T')[0];
      const todayPosts = allPosts.filter(p => new Date(p.timestamp).toISOString().split('T')[0] === todayStr).length;
      const completedPosts = allPosts.filter(p => p.status === '거래완료').length;
      dashboardGrid.innerHTML = `<div class="stat-card"><span class="stat-card-title">📢 누적 나눔</span><span class="stat-card-value">${totalPosts}</span></div><div class="stat-card"><span class="stat-card-title">🎉 나눔 완료</span><span class="stat-card-value">${completedPosts}</span></div><div class="stat-card highlight"><span class="stat-card-title">💬 참여 댓글</span><span class="stat-card-value">${totalComments}</span></div><div class="stat-card highlight"><span class="stat-card-title">🔥 오늘의 열기</span><span class="stat-card-value">${todayPosts}</span></div>`;
      statsContainer.innerHTML = '';
      const counts = {}; let totalItemCount = 0;
      allPosts.forEach(post => { const type = post.item_type || '기타'; counts[type] = (counts[type] || 0) + 1; totalItemCount++; });
      const sortedTypes = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      const maxCount = sortedTypes.length > 0 ? counts[sortedTypes[0]] : 1;
      if (sortedTypes.length === 0) { statsContainer.innerHTML = '<p style="text-align:center;color:#999;margin-top:50px;">데이터가 없습니다.</p>'; return; }
      sortedTypes.forEach((type, index) => {
          const count = counts[type]; const barPercentage = (count / maxCount) * 100; const realPercentage = Math.round((count / totalItemCount) * 100); const rank = index + 1;
          const item = document.createElement('div'); item.className = 'stat-item';
          item.innerHTML = `<div class="stat-header"><div class="stat-info"><span class="stat-rank">${rank}</span><span class="stat-label">${type}</span></div><div class="stat-count-text"><span>${count}개</span> (${realPercentage}%)</div></div><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${barPercentage}%"></div></div>`;
          statsContainer.appendChild(item);
      });
  }

  // 이벤트 리스너
  fetchData(); setInterval(fetchData, 30000); 
  openWriteButton.addEventListener('click', openWriteModal);
  closeWriteButtonX.addEventListener('click', closeWriteModal);
  closeWriteButtonUpload.addEventListener('click', savePost);
  backToListButton.addEventListener('click', closeDetailView);
  if (commentSubmitButton) commentSubmitButton.onclick = handleCommentSubmit;
  openMenuBtn.addEventListener('click', () => toggleSidebar(true));
  openMenuBtnStats.addEventListener('click', () => toggleSidebar(true));
  overlay.addEventListener('click', () => toggleSidebar(false));
  menuHome.addEventListener('click', () => switchTab('home'));
  menuStats.addEventListener('click', () => switchTab('stats'));
  
  // [NEW] 상태변경 버튼
  if(markCompleteBtn) markCompleteBtn.addEventListener('click', markAsComplete);
});