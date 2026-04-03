const API_BASE_URL = '/api';

/**
 * Utility to handle API calls with authentication
 */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('access_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            localStorage.removeItem('access_token');
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData) || 'API Request Failed');
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateUserUI();
    initPage();
    setupSharedEvents();
});

function checkAuth() {
    const publicPages = ['login.html', 'index.html', 'dacsan.html', 'trending.html'];
    const path = window.location.pathname;
    const isPublic = publicPages.some(page => path.includes(page)) || path === '/' || path.endsWith('/');
    const token = localStorage.getItem('access_token');

    // Protect Admin Page
    if (path.includes('admin.html')) {
        const userData = JSON.parse(localStorage.getItem('user_data'));
        if (!userData || userData.role_name !== 'Admin') {
            window.location.href = 'index.html';
            return;
        }
    }

    // Redirect Admin from Home index.html directly to Admin.html
    const isHome = path.includes('index.html') || path === '/' || path.endsWith('/');
    if (isHome) {
        const userData = JSON.parse(localStorage.getItem('user_data'));
        if (userData && userData.role_name === 'Admin') {
            window.location.href = 'admin.html';
            return;
        }
    }

    if (!token && !isPublic) {
        window.location.href = 'login.html';
    }
}

async function updateUserUI() {
    const token = localStorage.getItem('access_token');
    const headerRight = document.querySelector('.header-right');

    if (!token) {
        if (headerRight) {
            headerRight.innerHTML = `
                <a href="/login.html" style="
                    background: var(--primary-color);
                    color: white;
                    padding: 8px 18px;
                    border-radius: 20px;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                "><i class="fas fa-user-circle"></i> Đăng nhập</a>
            `;
        }
        // Hide create-post-box for guests
        const createPostBox = document.getElementById('create-post-box');
        if (createPostBox) createPostBox.style.display = 'none';

        // Hide profile menu item in sidebar for guests
        const sidebarProfile = document.querySelector('.sidebar-menu .menu-item:first-child');
        if (sidebarProfile) sidebarProfile.style.display = 'none';
        
        return;
    }

    // Show create-post-box for logged in users
    const createPostBox = document.getElementById('create-post-box');
    if (createPostBox) createPostBox.style.display = 'block';

    try {
        const userData = await apiFetch('/auth/me/');
        if (userData) {
            localStorage.setItem('user_data', JSON.stringify(userData));
            
            document.querySelectorAll('.avatar-small, .avatar-medium, .avatar-menu, .profile-avatar-sync').forEach(img => {
                img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || userData.username)}&background=f7630c&color=fff`;
            });

            const authorTitles = document.querySelectorAll('.author-name, #author-name, #profile-name');
            authorTitles.forEach(el => el.innerText = userData.full_name || userData.username);

            // Role-Based UI Filtering
            if (userData.role_name === 'Admin') {
                // 1. Hide irrelevant sidebar items for Admin
                const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
                menuItems.forEach(item => {
                    const text = item.querySelector('span')?.innerText;
                    if (text && (text.includes('Người dùng') || text.includes('Đặc sản') || text.includes('Món đã lưu'))) {
                        item.style.display = 'none';
                    }
                });

                // 2. Add/Ensure Admin Dashboard Link in sidebar
                const sidebarMenu = document.querySelector('.sidebar-menu');
                if (sidebarMenu && !document.getElementById('admin-sidebar-link')) {
                    const li = document.createElement('li');
                    li.className = 'menu-item';
                    li.id = 'admin-sidebar-link';
                    li.innerHTML = `
                        <a href="admin.html" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--primary-color); font-weight: bold; width: 100%;">
                            <div class="menu-icon specialty" style="background: var(--primary-color);"><i class="fas fa-user-shield"></i></div>
                            <span>Quản trị viên</span>
                        </a>`;
                    sidebarMenu.prepend(li); // Put it at the top
                }

                // 3. Update Bottom Nav for Admin
                const bottomNav = document.querySelector('.bottom-navbar');
                if (bottomNav) {
                    bottomNav.innerHTML = `
                        <a href="admin.html" class="bottom-nav-item ${window.location.pathname.includes('admin.html') ? 'active' : ''}">
                            <i class="fas fa-chart-line"></i>
                            <span>Quản trị</span>
                        </a>
                        <a href="index.html" class="bottom-nav-item ${window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/') ? 'active' : ''}">
                            <i class="fas fa-home"></i>
                            <span>Trang chủ</span>
                        </a>
                        <a href="trending.html" class="bottom-nav-item ${window.location.pathname.includes('trending.html') ? 'active' : ''}">
                            <i class="fas fa-fire"></i>
                            <span>Xu hướng</span>
                        </a>
                    `;
                }

                // 4. Add to dropdown
                const dropdown = document.getElementById('profileDropdown');
                if (dropdown && !document.getElementById('admin-dropdown-link')) {
                    const adminLink = document.createElement('a');
                    adminLink.id = 'admin-dropdown-link';
                    adminLink.href = 'admin.html';
                    adminLink.innerHTML = '<i class="fas fa-chart-line"></i> Dashboard Quản trị';
                    adminLink.style.color = 'var(--primary-color)';
                    dropdown.prepend(adminLink);
                }
            }

            // Profile Page Specifics
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar) {
                profileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || userData.username)}&background=f7630c&color=fff&size=200`;
            }
        }
    } catch (e) {
        console.error('Could not fetch user data');
    }
}

function setupSharedEvents() {
    // Profile Dropdown Toggle
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.querySelector('.profile-dropdown');
            dropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.profile-dropdown, .options-dropdown').forEach(d => d.classList.remove('show'));
    });

    const logoutBtn = document.querySelector('.logout-item');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_data');
            window.location.href = 'login.html';
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
                window.location.href = `timkiem.html?q=${encodeURIComponent(searchInput.value.trim())}`;
            }
        });
    }

    const bellBtn = document.querySelector('.fa-bell')?.parentElement;
    if (bellBtn) {
        bellBtn.addEventListener('click', () => window.location.href = 'thongbao.html');
    }
}

function initPage() {
    const path = window.location.pathname;

    if (path.includes('login.html')) {
        initLoginPage();
    } else if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        loadFeed();
    } else if (path.includes('chitiet.html')) {
        const id = new URLSearchParams(window.location.search).get('id');
        if (id) loadPostDetail(id);
    } else if (path.includes('dangbai.html')) {
        initCreatePostPage();
    } else if (path.includes('timkiem.html')) {
        const q = new URLSearchParams(window.location.search).get('q');
        if (q) performSearch(q);
    } else if (path.includes('admin.html')) {
        initAdminDashboard();
    } else if (path.includes('dacsan.html')) {
        initRegionPage();
    } else if (path.includes('profile.html')) {
        initProfilePage();
    } else if (path.includes('saved.html')) {
        initSavedPage();
    } else if (path.includes('trending.html')) {
        initTrendingPage();
    }
}

async function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.querySelector('#username').value;
            const password = loginForm.querySelector('#password').value;

            try {
                const data = await apiFetch('/auth/login/', {
                    method: 'POST',
                    body: JSON.stringify({ username, password })
                });

                if (data && data.token) {
                    localStorage.setItem('access_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    if (data.user.role_name === 'Admin') window.location.href = 'admin.html';
                    else window.location.href = 'index.html';
                }
            } catch (err) {
                alert('Đăng nhập thất bại: Tài khoản hoặc mật khẩu không đúng');
            }
        });
    }

    document.getElementById('show-register')?.addEventListener('click', () => {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('register-container').classList.remove('hidden');
    });
    
    document.getElementById('show-login')?.addEventListener('click', () => {
        document.getElementById('register-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
    });

    document.getElementById('show-forgot')?.addEventListener('click', () => {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('forgot-container').classList.remove('hidden');
    });

    document.getElementById('back-to-login')?.addEventListener('click', () => {
        document.getElementById('forgot-container').classList.add('hidden');
        document.getElementById('login-container').classList.remove('hidden');
    });

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Yêu cầu đã được gửi! Vui lòng kiểm tra email của bạn để đặt lại mật khẩu.');
            document.getElementById('forgot-container').classList.add('hidden');
            document.getElementById('login-container').classList.remove('hidden');
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const registerData = {
                full_name: registerForm.querySelector('#reg-fullname').value,
                username: registerForm.querySelector('#reg-username').value,
                email: registerForm.querySelector('#reg-email').value,
                password: registerForm.querySelector('#reg-password').value
            };

            try {
                const data = await apiFetch('/auth/register/', {
                    method: 'POST',
                    body: JSON.stringify(registerData)
                });

                if (data && data.token) {
                    alert('Đăng ký thành công!');
                    localStorage.setItem('access_token', data.token);
                    localStorage.setItem('user_data', JSON.stringify(data.user));
                    window.location.href = 'index.html';
                }
            } catch (err) { alert('Đăng ký thất bại: ' + err.message); }
        });
    }
}

async function loadFeed() {
    const container = document.getElementById('post-list');
    if (!container) return;

    try {
        const posts = await apiFetch('/posts/?status=Active');
        if (posts && posts.length > 0) {
            container.innerHTML = '';
            posts.forEach(post => container.appendChild(createPostCard(post)));
        } else {
            container.innerHTML = '<div class="card" style="text-align:center; padding:40px;">Chưa có món ăn nào được chia sẻ.</div>';
        }
    } catch (err) { container.innerHTML = '<div class="card" style="text-align:center; padding:40px; color:red;">Lỗi kết nối server.</div>'; }

    document.querySelector('.mock-input')?.addEventListener('click', () => {
        if (!localStorage.getItem('access_token')) {
            window.location.href = 'login.html';
        } else {
            window.location.href = 'dangbai.html';
        }
    });
}

function createPostCard(post) {
    const div = document.createElement('div');
    div.className = 'card post';
    div.innerHTML = `
        <div class="post-header">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random" alt="Author" class="avatar-medium">
            <div class="post-meta">
                <h4 class="author-name">${post.author_name} <span style="font-weight: 400; color: var(--text-secondary); font-size: 14px;">tại <strong style="color: var(--text-main);">${post.region_name}</strong></span></h4>
                <span class="post-time">${new Date(post.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
            <div class="post-options-container">
                <div class="post-options" onclick="this.nextElementSibling.classList.toggle('show')">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                <div class="options-dropdown">
                    <a href="#" onclick="toggleFavorite(${post.post_id})"><i class="fas fa-bookmark"></i> Lưu món ăn</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="reportPost(${post.post_id})"><i class="fas fa-flag"></i> Báo cáo</a>
                </div>
            </div>
        </div>
        <div class="post-content" style="margin-bottom: 8px;">
            <p style="font-size:15px; font-weight:600; margin-bottom:10px;">${post.title}</p>
            <img src="${post.thumbnail || 'https://picsum.photos/seed/food/800/600'}" alt="${post.title}" class="post-img" style="cursor:pointer; width:100%; border-radius:12px; max-height:420px; object-fit:cover; display:block;" onclick="window.location.href='chitiet.html?id=${post.post_id}'">
        </div>
        <div class="post-footer">
            <div class="reaction-bar">
                <div class="reaction-btn-wrapper">
                    <button class="reaction-trigger" id="react-btn-${post.post_id}" onclick="toggleReaction(${post.post_id}, 'like')">
                        <span class="react-emoji"><i class="far fa-thumbs-up"></i></span> <span class="react-label" id="react-label-${post.post_id}">Thích</span>
                    </button>
                    <div class="reaction-popup" id="popup-${post.post_id}">
                        <span class="reaction-emoji" title="Yêu thích" onclick="toggleReaction(${post.post_id}, 'love')">❤️</span>
                        <span class="reaction-emoji" title="Ngon lắm" onclick="toggleReaction(${post.post_id}, 'yummy')">😋</span>
                        <span class="reaction-emoji" title="Ấn tượng" onclick="toggleReaction(${post.post_id}, 'wow')">😮</span>
                        <span class="reaction-emoji" title="Hay quá" onclick="toggleReaction(${post.post_id}, 'clap')">👏</span>
                        <span class="reaction-emoji" title="Hot" onclick="toggleReaction(${post.post_id}, 'hot')">🔥</span>
                    </div>
                </div>
                <button class="reaction-trigger" onclick="window.location.href='chitiet.html?id=${post.post_id}#comments'">
                    <span class="react-emoji">💬</span> Bình luận
                </button>
                <button class="btn-view-recipe" onclick="window.location.href='chitiet.html?id=${post.post_id}'">Xem chi tiết</button>
            </div>
        </div>
    `;
    return div;
}

function toggleReaction(postId, type) {
    const emojis = { like: '👍', love: '❤️', yummy: '😋', wow: '😮', clap: '👏', hot: '🔥' };
    const texts = { like: 'Thích', love: 'Yêu thích', yummy: 'Ngon lắm', wow: 'Ấn tượng', clap: 'Hay quá', hot: 'Hot' };
    
    const btn = document.getElementById(`react-btn-${postId}`);
    if (btn) {
        const emojiSpan = btn.querySelector('.react-emoji');
        const labelSpan = btn.querySelector('.react-label');
        
        // Toggle logic: if user clicked 'like' and already has a reaction, remove it (Unlike)
        if (type === 'like' && btn.dataset.reacted) {
            if (emojiSpan) emojiSpan.innerHTML = '<i class="far fa-thumbs-up"></i>';
            if (labelSpan) labelSpan.textContent = 'Thích';
            btn.style.color = '#65676B'; // Default gray color
            delete btn.dataset.reacted;
        } else {
            // Set reaction
            if (type === 'like') {
                if (emojiSpan) emojiSpan.innerHTML = '<i class="fas fa-thumbs-up"></i>';
            } else {
                if (emojiSpan) emojiSpan.textContent = emojis[type] || '👍';
            }
            if (labelSpan) labelSpan.textContent = texts[type] || 'Thích';
            
            // Assign specific colors for reactions
            const colorMap = { 
                like: 'var(--primary-color)', 
                love: '#e41e3f', 
                yummy: '#f5a623', 
                wow: '#f5a623', 
                clap: '#f5a623', 
                hot: '#ff6b00' 
            };
            btn.style.color = colorMap[type] || 'var(--primary-color)';
            btn.dataset.reacted = type;
        }
    }

    const popup = document.getElementById(`popup-${postId}`);
    if (popup) {
        // Temporarily hide the popup to acknowledge the click
        popup.style.display = 'none';
        // Clear the inline style so the CSS hover effect works again later
        setTimeout(() => {
            popup.style.display = '';
        }, 200);
    }
}

async function loadPostDetail(id) {
    const container = document.getElementById('post-detail-container');
    if (!container) return;

    try {
        const post = await apiFetch(`/posts/${id}/`);
        if (!post) return;

        document.getElementById('author-name').innerText = post.author_name;
        document.getElementById('author-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random`;

        container.innerHTML = `
            <div class="detail-hero">
                <img src="${post.thumbnail || 'https://picsum.photos/seed/food/1200/800'}" alt="${post.title}">
                <div class="detail-hero-overlay">
                    <h1>${post.title}</h1>
                    <p>${post.region_name} · ${new Date(post.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
            </div>
            <div class="detail-content">
                <div class="section-title">Giới thiệu</div>
                <p>${post.content || 'Món ăn đặc sắc mang đậm hương vị truyền thống.'}</p>
                <div class="section-title">Nguyên liệu</div>
                <ul>${post.ingredients ? post.ingredients.split('\n').filter(i => i.trim()).map(i => `<li>${i}</li>`).join('') : '<li>Đang cập nhật...</li>'}</ul>
                <div class="section-title">Cách thực hiện</div>
                <div class="recipe-steps">${post.recipe ? post.recipe.split('\n').filter(r => r.trim()).map((r, i) => `<div class="recipe-step"><div class="step-num">${i + 1}</div><p>${r}</p></div>`).join('') : '<p>Đang cập nhật...</p>'}</div>

                <!-- Star Rating Section -->
                <div class="rating-section" id="rating-section-${id}">
                    <div class="section-title">Đánh giá món ăn</div>
                    <div class="star-rating-wrapper">
                        <div class="star-rating" id="star-rating-${id}">
                            ${[1,2,3,4,5].map(n => `<span class="star" data-val="${n}" onclick="submitRating(${id}, ${n})">★</span>`).join('')}
                        </div>
                        <span class="rating-label" id="rating-label-${id}">Chọn số sao để đánh giá</span>
                    </div>
                </div>

                <!-- Comment Section -->
                <div class="comment-section" id="comments">
                    <div class="section-title">Bình luận</div>
                    <div class="comment-input-row">
                        <img src="https://ui-avatars.com/api/?name=Me&background=f7630c&color=fff" class="avatar-small">
                        <div class="comment-input-box">
                            <textarea id="comment-input-${id}" placeholder="Chia sẻ cảm nhận của bạn về món ăn này..." rows="2"></textarea>
                            <button class="btn-submit-comment" onclick="submitComment(${id})">
                                <i class="fas fa-paper-plane"></i> Gửi
                            </button>
                        </div>
                    </div>
                    <div id="comments-list-${id}" class="comments-list">
                        <div style="text-align:center; padding:20px; color:#aaa;"><i class="fas fa-spinner fa-spin"></i></div>
                    </div>
                </div>
            </div>`;

        // Load star rating + comments
        loadComments(id);
        loadUserRating(id);

    } catch (err) {
        container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Lỗi tải dữ liệu.</div>';
    }
}

async function loadUserRating(postId) {
    try {
        const ratings = await apiFetch(`/ratings/?post=${postId}`);
        const userData = JSON.parse(localStorage.getItem('user_data'));
        if (!ratings || !userData) return;
        const myRating = ratings.find(r => r.user === userData.id);
        if (myRating) highlightStars(postId, myRating.stars);
    } catch(e) {}
}

function highlightStars(postId, val) {
    document.querySelectorAll(`#star-rating-${postId} .star`).forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
    const label = document.getElementById(`rating-label-${postId}`);
    const labels = ['', 'Tệ', 'Không hay', 'Bình thường', 'Hay', 'Tuyệt vời!'];
    if (label) label.textContent = labels[val] || '';
}

async function submitRating(postId, stars) {
    const token = localStorage.getItem('access_token');
    if (!token) { alert('Vui lòng đăng nhập để đánh giá!'); return; }
    try {
        await apiFetch('/ratings/', {
            method: 'POST',
            body: JSON.stringify({ post: postId, stars })
        });
        highlightStars(postId, stars);
    } catch(e) {
        // If already rated, try PATCH
        try {
            const ratings = await apiFetch(`/ratings/`);
            const userData = JSON.parse(localStorage.getItem('user_data'));
            const myRating = ratings.find(r => r.post === postId && r.user === userData.id);
            if (myRating) {
                await apiFetch(`/ratings/${myRating.rating_id}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ stars })
                });
                highlightStars(postId, stars);
            }
        } catch(e2) {}
    }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;
    try {
        const comments = await apiFetch(`/comments/?post=${postId}`);
        if (!comments || comments.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#aaa; padding:20px;">Chưa có bình luận nào. Hãy là người đầu tiên!</p>';
            return;
        }

        const userDataStr = localStorage.getItem('user_data');
        const currentUser = userDataStr ? JSON.parse(userDataStr) : null;

        list.innerHTML = comments.map(c => {
            const isMe = currentUser && currentUser.id === c.user;
            
            // Safe escape content for onclick
            const safeContent = c.content.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            const deleteBtn = isMe ? `<span onclick="deleteComment(${c.comment_id}, ${postId})" style="float: right; color: #ff4d4f; cursor: pointer; padding-left: 15px;" title="Xóa bình luận"><i class="fas fa-trash"></i></span>` : '';
            const editBtn = isMe ? `<span onclick="editComment(${c.comment_id}, '${safeContent}', ${postId})" style="float: right; color: #1877f2; cursor: pointer; padding-left: 10px;" title="Sửa bình luận"><i class="fas fa-pen"></i></span>` : '';

            return `
            <div class="comment-item" id="comment-item-${c.comment_id}">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.user_name || 'U')}&background=random" class="avatar-small">
                <div class="comment-body" style="width: 100%;">
                    <div class="comment-author">${c.user_name || 'Người dùng'} ${deleteBtn} ${editBtn}</div>
                    <div class="comment-text" id="comment-text-${c.comment_id}">${c.content}</div>
                    <div class="comment-time">${new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                </div>
            </div>
            `;
        }).join('');
    } catch(e) {
        list.innerHTML = '<p style="color:red; padding:10px;">Lỗi tải bình luận.</p>';
    }
}

async function deleteComment(commentId, postId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
        await apiFetch(`/comments/${commentId}/`, { method: 'DELETE' });
        loadComments(postId);
    } catch (e) {
        alert('Không thể xóa bình luận. Vui lòng thử lại.');
    }
}

function editComment(commentId, oldContent, postId) {
    const textNode = document.getElementById(`comment-text-${commentId}`);
    if (!textNode) return;
    
    textNode.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:5px;">
            <textarea id="edit-input-${commentId}" rows="2" style="width:100%; border-radius:8px; padding:10px; border:1px solid #ddd; font-family:inherit; resize:vertical; outline:none;">${oldContent}</textarea>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button onclick="loadComments(${postId})" style="background:#e4e6eb; color:#050505; border:none; padding:6px 14px; border-radius:15px; cursor:pointer; font-size:13px; font-weight:600;">Hủy</button>
                <button onclick="saveEditComment(${commentId}, ${postId})" style="background:var(--primary-color); color:white; border:none; padding:6px 14px; border-radius:15px; cursor:pointer; font-size:13px; font-weight:600;">Lưu thay đổi</button>
            </div>
        </div>
    `;
}

async function saveEditComment(commentId, postId) {
    const input = document.getElementById(`edit-input-${commentId}`);
    if (!input) return;
    const newContent = input.value.trim();
    if (!newContent) {
        alert('Nội dung bình luận không được để trống.');
        return;
    }
    
    try {
        await apiFetch(`/comments/${commentId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ content: newContent })
        });
        loadComments(postId);
    } catch(e) {
        alert('Không thể cập nhật bình luận. Vui lòng thử lại!');
    }
}

async function submitComment(postId) {
    const token = localStorage.getItem('access_token');
    if (!token) { alert('Vui lòng đăng nhập để bình luận!'); return; }
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input?.value.trim();
    if (!content) return;
    try {
        await apiFetch('/comments/', {
            method: 'POST',
            body: JSON.stringify({ post: postId, content })
        });
        input.value = '';
        loadComments(postId);
    } catch(e) { alert('Không thể gửi bình luận.'); }
}

window.submitRating = submitRating;
window.submitComment = submitComment;
window.deleteComment = deleteComment;
window.editComment = editComment;
window.saveEditComment = saveEditComment;
window.toggleReaction = toggleReaction;

async function initCreatePostPage() {
    const form = document.getElementById('create-post-form');
    const regionSelect = document.getElementById('region');
    if (regionSelect) {
        const regions = await apiFetch('/regions/');
        if (regions) regions.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.region_id;
            opt.innerText = r.region_name;
            regionSelect.appendChild(opt);
        });
    }
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const postData = {
                title: form.querySelector('#title').value,
                content: form.querySelector('#content').value,
                ingredients: form.querySelector('#ingredients').value,
                recipe: form.querySelector('#recipe').value,
                thumbnail: form.querySelector('#thumbnail').value,
                region: form.querySelector('#region').value,
                status: 'Active' 
            };
            try {
                const result = await apiFetch('/posts/', { method: 'POST', body: JSON.stringify(postData) });
                if (result) { alert('Đăng bài thành công!'); window.location.href = 'index.html'; }
            } catch (err) { alert('Lỗi: ' + err.message); }
        });
    }
}

async function performSearch(query) {
    const list = document.getElementById('results-list');
    const countEl = document.getElementById('search-count');
    if (!list) return;
    try {
        const posts = await apiFetch('/posts/');
        const filtered = posts.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
        document.getElementById('loading-results')?.remove();
        if (filtered.length > 0) {
            countEl.innerText = `Tìm thấy ${filtered.length} kết quả`;
            filtered.forEach(p => list.appendChild(createPostCard(p)));
        } else { document.getElementById('no-results').style.display = 'block'; }
    } catch (e) {}
}

async function initAdminDashboard() {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    const contentArea = document.getElementById('admin-content-area');
    const viewTitle = document.getElementById('admin-view-title');
    const viewSubtitle = document.getElementById('admin-view-subtitle');

    if (!menuItems.length || !contentArea) return;

    // Load initial stats
    loadAdminOverview();

    menuItems.forEach(item => {
        item.addEventListener('click', async () => {
            // Update Active State
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const viewId = item.id;
            contentArea.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-3x" style="color:var(--primary-color);"></i><p style="margin-top:15px; color:var(--text-secondary);">Đang tải dữ liệu...</p></div>';

            switch (viewId) {
                case 'menu-overview':
                    viewTitle.innerText = "Chào ngày mới, Quản trị viên!";
                    viewSubtitle.innerText = "Hôm nay là một ngày tuyệt vời để khám phá ẩm thực.";
                    loadAdminOverview();
                    break;
                case 'menu-posts':
                    viewTitle.innerText = "Kiểm duyệt bài viết";
                    viewSubtitle.innerText = "Xét duyệt các bài đăng mới từ cộng đồng.";
                    loadAdminPosts();
                    break;
                case 'menu-users':
                    viewTitle.innerText = "Quản lý người dùng";
                    viewSubtitle.innerText = "Theo dõi và quản lý tài khoản thành viên.";
                    loadAdminUsers();
                    break;
                case 'menu-categories':
                    viewTitle.innerText = "Danh mục món ăn";
                    viewSubtitle.innerText = "Quản lý các vùng miền và danh mục ẩm thực.";
                    loadAdminCategories();
                    break;
                case 'menu-trending':
                    viewTitle.innerText = "Xu hướng ẩm thực";
                    viewSubtitle.innerText = "Khám phá các món ăn đang thịnh hành.";
                    loadAdminTrending();
                    break;
                case 'menu-settings':
                    viewTitle.innerText = "Cài đặt hệ thống";
                    viewSubtitle.innerText = "Cấu hình các tham số vận hành website.";
                    loadAdminSettings();
                    break;
            }
        });
    });
}

async function loadAdminOverview() {
    const contentArea = document.getElementById('admin-content-area');
    if (!contentArea) return;

    try {
        const stats = await apiFetch('/admin/stats/');
        contentArea.innerHTML = `
            <section class="stats-grid">
                <div class="stat-card blue">
                    <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <h3>Tổng người dùng</h3>
                        <div class="value">${stats.total_users.toLocaleString()}</div>
                    </div>
                </div>
                <div class="stat-card green">
                    <div class="stat-icon green"><i class="fas fa-edit"></i></div>
                    <div class="stat-info">
                        <h3>Tổng bài đăng</h3>
                        <div class="value">${stats.total_posts.toLocaleString()}</div>
                    </div>
                </div>
                <div class="stat-card red">
                    <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info">
                        <h3>Báo cáo chưa xử lý</h3>
                        <div class="value">${stats.total_reports.toLocaleString()}</div>
                    </div>
                </div>
            </section>
            <div class="dashboard-content-grid">
                <div class="chart-card">
                    <div class="card-header"><h3>Xu hướng bài đăng</h3></div>
                    <div class="chart-placeholder">
                        <div class="bar" style="height: 60%"></div>
                        <div class="bar alt" style="height: 80%"></div>
                        <div class="bar" style="height: 40%"></div>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        contentArea.innerHTML = '<p style="color:red; padding:20px;">Lỗi tải dữ liệu thống kê.</p>';
    }
}

async function loadAdminPosts() {
    const contentArea = document.getElementById('admin-content-area');
    try {
        const posts = await apiFetch('/posts/?status=Pending');
        
        contentArea.innerHTML = `
            <div class="admin-content-card">
                <div class="admin-section-header">
                    <h3><i class="fas fa-clipboard-check"></i> Kiểm duyệt bài viết</h3>
                    <div class="badge badge-pending">${posts.length} bài đang chờ</div>
                </div>
                
                ${posts.length === 0 ? `
                    <div style="text-align:center; padding:60px; color:#999;">
                        <i class="fas fa-check-circle fa-4x" style="color:#eee; margin-bottom:20px;"></i>
                        <p>Tuyệt vời! Không có bài viết nào cần duyệt lúc này.</p>
                    </div>
                ` : `
                    <div class="admin-table-container">
                        <table class="admin-table">
                            <thead>
                                <tr>
                                    <th>Ảnh</th>
                                    <th>Nội dung bài viết</th>
                                    <th>Thông tin tác giả</th>
                                    <th>Ngày gửi</th>
                                    <th>Thao tác nhanh</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${posts.map(post => `
                                    <tr>
                                        <td><img src="${post.thumbnail}" style="width:60px; height:60px; object-fit:cover; border-radius:10px; box-shadow:0 4px 8px rgba(0,0,0,0.05);"></td>
                                        <td>
                                            <div style="font-weight:700; margin-bottom:4px; color:var(--text-main);">${post.title}</div>
                                            <div style="font-size:12px; color:#888;"><i class="fas fa-map-marker-alt"></i> ${post.region_name}</div>
                                        </td>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:8px;">
                                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random" style="width:24px; height:24px; border-radius:50%;">
                                                <span style="font-weight:600;">${post.author_name}</span>
                                            </div>
                                        </td>
                                        <td style="color:#666;">${new Date(post.created_at).toLocaleDateString('vi-VN')}</td>
                                        <td class="admin-actions">
                                            <button class="btn-admin btn-approve" onclick="moderatePost(${post.post_id}, 'Active')">
                                                <i class="fas fa-check"></i> Duyệt
                                            </button>
                                            <button class="btn-admin btn-reject" onclick="moderatePost(${post.post_id}, 'Rejected')">
                                                <i class="fas fa-times"></i> Gỡ
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        `;
    } catch (e) {
        contentArea.innerHTML = '<p>Lỗi tải bài viết.</p>';
    }
}

async function moderatePost(id, status) {
    if (!confirm(`Bạn có chắc muốn ${status === 'Active' ? 'duyệt' : 'gỡ bỏ'} bài viết này?`)) return;
    try {
        await apiFetch(`/posts/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
        loadAdminPosts();
    } catch (e) { alert('Thao tác thất bại.'); }
}

async function loadAdminUsers() {
    const contentArea = document.getElementById('admin-content-area');
    try {
        const users = await apiFetch('/admin/users/');
        contentArea.innerHTML = `
            <div class="admin-content-card">
                <div class="admin-section-header">
                    <h3><i class="fas fa-users-cog"></i> Danh sách người dùng</h3>
                    <div class="badge badge-admin">${users.length} thành viên</div>
                </div>
                
                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Thành viên</th>
                                <th>Email liên hệ</th>
                                <th>Phân quyền</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>
                                        <div style="display:flex; align-items:center; gap:12px;">
                                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=f0f0f0" style="width:36px; height:36px; border-radius:10px;">
                                            <div>
                                                <div style="font-weight:700;">${user.full_name || user.username}</div>
                                                <div style="font-size:12px; color:#999;">@${user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${user.email}</td>
                                    <td><span class="badge ${user.role_name === 'Admin' ? 'badge-admin' : 'badge-inactive'}">${user.role_name}</span></td>
                                    <td><span class="badge ${user.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${user.status === 'Active' ? 'Hoạt động' : 'Đã khóa'}</span></td>
                                    <td class="admin-actions">
                                        <button class="btn-admin btn-edit" title="${user.status === 'Active' ? 'Khóa tài khoản' : 'Mở khóa'}" onclick="toggleUserStatus(${user.id}, '${user.status}')">
                                            <i class="fas ${user.status === 'Active' ? 'fa-lock' : 'fa-unlock-alt'}"></i>
                                            ${user.status === 'Active' ? 'Khóa' : 'Mở'}
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        contentArea.innerHTML = '<p>Lỗi tải người dùng.</p>';
    }
}

async function toggleUserStatus(id, currentStatus) {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
        await apiFetch(`/admin/users/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        loadAdminUsers();
    } catch (e) { alert('Thao tác thất bại.'); }
}

async function loadAdminCategories() {
    const contentArea = document.getElementById('admin-content-area');
    try {
        const regions = await apiFetch('/regions/');
        contentArea.innerHTML = `
            <div class="admin-content-card">
                <div class="admin-section-header">
                    <h3><i class="fas fa-tags"></i> Danh mục vùng miền</h3>
                    <button class="btn-add" onclick="addNewRegion()"><i class="fas fa-plus"></i></button>
                </div>

                <div class="quick-add-container">
                    <input type="text" id="new-region-name" class="quick-add-input" placeholder="Nhập tên danh mục/vùng miền mới (vd: Miền Tây)...">
                    <button class="btn-add" style="padding: 10px 20px;" onclick="quickAddRegion()"><i class="fas fa-save"></i> Thêm</button>
                </div>

                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Mã vùng</th>
                                <th>Tên vùng miền</th>
                                <th style="text-align:right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${regions.map(r => `
                                <tr>
                                    <td style="color:#999; font-family:monospace;">#${r.region_id.toString().padStart(3, '0')}</td>
                                    <td style="font-weight:700; color:var(--primary-color); cursor:pointer; text-decoration:underline;" onclick="loadAdminRegionDishes(${r.region_id}, '${r.region_name}')">
                                        <i class="fas fa-folder-open" style="margin-right:8px; opacity:0.5;"></i>
                                        ${r.region_name}
                                    </td>
                                    <td class="admin-actions" style="justify-content:flex-end;">
                                        <button class="btn-admin btn-edit" onclick="editRegion(${r.region_id}, '${r.region_name}')"><i class="fas fa-pen"></i></button>
                                        <button class="btn-admin btn-delete" onclick="deleteRegion(${r.region_id})"><i class="fas fa-trash-alt"></i></button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {}
}

async function quickAddRegion() {
    const input = document.getElementById('new-region-name');
    const name = input.value?.trim();
    if (!name) return;
    try {
        await apiFetch('/regions/', { method: 'POST', body: JSON.stringify({ region_name: name }) });
        input.value = '';
        loadAdminCategories();
    } catch (e) { alert('Lỗi: ' + e.message); }
}

async function addNewRegion() {
    const name = prompt('Nhập tên vùng miền mới:');
    if (!name) return;
    try {
        await apiFetch('/regions/', { method: 'POST', body: JSON.stringify({ region_name: name }) });
        loadAdminCategories();
    } catch (e) { alert('Lỗi: ' + e.message); }
}

async function editRegion(id, oldName) {
    const name = prompt('Sửa tên vùng miền:', oldName);
    if (!name || name === oldName) return;
    try {
        await apiFetch(`/regions/${id}/`, { 
            method: 'PATCH', 
            body: JSON.stringify({ region_name: name }) 
        });
        loadAdminCategories();
    } catch (e) { alert('Lỗi: ' + e.message); }
}

async function deleteRegion(id) {
    if (!confirm('Hành động này sẽ xóa vĩnh viễn vùng miền. Tiếp tục?')) return;
    try {
        await apiFetch(`/regions/${id}/`, { method: 'DELETE' });
        loadAdminCategories();
    } catch (e) { alert('Thao tác thất bại.'); }
}

async function loadAdminSettings() {
    const contentArea = document.getElementById('admin-content-area');
    contentArea.innerHTML = `
        <div class="admin-content-card">
            <div class="admin-section-header">
                <h3><i class="fas fa-universal-access"></i> Cấu hình hệ thống</h3>
            </div>
            
            <div class="settings-grid">
                <div class="settings-card">
                    <div class="settings-card-header">
                        <i class="fas fa-info-circle"></i>
                        <strong>Thông tin chung</strong>
                    </div>
                    <div class="settings-group">
                        <label>Tên ứng dụng</label>
                        <input type="text" class="settings-input" value="Ẩm Thực 3 Miền">
                    </div>
                    <div class="settings-group">
                        <label>Khẩu hiệu (Slogan)</label>
                        <input type="text" class="settings-input" value="Nâng tầm văn hóa ẩm thực Việt">
                    </div>
                </div>

                <div class="settings-card">
                    <div class="settings-card-header">
                        <i class="fas fa-share-alt"></i>
                        <strong>Mạng xã hội</strong>
                    </div>
                    <div class="settings-group">
                        <label>Facebook Page</label>
                        <input type="text" class="settings-input" placeholder="https://facebook.com/cuisine3mien">
                    </div>
                    <div class="settings-group">
                        <label>Hotline hỗ trợ</label>
                        <input type="text" class="settings-input" value="1900 1234">
                    </div>
                </div>
                
                <div class="settings-card">
                    <div class="settings-card-header">
                        <i class="fas fa-shield-alt"></i>
                        <strong>Bảo mật & Vận hành</strong>
                    </div>
                    <div class="settings-group">
                        <label>Chế độ bảo trì</label>
                        <select class="settings-input">
                            <option>Tắt</option>
                            <option>Bật</option>
                        </select>
                    </div>
                    <div class="settings-group">
                        <label>Email admin</label>
                        <input type="text" class="settings-input" value="admin@cuisine.vn">
                    </div>
                </div>
            </div>

            <div class="save-settings-bar">
                <button class="btn-add" id="btn-save-settings" onclick="saveAdminSettings()">
                    <i class="fas fa-save"></i> 
                    <span id="save-text">Lưu tất cả thay đổi</span>
                </button>
            </div>
        </div>
    `;
}

async function loadAdminRegionDishes(regionId, regionName) {
    const contentArea = document.getElementById('admin-content-area');
    try {
        const posts = await apiFetch(`/posts/?region=${regionId}`);
        contentArea.innerHTML = `
            <div class="admin-content-card">
                <div class="admin-section-header">
                    <div style="display:flex; align-items:center; gap:20px;">
                        <button class="btn-admin btn-edit" onclick="loadAdminCategories()" title="Quay lại"><i class="fas fa-arrow-left"></i></button>
                        <div>
                            <h3 style="margin:0;">Vùng miền: ${regionName}</h3>
                            <div style="font-size:12px; color:#888; margin-top:4px;">Quản lý nội dung và thực đơn khu vực</div>
                        </div>
                    </div>
                    <button class="btn-add" onclick="showPostModal(null, ${regionId}, '${regionName}')">
                        <i class="fas fa-plus"></i> Thêm món ăn mới
                    </button>
                </div>

                ${posts.length === 0 ? `
                    <div style="text-align:center; padding:80px; color:#999;">
                        <i class="fas fa-layer-group fa-4x" style="opacity:0.2; margin-bottom:20px;"></i>
                        <p>Danh mục này hiện chưa có món ăn nào.</p>
                    </div>
                ` : `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 25px;">
                        ${posts.map(p => `
                            <div class="dish-card-admin">
                                <img src="${p.thumbnail || 'https://picsum.photos/seed/food/300/200'}" style="width:100%; height:150px; object-fit:cover; border-radius:12px; margin-bottom:15px;">
                                <div style="font-weight:700; font-size:15px; color:var(--text-main); margin-bottom:8px; display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:42px;">${p.title}</div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                    <span class="badge ${p.status === 'Active' ? 'badge-active' : 'badge-pending'}">${p.status}</span>
                                    <span style="font-size:11px; color:#999;">#${p.post_id}</span>
                                </div>
                                <div class="dish-actions-overlay">
                                    <button class="btn-admin btn-edit" style="flex:1;" onclick="showPostModal(${p.post_id}, ${regionId}, '${regionName}')">
                                        <i class="fas fa-pen-nib"></i> Sửa
                                    </button>
                                    <button class="btn-admin btn-reject" style="width:40px; justify-content:center;" onclick="deleteAdminPost(${p.post_id}, ${regionId}, '${regionName}')" title="Xóa món ăn">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                    <a href="chitiet.html?id=${p.post_id}" class="btn-admin btn-edit" style="width:40px; justify-content:center;" title="Xem thực tế"><i class="fas fa-external-link-alt"></i></a>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
    } catch (e) { alert('Lỗi tải danh sách món ăn.'); }
}

async function showPostModal(postId = null, regionId, regionName) {
    let post = { title: '', content: '', thumbnail: '' };
    if (postId) {
        try {
            const posts = await apiFetch('/posts/');
            post = posts.find(p => p.post_id === postId) || post;
        } catch (e) { console.error('Lỗi tải chi tiết món ăn'); }
    }

    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';
    modal.id = 'post-modal';
    modal.innerHTML = `
        <div class="admin-modal-content">
            <div class="modal-header">
                <h3>${postId ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}</h3>
                <i class="fas fa-times modal-close" onclick="closeAdminModal()"></i>
            </div>
            <form id="post-admin-form" onsubmit="saveAdminPost(event, ${regionId}, ${postId})">
                <div class="settings-group">
                    <label>Tên món ăn</label>
                    <input type="text" id="m-title" class="settings-input" required value="${post.title}" placeholder="Nhập tên món ăn đặc sắc...">
                </div>
                <div class="settings-group">
                    <label>Hình ảnh (URL)</label>
                    <input type="text" id="m-thumbnail" class="settings-input" required value="${post.thumbnail}" placeholder="https://example.com/image.jpg">
                </div>
                <div class="settings-group">
                    <label>Mô tả / Công thức nấu ăn</label>
                    <textarea id="m-content" class="settings-input" required style="height:150px; resize:vertical; line-height:1.6;" placeholder="Chia sẻ bí quyết nấu món ăn này...">${post.content}</textarea>
                </div>
                <div class="settings-group">
                    <label>Vùng miền</label>
                    <input type="text" class="settings-input" disabled value="${regionName}">
                </div>
                <div class="save-settings-bar" style="margin-top:20px; border:none; padding:0;">
                    <button type="button" class="btn-admin btn-edit" style="margin-right:10px;" onclick="closeAdminModal()">Hủy</button>
                    <button type="submit" class="btn-add">${postId ? 'Cập nhật món ăn' : 'Đăng món ăn'}</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function saveAdminPost(e, regionId, postId) {
    e.preventDefault();
    const title = document.getElementById('m-title').value;
    const thumbnail = document.getElementById('m-thumbnail').value;
    const content = document.getElementById('m-content').value;

    // 'region' is the ForeignKey field name in Django model (not region_id)
    // 'contributor' is set automatically by perform_create via request.user
    const payload = { 
        title, 
        thumbnail, 
        content, 
        region: regionId,
        status: 'Active'
    };

    try {
        const url = postId ? `/posts/${postId}/` : '/posts/';
        await apiFetch(url, {
            method: postId ? 'PATCH' : 'POST',
            body: JSON.stringify(payload)
        });
        closeAdminModal();
        const header = document.querySelector('.admin-section-header h3');
        const regionName = header ? header.innerText.split(': ')[1] : '';
        loadAdminRegionDishes(regionId, regionName);
    } catch (e) { alert('Không thể lưu món ăn: ' + e.message); }
}

async function deleteAdminPost(postId, regionId, regionName) {
    if (!confirm('Bạn có chắc chắn muốn xóa món ăn này vĩnh viễn?')) return;
    try {
        await apiFetch(`/posts/${postId}/`, { method: 'DELETE' });
        loadAdminRegionDishes(regionId, regionName);
    } catch (e) { alert('Thao tác xóa thất bại.'); }
}

function closeAdminModal() {
    const modal = document.getElementById('post-modal');
    if (modal) modal.remove();
}

async function saveAdminSettings() {
    const btn = document.getElementById('btn-save-settings');
    const text = document.getElementById('save-text');
    if (!btn) return;

    btn.disabled = true;
    btn.style.opacity = '0.7';
    text.innerText = 'Đang lưu...';

    // Simulate API call
    setTimeout(() => {
        btn.disabled = false;
        btn.style.opacity = '1';
        text.innerText = 'Lưu thành công!';
        btn.style.background = '#1db954';
        
        setTimeout(() => {
            text.innerText = 'Lưu tất cả thay đổi';
            btn.style.background = '';
        }, 2000);
    }, 800);
}

async function loadAdminTrending() {
    const contentArea = document.getElementById('admin-content-area');
    try {
        const posts = await apiFetch('/posts/?status=Active');
        contentArea.innerHTML = `
            <div class="admin-content-card">
                <div class="admin-section-header">
                    <h3><i class="fas fa-fire"></i> Thống kê xu hướng</h3>
                </div>
                <div class="dashboard-content-grid" style="grid-template-columns: 1fr;">
                    <div class="top-dishes-card">
                        <ul class="dish-list" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                            ${posts.slice(0, 10).map((p, i) => `
                                <li class="dish-item" style="border: 1px solid #f0f0f0; padding: 20px; border-radius: 16px; cursor: pointer; transition:0.3s;" onmouseover="this.style.borderColor='var(--primary-color)'" onmouseout="this.style.borderColor='#f0f0f0'" onclick="window.location.href='chitiet.html?id=${p.post_id}'">
                                    <div style="font-size: 28px; font-weight: 800; color: #eee; margin-bottom: 10px;">0${i + 1}</div>
                                    <div style="display:flex; align-items:center; gap:15px;">
                                        <img src="${p.thumbnail || 'https://picsum.photos/seed/food/100/100'}" alt="${p.title}" style="width:70px; height:70px; border-radius:12px; object-fit:cover;">
                                        <div class="dish-meta">
                                            <h4 style="margin:0 0 5px 0;">${p.title}</h4>
                                            <p style="margin:0; font-size:12px; color:#888;">${p.region_name}</p>
                                        </div>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        contentArea.innerHTML = '<p>Lỗi tải xu hướng.</p>';
    }
}

// Global exposure
window.moderatePost = moderatePost;
window.toggleUserStatus = toggleUserStatus;
window.addNewRegion = addNewRegion;
window.editRegion = editRegion;
window.quickAddRegion = quickAddRegion;
window.loadAdminRegionDishes = loadAdminRegionDishes;
window.showPostModal = showPostModal;
window.saveAdminPost = saveAdminPost;
window.deleteAdminPost = deleteAdminPost;
window.closeAdminModal = closeAdminModal;
window.deleteRegion = deleteRegion;
window.saveAdminSettings = saveAdminSettings;
window.loadAdminTrending = loadAdminTrending;

async function initRegionPage() {
    const list = document.getElementById('post-list');
    const regionItems = document.querySelectorAll('.sidebar-left .menu-item');
    loadFeed();
    regionItems.forEach(item => {
        item.addEventListener('click', async () => {
            regionItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const name = item.querySelector('span')?.innerText;
            const regions = await apiFetch('/regions/');
            const region = regions.find(r => r.region_name.includes(name));
            if (region) {
                list.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
                const posts = await apiFetch(`/posts/?region=${region.region_id}`);
                list.innerHTML = '';
                posts.forEach(p => list.appendChild(createPostCard(p)));
            } else loadFeed();
        });
    });
}

async function initProfilePage() {
    try {
        const user = await apiFetch('/auth/me/');
        if (user) {
            document.getElementById('profile-name').innerText = user.full_name || user.username;
            document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=f7630c&color=fff&size=200`;
            document.getElementById('profile-join-date').innerText = `Tham gia từ ${new Date(user.date_joined || Date.now()).toLocaleDateString('vi-VN')}`;
            const postsContainer = document.getElementById('profile-posts');
            const posts = await apiFetch('/posts/');
            const myPosts = posts.filter(p => p.author_username === user.username);
            if (postsContainer) {
                postsContainer.innerHTML = '';
                document.getElementById('profile-post-count').innerText = myPosts.length;
                if (myPosts.length > 0) myPosts.forEach(p => postsContainer.appendChild(createPostCard(p)));
                else postsContainer.innerHTML = '<div class="card" style="padding:40px; text-align:center;">Chưa có bài viết.</div>';
            }
        }
    } catch (e) {}
}

async function initSavedPage() {
    const container = document.getElementById('saved-posts-container');
    if (!container) return;
    try {
        const favorites = await apiFetch('/favorites/');
        container.innerHTML = '';
        if (favorites && favorites.length > 0) favorites.forEach(f => container.appendChild(createPostCard(f.post_details || f)));
        else container.innerHTML = '<div style="grid-column: span 2; padding: 60px; text-align: center;"><h3>Trống</h3></div>';
    } catch (e) {}
}

async function initTrendingPage() {
    const container = document.getElementById('trending-posts-container');
    if (!container) return;
    try {
        const posts = await apiFetch('/posts/?status=Active');
        if (posts) {
            container.innerHTML = '';
            posts.slice(0, 5).forEach((p, i) => {
                const card = createPostCard(p);
                const badge = document.createElement('div');
                badge.style = "padding:10px; color:var(--primary-color); font-weight:bold;";
                badge.innerHTML = `#${i + 1} THỊNH HÀNH`;
                card.prepend(badge);
                container.appendChild(card);
            });
        }
    } catch (e) {}
}

async function toggleFavorite(postId) {
    try {
        await apiFetch('/favorites/', { method: 'POST', body: JSON.stringify({ post: postId }) });
        alert('Đã cập nhật danh sách yêu thích!');
    } catch (e) { alert('Vui lòng đăng nhập!'); }
}

async function reportPost(postId) {
    const reason = prompt('Lý do báo cáo:');
    if (!reason) return;
    try {
        await apiFetch('/reports/', { method: 'POST', body: JSON.stringify({ post: postId, reason }) });
        alert('Cảm ơn bạn đã báo cáo!');
    } catch (e) { alert('Thất bại.'); }
}

window.toggleFavorite = toggleFavorite;
window.reportPost = reportPost;
