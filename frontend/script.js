console.log('--- SOCIAL APP LOADED V5.0 ---');
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
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { detail: response.statusText };
            }
            throw new Error(errorData.detail || errorData.message || JSON.stringify(errorData) || 'API Request Failed');
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    checkAuth();
    updateUserUI();
    initPage();
    setupSharedEvents();
});

function applyTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.classList.remove('dark-theme', 'pink-theme');
    if (theme !== 'light') {
        document.body.classList.add(`${theme}-theme`);
    }
}

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
    console.log('Current path:', path);

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
    } else if (path.includes('settings.html')) {
        initSettingsPage();
    } else if (path.includes('thongbao.html')) {
        initNotificationsPage();
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

    const suggestContainer = document.getElementById('suggested-posts-list');
    if (suggestContainer) {
        try {
            const publicData = await apiFetch('/public/cuisine-data/');
            if (publicData && publicData.length > 0) {
                const topRated = publicData.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 3);
                suggestContainer.innerHTML = topRated.map(p => `
                    <li class="suggestion-item">
                        <img src="${p.thumbnail || 'https://picsum.photos/100'}" alt="Dish" style="object-fit: cover; width: 50px; height: 50px; border-radius: 8px;">
                        <div class="suggest-info">
                            <p class="dish-name" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${p.title}</p>
                            <button class="btn-view-recipe" onclick="window.location.href='chitiet.html?id=${p.post_id}'" style="font-size: 12px; padding: 4px 10px;">Xem công thức</button>
                        </div>
                    </li>
                `).join('');
            } else {
                suggestContainer.innerHTML = '<div style="padding: 10px; color: grey; font-style: italic; font-size: 13px; text-align: center;">Chưa có gợi ý nào.</div>';
            }
        } catch (err) {
            console.error("Failed to load suggestions", err);
        }
    }

    document.querySelector('.mock-input')?.addEventListener('click', () => {
        if (!localStorage.getItem('access_token')) {
            window.location.href = 'login.html';
        } else {
            window.location.href = 'dangbai.html';
        }
    });
}

function timeAgo(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Vừa xong';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;
    
    const months = ['thg 1', 'thg 2', 'thg 3', 'thg 4', 'thg 5', 'thg 6', 'thg 7', 'thg 8', 'thg 9', 'thg 10', 'thg 11', 'thg 12'];
    const currentYear = now.getFullYear();
    const dateYear = date.getFullYear();
    
    if (currentYear === dateYear) {
        return `${date.getDate()} ${months[date.getMonth()]}`;
    } else {
        return `${date.getDate()} ${months[date.getMonth()]} ${dateYear}`;
    }
}

function formatPostTime(createdAt, updatedAt) {
    const cDate = new Date(createdAt);
    let timeStr = timeAgo(cDate);
    
    if (updatedAt) {
        const uDate = new Date(updatedAt);
        if (uDate.getTime() - cDate.getTime() > 60000) { // More than 1 minute diff
            return `${timeStr} <span style="font-size: 0.9em; color: #888;">(đã chỉnh sửa)</span>`;
        }
    }
    return timeStr;
}

function createPostCard(post) {
    const userData = JSON.parse(localStorage.getItem('user_data')) || {};
    const isOwnerOrAdmin = post.contributor === userData.id || userData.role_name === 'Admin';
    
    const div = document.createElement('div');
    div.className = 'card post';
    div.id = `post-card-${post.post_id}`; // Unique ID for card
    div.innerHTML = `
        <div class="post-header">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random" alt="Author" class="avatar-medium" style="cursor:pointer;" onclick="window.location.href='profile.html?id=${post.contributor}'">
            <div class="post-meta">
                <h4 class="author-name" style="cursor:pointer;" onclick="window.location.href='profile.html?id=${post.contributor}'">${post.author_name} <span style="font-weight: 400; color: var(--text-secondary); font-size: 14px;">tại <strong style="color: var(--text-main);">${post.region_name}${post.province ? ', ' + post.province : ''}</strong></span></h4>
                <span class="post-time">${formatPostTime(post.created_at, post.updated_at)}</span>
            </div>
            <div class="post-options-container">
                <div class="post-options" onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('show')">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                <div class="options-dropdown">
                    <a href="#" onclick="toggleFavorite(${post.post_id})"><i class="fas fa-bookmark"></i> Lưu bài viết</a>
                    <a href="#" onclick="reportPost(${post.post_id})"><i class="fas fa-flag"></i> Báo cáo bài viết</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="hidePost(${post.post_id})" style="color: #e53e3e;"><i class="fas fa-eye-slash"></i> Ẩn bài viết</a>
                    ${isOwnerOrAdmin ? `
                        <div class="dropdown-divider"></div>
                        <a href="#" onclick="editPost(${post.post_id})" style="color: #007bff; font-weight: 600;"><i class="fas fa-edit"></i> Chỉnh sửa bài viết</a>
                        <a href="#" onclick="deletePost(${post.post_id})" style="color: #e53e3e; font-weight: 600;"><i class="fas fa-trash-alt"></i> Xóa bài viết</a>
                    ` : ''}
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
                    <button class="reaction-trigger" id="react-btn-${post.post_id}" onclick="toggleReaction(${post.post_id}, 'like')" data-reacted="${post.user_reaction || ''}" style="color: ${post.user_reaction ? (post.user_reaction === 'like' ? 'var(--primary-color)' : {love:'#e41e3f', yummy:'#f5a623', wow:'#f5a623', clap:'#f5a623', hot:'#ff6b00'}[post.user_reaction]) : '#65676B'}">
                        <span class="react-emoji">${post.user_reaction ? (post.user_reaction === 'like' ? '<i class="fas fa-thumbs-up"></i>' : {love:'❤️', yummy:'😋', wow:'😮', clap:'👏', hot:'🔥'}[post.user_reaction]) : '<i class="far fa-thumbs-up"></i>'}</span> <span class="react-label" id="react-label-${post.post_id}">${post.user_reaction ? {like:'Thích', love:'Yêu thích', yummy:'Ngon lắm', wow:'Ấn tượng', clap:'Hay quá', hot:'Hot'}[post.user_reaction] : 'Thích'}</span>
                    </button>
                    <div class="reaction-popup" id="popup-${post.post_id}">
                        <span class="reaction-emoji" title="Yêu thích" onclick="toggleReaction(${post.post_id}, 'love')">❤️</span>
                        <span class="reaction-emoji" title="Ngon lắm" onclick="toggleReaction(${post.post_id}, 'yummy')">😋</span>
                        <span class="reaction-emoji" title="Ấn tượng" onclick="toggleReaction(${post.post_id}, 'wow')">😮</span>
                        <span class="reaction-emoji" title="Hay quá" onclick="toggleReaction(${post.post_id}, 'clap')">👏</span>
                        <span class="reaction-emoji" title="Hot" onclick="toggleReaction(${post.post_id}, 'hot')">🔥</span>
                    </div>
                </div>
                <div style="font-size: 14px; color: var(--primary-color); font-weight: 500; display: flex; align-items: center;" id="likes-count-container-${post.post_id}">
                    ${post.likes_count > 0 ? `<span id="likes-count-${post.post_id}">${post.likes_count}</span>` : '<span id="likes-count-' + post.post_id + '"></span>'}
                </div>
                <!-- NEW RATING BUTTON -->
                <button class="reaction-trigger" onclick="togglePostSection(${post.post_id}, 'rating')">
                    <span class="react-emoji"><i class="far fa-star"></i></span> Đánh giá
                </button>

                <!-- UPDATED COMMENT BUTTON -->
                <button class="reaction-trigger" onclick="togglePostSection(${post.post_id}, 'comments')">
                    <span class="react-emoji"><i class="far fa-comment"></i></span> Bình luận
                </button>

                <!-- UPDATED VIEW DETAILS BUTTON -->
                <button class="btn-view-recipe" onclick="togglePostSection(${post.post_id}, 'info')">
                    <span class="react-emoji"><i class="fas fa-info-circle"></i></span> Xem chi tiết
                </button>
            </div>
        </div>
        
        <!-- EXPANSION CONTAINER -->
        <div id="expansion-${post.post_id}" class="post-expansion"></div>
    `;
    return div;
}

async function toggleReaction(postId, type) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để thả cảm xúc!');
        window.location.href = 'login.html';
        return;
    }

    const emojis = { like: '👍', love: '❤️', yummy: '😋', wow: '😮', clap: '👏', hot: '🔥' };
    const texts = { like: 'Thích', love: 'Yêu thích', yummy: 'Ngon lắm', wow: 'Ấn tượng', clap: 'Hay quá', hot: 'Hot' };
    
    const btn = document.getElementById(`react-btn-${postId}`);
    const likesCountContainer = document.getElementById(`likes-count-container-${postId}`);

    if (btn) {
        const emojiSpan = btn.querySelector('.react-emoji');
        const labelSpan = btn.querySelector('.react-label');
        
        let isRemoving = false;
        if (type === 'like' && btn.dataset.reacted === 'like') {
            isRemoving = true;
        }

        try {
            if (isRemoving) {
                const allReactions = await apiFetch(`/reactions/?post=${postId}`);
                const userData = JSON.parse(localStorage.getItem('user_data'));
                const myReaction = allReactions.find(r => r.user === userData.id);
                if (myReaction) {
                    await apiFetch(`/reactions/${myReaction.reaction_id}/`, { method: 'DELETE' });
                }
                
                if (emojiSpan) emojiSpan.innerHTML = '<i class="far fa-thumbs-up"></i>';
                if (labelSpan) labelSpan.textContent = 'Thích';
                btn.style.color = '#65676B';
                delete btn.dataset.reacted;
            } else {
                await apiFetch('/reactions/', {
                    method: 'POST',
                    body: JSON.stringify({ post: postId, reaction_type: type })
                });

                if (type === 'like') {
                    if (emojiSpan) emojiSpan.innerHTML = '<i class="fas fa-thumbs-up"></i>';
                } else {
                    if (emojiSpan) emojiSpan.textContent = emojis[type] || '👍';
                }
                if (labelSpan) labelSpan.textContent = texts[type] || 'Thích';
                
                const colorMap = { like: 'var(--primary-color)', love: '#e41e3f', yummy: '#f5a623', wow: '#f5a623', clap: '#f5a623', hot: '#ff6b00' };
                btn.style.color = colorMap[type] || 'var(--primary-color)';
                btn.dataset.reacted = type;
            }

            const updatedPost = await apiFetch(`/posts/${postId}/`);
            if (likesCountContainer) {
                if (updatedPost.likes_count > 0) {
                    likesCountContainer.innerHTML = `<span id="likes-count-${postId}">${updatedPost.likes_count}</span>`;
                } else {
                    likesCountContainer.innerHTML = `<span id="likes-count-${postId}"></span>`;
                }
            }
        } catch (e) { console.error('Reaction Error:', e); }
    }

    const popup = document.getElementById(`popup-${postId}`);
    if (popup) {
        popup.style.display = 'none';
        setTimeout(() => { popup.style.display = ''; }, 200);
    }
}

/**
 * Handles toggling sections (Info, Rating, Comments) within a post card on the feed.
 */
async function togglePostSection(postId, type) {
    const expansion = document.getElementById(`expansion-${postId}`);
    if (!expansion) return;

    if (expansion.classList.contains('show') && expansion.dataset.activeTab === type) {
        expansion.classList.remove('show');
        setTimeout(() => { if(!expansion.classList.contains('show')) expansion.innerHTML = ''; }, 400);
        return;
    }

    expansion.innerHTML = '<div style="text-align:center; padding:30px; color:var(--primary-color);"><i class="fas fa-circle-notch fa-spin fa-2x"></i></div>';
    expansion.classList.add('show');
    expansion.dataset.activeTab = type;

    if (type === 'info') {
        const post = await apiFetch(`/posts/${postId}/`);
        expansion.innerHTML = `
            <div class="mini-info-section">
                <div class="expansion-title"><i class="fas fa-utensils"></i> Thông tin & Chế biến</div>
                <p style="margin-bottom:18px; line-height:1.6;">${post.content || 'Đang cập nhật giới thiệu...'}</p>
                
                <div style="font-weight:700; font-size:14px; margin-bottom:10px; color:var(--text-main);">Thành phần nguyên liệu:</div>
                <div class="ingredients-grid">
                    ${post.ingredients ? post.ingredients.split('\n').filter(i => i.trim()).map(i => `<div class="ingredient-chip">${i}</div>`).join('') : '<div class="ingredient-chip">Đang cập nhật...</div>'}
                </div>
                
                <div style="font-weight:700; font-size:14px; margin-bottom:10px; color:var(--text-main);">Các bước thực hiện:</div>
                <div class="recipe-steps-list">
                    ${post.recipe ? post.recipe.split('\n').filter(r => r.trim()).map((r, i) => `
                        <div class="recipe-card-step">
                            <span class="step-index">${(i+1).toString().padStart(2, '0')}</span>
                            <p style="font-size:14px; margin:0;">${r}</p>
                        </div>
                    `).join('') : '<p>Đang cập nhật công thức...</p>'}
                </div>
            </div>
        `;
    } else if (type === 'rating') {
        expansion.innerHTML = `
            <div class="expansion-title"><i class="fas fa-star-half-alt"></i> Đánh giá từ cộng đồng</div>
            <div class="mini-rating-form">
                <div style="font-weight:600; font-size:14px; margin-bottom:12px; color:var(--text-main);">Chia sẻ cảm nhận của bạn:</div>
                <div class="star-rating" id="star-rating-${postId}" onmouseout="resetStars(${postId})">
                    ${[1,2,3,4,5].map(n => `<i class="far fa-star star" data-val="${n}" onclick="setRating(${postId}, ${n})" onmouseover="highlightStars(${postId}, ${n})"></i>`).join('')}
                </div>
                <textarea id="rating-comment-${postId}" placeholder="Hương vị thế nào? Bạn có lời khuyên gì không..."></textarea>
                <div style="display:flex; justify-content:flex-end;">
                    <button class="btn-submit-rating" onclick="submitRating(${postId})">
                        <i class="fas fa-paper-plane"></i> Gửi đánh giá
                    </button>
                </div>
            </div>
            <div id="ratings-list-${postId}"></div>
        `;
        loadRatingsList(postId);
        loadUserRating(postId);
    } else if (type === 'comments') {
        const userData = JSON.parse(localStorage.getItem('user_data')) || { full_name: 'Me', username: 'me' };
        expansion.innerHTML = `
            <div class="expansion-title"><i class="fas fa-comment-alt"></i> Thảo luận món ăn</div>
            <div class="comment-input-row" style="display:flex; gap:12px; margin-bottom:25px;">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || userData.username)}&background=f7630c&color=fff" style="width:36px; height:36px; border-radius:50%;">
                <div style="flex:1;">
                    <textarea id="comment-input-${postId}" class="modern-comment-input" placeholder="Viết phản hồi của bạn..."></textarea>
                    <div style="display:flex; justify-content:flex-end; margin-top:10px;">
                        <button class="btn-submit-comment" onclick="submitComment(${postId})">
                            <i class="fas fa-comment-dots"></i> Bình luận
                        </button>
                    </div>
                </div>
            </div>
            <div id="comments-list-${postId}"></div>
        `;
        loadComments(postId);
    }
}

async function loadRatingsList(postId) {
    const list = document.getElementById(`ratings-list-${postId}`);
    if (!list) return;
    try {
        const ratings = await apiFetch(`/ratings/?post=${postId}`);
        if (!ratings || ratings.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#adb5bd; font-size:13px; padding:20px; border: 1px dashed #e2e8f0; border-radius:10px;">Chưa có đánh giá nào cho món này.</p>';
            return;
        }

        const userData = JSON.parse(localStorage.getItem('user_data'));

        list.innerHTML = ratings.map(r => {
            const isMe = userData && userData.id === r.user;
            const deleteBtn = isMe ? `<span onclick="deleteRating(${r.rating_id}, ${postId})" style="color: #e53e3e; cursor: pointer; font-size:11px; font-weight:600; margin-top:4px; display:inline-block; margin-left: 10px;">Xóa đánh giá</span>` : '';
            
            return `
            <div class="mini-review-item">
                <div class="mini-review-meta">
                    <strong>${r.user_name || 'Người dùng'}</strong>
                    <div style="display: flex; align-items: center;">
                        <div class="star-display">${'★'.repeat(r.stars)}</div>
                        ${deleteBtn}
                    </div>
                </div>
                <div style="font-size:13px; color:var(--text-secondary); line-height:1.5;">${r.comment || '<i>Chỉ đánh giá sao</i>'}</div>
            </div>
            `;
        }).join('');
    } catch(e) {}
}

async function deleteRating(ratingId, postId) {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
        await apiFetch(`/ratings/${ratingId}/`, { method: 'DELETE' });
        loadRatingsList(postId);
        // Reset the form
        setRating(postId, 0);
        const box = document.getElementById(`rating-comment-${postId}`);
        if (box) box.value = '';
        const btn = document.querySelector(`#expansion-${postId} .btn-submit-rating`);
        if (btn) btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi đánh giá';
    } catch (e) { alert('Lỗi xóa đánh giá.'); }
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    if (!list) return;
    try {
        const comments = await apiFetch(`/comments/?post=${postId}`);
        if (!comments || comments.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#adb5bd; font-size:13px; padding:20px; border: 1px dashed #e2e8f0; border-radius:10px;">Hãy là người đầu tiên bình luận!</p>';
            return;
        }

        const userDataStr = localStorage.getItem('user_data');
        const currentUser = userDataStr ? JSON.parse(userDataStr) : null;

        list.innerHTML = comments.map(c => {
            const isMe = currentUser && currentUser.id === c.user;
            const actions = isMe ? `
                <div style="display:flex; gap:10px; margin-top:4px;">
                    <span onclick="editComment(${c.comment_id}, ${postId}, '${c.content.replace(/'/g, "\\'")}')" style="color: var(--primary-color); cursor: pointer; font-size:11px; font-weight:600;">Sửa</span>
                    <span onclick="deleteComment(${c.comment_id}, ${postId})" style="color: #e53e3e; cursor: pointer; font-size:11px; font-weight:600;">Xóa</span>
                </div>
            ` : '';
            
            return `
            <div class="comment-bubble-wrapper">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(c.user_name || 'U')}&background=random" style="width:28px; height:28px; border-radius:50%;">
                <div style="display:flex; flex-direction:column; align-items:flex-start;">
                    <div class="comment-bubble">
                        <div class="comment-bubble-author">${c.user_name || 'Người dùng'}</div>
                        <div class="comment-bubble-text" id="comment-text-${c.comment_id}">${c.content}</div>
                    </div>
                    ${actions}
                </div>
            </div>
            `;
        }).join('');
    } catch(e) {}
}

async function submitRating(postId) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để đánh giá!');
        window.location.href = 'login.html';
        return;
    }
    
    const starContainer = document.getElementById(`star-rating-${postId}`);
    let stars = 0;
    if (starContainer && starContainer.dataset.value) {
        stars = parseInt(starContainer.dataset.value);
    }
    const comment = document.getElementById(`rating-comment-${postId}`)?.value.trim();

    if (!stars || isNaN(stars) || stars === 0) { 
        alert('Vui lòng chọn số sao!'); 
        return; 
    }

    try {
        await apiFetch('/ratings/', {
            method: 'POST',
            body: JSON.stringify({ post: postId, stars, comment })
        });
        loadRatingsList(postId);
        alert('Đã gửi đánh giá!');
    } catch(e) { alert('Lỗi: ' + e.message); }
}

async function submitComment(postId) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để bình luận!');
        window.location.href = 'login.html';
        return;
    }
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input?.value.trim();
    if (!content) return;
    try {
        const result = await apiFetch('/comments/', { 
            method: 'POST', 
            body: JSON.stringify({ post: postId, content }) 
        });
        console.log('Comment submitted:', result);
        input.value = '';
        loadComments(postId);
    } catch(e) { 
        console.error('Comment Error:', e);
        alert('Lỗi gửi bình luận: ' + e.message); 
    }
}

async function loadUserRating(postId) {
    try {
        const ratings = await apiFetch(`/ratings/?post=${postId}`);
        const userData = JSON.parse(localStorage.getItem('user_data'));
        if (!ratings || !userData) return;
        const myRating = ratings.find(r => r.user === userData.id);
        if (myRating) {
            setRating(postId, myRating.stars);
            const box = document.getElementById(`rating-comment-${postId}`);
            if (box) box.value = myRating.comment || '';
            const btn = document.querySelector(`#expansion-${postId} .btn-submit-rating`);
            if (btn) btn.innerHTML = '<i class="fas fa-edit"></i> Cập nhật đánh giá';
        }
    } catch(e) {}
}

function highlightStars(postId, val) {
    const container = document.getElementById(`star-rating-${postId}`);
    if (!container) return;
    const stars = container.querySelectorAll('.star');
    stars.forEach(s => {
        const starValue = parseInt(s.getAttribute('data-val'));
        if (starValue <= val) {
            s.classList.remove('far');
            s.classList.add('fas', 'active');
        } else {
            s.classList.remove('fas', 'active');
            s.classList.add('far');
        }
    });
}

function setRating(postId, val) {
    const container = document.getElementById(`star-rating-${postId}`);
    if (!container) return;
    container.dataset.value = val;
    highlightStars(postId, val);
}

function resetStars(postId) {
    const container = document.getElementById(`star-rating-${postId}`);
    if (!container) return;
    const val = parseInt(container.dataset.value) || 0;
    highlightStars(postId, val);
}

// Global exposure for event handlers
window.togglePostSection = togglePostSection;
window.submitRating = submitRating;
window.submitComment = submitComment;
window.highlightStars = highlightStars;
window.setRating = setRating;
window.resetStars = resetStars;
window.deleteRating = deleteRating;
window.editComment = editComment;

async function deleteComment(commentId, postId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
    try {
        await apiFetch(`/comments/${commentId}/`, { method: 'DELETE' });
        loadComments(postId);
    } catch (e) {
        alert('Không thể xóa bình luận. Vui lòng thử lại.');
    }
}

async function editComment(commentId, postId, oldContent) {
    const newContent = prompt('Sửa bình luận của bạn:', oldContent);
    if (!newContent || newContent === oldContent) return;
    try {
        await apiFetch(`/comments/${commentId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ content: newContent })
        });
        loadComments(postId);
    } catch (e) { alert('Lỗi sửa bình luận.'); }
}
window.deleteComment = deleteComment;

function switchDetailTab(tab) {
    const ratingSec = document.getElementById('detail-rating-section');
    const commentSec = document.getElementById('detail-comment-section');
    const ratingBtn = document.getElementById('tab-btn-rating');
    const commentBtn = document.getElementById('tab-btn-comment');

    if (!ratingSec || !commentSec || !ratingBtn || !commentBtn) return;

    if (tab === 'rating') {
        ratingSec.style.display = 'block';
        commentSec.style.display = 'none';
        ratingBtn.classList.add('active');
        ratingBtn.style.backgroundColor = '#fce4ec';
        ratingBtn.style.color = 'var(--primary-color)';
        commentBtn.classList.remove('active');
        commentBtn.style.backgroundColor = 'transparent';
        commentBtn.style.color = '#666';
    } else {
        ratingSec.style.display = 'none';
        commentSec.style.display = 'block';
        commentBtn.classList.add('active');
        commentBtn.style.backgroundColor = '#fce4ec';
        commentBtn.style.color = 'var(--primary-color)';
        ratingBtn.classList.remove('active');
        ratingBtn.style.backgroundColor = 'transparent';
        ratingBtn.style.color = '#666';
    }
}
window.switchDetailTab = switchDetailTab;

async function loadPostDetail(id) {
    const container = document.getElementById('post-detail-container');
    if (!container) return;
    try {
        const post = await apiFetch(`/posts/${id}/`);
        if (!post) return;
        
        const userData = JSON.parse(localStorage.getItem('user_data')) || { full_name: 'Me', username: 'me' };

        container.innerHTML = `
            <div class="card detail-card" style="padding:0;">
                <img src="${post.thumbnail || 'https://picsum.photos/seed/food/800/600'}" style="width:100%; height:400px; object-fit:cover;">
                <div style="padding:24px;">
                    <h1 style="margin-bottom: 10px;">${post.title}</h1>
                    <p style="color: grey; margin-bottom: 25px;">${post.region_name}${post.province ? ', ' + post.province : ''} · ${formatPostTime(post.created_at, post.updated_at)}</p>
                    
                    <h3 class="section-title"><i class="fas fa-info-circle"></i> Giới thiệu</h3>
                    <p style="white-space: pre-wrap; line-height: 1.7; color: #444; margin-bottom: 25px;">${post.content}</p>
                    
                    <h3 class="section-title"><i class="fas fa-leaf"></i> Nguyên liệu</h3>
                    <p style="white-space: pre-wrap; line-height: 1.7; color: #444; margin-bottom: 25px;">${post.ingredients || 'Đang cập nhật...'}</p>
                    
                    <h3 class="section-title"><i class="fas fa-utensils"></i> Cách thực hiện</h3>
                    <p style="white-space: pre-wrap; line-height: 1.7; color: #444; margin-bottom: 25px;">${post.recipe || 'Đang cập nhật...'}</p>
                </div>

                <!-- Interaction Tabs -->
                <div style="padding:15px 24px; border-top:1px solid #eee; display:flex; gap:15px; background-color: #fcfcfc;">
                    <button class="tab-btn active" id="tab-btn-rating" onclick="switchDetailTab('rating')" style="padding: 10px 20px; border: none; background: #fce4ec; color: var(--primary-color); cursor: pointer; font-weight: 700; border-radius: 12px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fas fa-star"></i> Đánh giá
                    </button>
                    <button class="tab-btn" id="tab-btn-comment" onclick="switchDetailTab('comment')" style="padding: 10px 20px; border: none; background: transparent; color: #666; cursor: pointer; font-weight: 700; border-radius: 12px; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                        <i class="fas fa-comment"></i> Bình luận
                    </button>
                </div>

                <!-- Rating Section -->
                <div id="detail-rating-section" style="padding:24px; border-top:1px solid #eee; background-color: #fff;">
                    <h3 class="section-title" style="margin-top:0;"><i class="fas fa-star-half-alt"></i> Đánh giá từ cộng đồng</h3>
                    <div class="mini-rating-form" style="margin-bottom: 25px; border: 1px solid #eee; padding: 20px; border-radius: 15px; background: #fafafa;">
                        <div style="font-weight:600; font-size:14px; margin-bottom:12px; color:var(--text-main);">Chia sẻ cảm nhận của bạn:</div>
                        <div class="star-rating" id="star-rating-${post.post_id}" onmouseout="resetStars(${post.post_id})">
                            ${[1,2,3,4,5].map(n => `<i class="far fa-star star" data-val="${n}" onclick="setRating(${post.post_id}, ${n})" onmouseover="highlightStars(${post.post_id}, ${n})"></i>`).join('')}
                        </div>
                        <textarea id="rating-comment-${post.post_id}" placeholder="Hương vị thế nào? Bạn có lời khuyên gì không..." style="width:100%; min-height:80px; padding:12px; border:1px solid #eee; border-radius:12px; margin-top:10px; font-family: inherit; resize: vertical;"></textarea>
                        <div style="display:flex; justify-content:flex-end; margin-top:12px;">
                            <button class="btn-submit-rating" onclick="submitRating(${post.post_id})" style="background:var(--primary-color); color:white; border:none; padding:10px 25px; border-radius:25px; cursor:pointer; font-weight:700; box-shadow: 0 4px 10px rgba(247, 99, 12, 0.3);">
                                <i class="fas fa-paper-plane"></i> Gửi đánh giá
                            </button>
                        </div>
                    </div>
                    <div id="ratings-list-${post.post_id}"></div>
                </div>

                <!-- Comment Section -->
                <div id="detail-comment-section" style="padding:24px; border-top:1px solid #eee; display: none;">
                    <h3 class="section-title" style="margin-top:0;"><i class="fas fa-comment-dots"></i> Thảo luận món ăn</h3>
                    
                    <div class="comment-input-row" style="display:flex; gap:15px; margin-bottom:30px;">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || userData.username)}&background=f7630c&color=fff" style="width:40px; height:40px; border-radius:50%;">
                        <div style="flex:1;">
                            <textarea id="comment-input-${post.post_id}" class="modern-comment-input" placeholder="Viết phản hồi của bạn..." style="width:100%; min-height:70px; padding:15px; border:1px solid #eee; border-radius:15px; font-family: inherit; background:#fafafa;"></textarea>
                            <div style="display:flex; justify-content:flex-end; margin-top:12px;">
                                <button class="btn-submit-comment" onclick="submitComment(${post.post_id})" style="background:var(--primary-color); color:white; border:none; padding:10px 25px; border-radius:25px; cursor:pointer; font-weight:700; box-shadow: 0 4px 10px rgba(247, 99, 12, 0.3);">
                                    <i class="fas fa-comment-dots"></i> Bình luận
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="comments-list-${post.post_id}"></div>
                </div>
            </div>
        `;

        // Update Sidebar Author Info
        const authorNameEl = document.getElementById('author-name');
        const authorAvatarEl = document.getElementById('author-avatar');
        const followBtn = document.querySelector('.sidebar-right .btn-view-recipe');

        if (authorNameEl) {
            authorNameEl.innerText = post.author_name;
            authorNameEl.style.cursor = 'pointer';
            authorNameEl.onclick = () => window.location.href = `profile.html?id=${post.contributor}`;
        }
        if (authorAvatarEl) {
            authorAvatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name)}&background=random&size=100`;
            authorAvatarEl.style.cursor = 'pointer';
            authorAvatarEl.onclick = () => window.location.href = `profile.html?id=${post.contributor}`;
        }
        
        if (followBtn) {
            checkFollowStatus(post.contributor, followBtn);
            followBtn.onclick = () => toggleFollow(post.contributor, followBtn);
        }

        // Initialize lists
        loadComments(post.post_id);
        loadRatingsList(post.post_id);
        loadUserRating(post.post_id);

    } catch (e) {
        container.innerHTML = `<p style="padding:40px; text-align:center; color:red;">Lỗi tải dữ liệu bài viết: ${e.message}</p>`;
    }
}
window.loadPostDetail = loadPostDetail;

async function initCreatePostPage() {
    const form = document.getElementById('create-post-form');
    if (!form) return;

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    const titleHeader = document.querySelector('.form-container h1');
    const submitBtn = form.querySelector('.btn-submit');

    // Province data by region name
    const provincesByRegion = {
        'Miền Bắc': [
            'Hà Nội', 'Hải Phòng', 'Quảng Ninh', 'Bắc Ninh', 'Bắc Giang',
            'Hà Giang', 'Cao Bằng', 'Lạng Sơn', 'Tuyên Quang', 'Thái Nguyên',
            'Phú Thọ', 'Yên Bái', 'Lào Cai', 'Điện Biên', 'Lai Châu',
            'Sơn La', 'Hòa Bình', 'Hải Dương', 'Hưng Yên', 'Nam Định',
            'Thái Bình', 'Hà Nam', 'Ninh Bình', 'Vĩnh Phúc', 'Bắc Kạn'
        ],
        'Miền Trung': [
            'Đà Nẵng', 'Huế (Thừa Thiên Huế)', 'Quảng Trị', 'Quảng Bình',
            'Hà Tĩnh', 'Nghệ An', 'Thanh Hóa', 'Quảng Nam', 'Quảng Ngãi',
            'Bình Định', 'Phú Yên', 'Khánh Hòa', 'Ninh Thuận', 'Bình Thuận',
            'Kon Tum', 'Gia Lai', 'Đắk Lắk', 'Đắk Nông', 'Lâm Đồng'
        ],
        'Miền Nam': [
            'Thành phố Hồ Chí Minh', 'Cần Thơ', 'Bình Dương', 'Đồng Nai',
            'Bà Rịa - Vũng Tàu', 'Long An', 'Tiền Giang', 'Bến Tre',
            'Trà Vinh', 'Vĩnh Long', 'Đồng Tháp', 'An Giang', 'Kiên Giang',
            'Hậu Giang', 'Sóc Trăng', 'Bạc Liêu', 'Cà Mau', 'Tây Ninh',
            'Bình Phước', 'Bình Thuận'
        ]
    };

    function updateProvinces(regionName) {
        const provinceSelect = document.getElementById('province');
        if (!provinceSelect) return;
        provinceSelect.innerHTML = '<option value="">-- Để trống --</option>';
        const provinces = provincesByRegion[regionName] || [];
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.innerText = p;
            provinceSelect.appendChild(opt);
        });
    }

    // Load Regions
    try {
        const regions = await apiFetch('/regions/');
        const regionSelect = document.getElementById('region');
        if (regionSelect && regions) {
            regions.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.region_id;
                opt.innerText = r.region_name;
                opt.dataset.name = r.region_name;
                regionSelect.appendChild(opt);
            });

            // Wire up region → province filtering
            regionSelect.addEventListener('change', () => {
                const selected = regionSelect.options[regionSelect.selectedIndex];
                updateProvinces(selected?.dataset.name || selected?.innerText || '');
            });
        }
    } catch (e) {}

    // Edit Mode Check
    if (editId) {
        if (titleHeader) titleHeader.innerText = 'Chỉnh sửa bài viết';
        if (submitBtn) submitBtn.innerHTML = 'Cập nhật bài viết <i class="fas fa-save" style="margin-left: 8px;"></i>';
        
        try {
            const post = await apiFetch(`/posts/${editId}/`);
            if (post) {
                form.querySelector('#title').value = post.title;
                form.querySelector('#region').value = post.region;
                if (form.querySelector('#province')) {
                    form.querySelector('#region').dispatchEvent(new Event('change'));
                    form.querySelector('#province').value = post.province || '';
                }
                form.querySelector('#thumbnail').value = post.thumbnail;
                form.querySelector('#content').value = post.content || '';
                form.querySelector('#ingredients').value = post.ingredients || '';
                form.querySelector('#recipe').value = post.recipe || '';
                
                // Trigger preview event if it exists (for the image preview script in dangbai.html)
                const thumbInput = form.querySelector('#thumbnail');
                if (thumbInput) {
                    thumbInput.dispatchEvent(new Event('input'));
                }
            }
        } catch (e) {
            alert('Lỗi tải dữ liệu bài viết: ' + e.message);
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('submit-status');
        if (status) {
            status.style.display = 'block';
            status.textContent = 'Đang xử lý...';
        }

        const province = form.querySelector('#province')?.value || '';
        const baseTitle = form.querySelector('#title').value;

        const postData = {
            title: baseTitle,
            region: form.querySelector('#region').value,
            province: province,
            thumbnail: form.querySelector('#thumbnail').value,
            content: form.querySelector('#content').value,
            ingredients: form.querySelector('#ingredients').value,
            recipe: form.querySelector('#recipe').value,
            status: 'Active'
        };

        try {
            let result;
            if (editId) {
                result = await apiFetch(`/posts/${editId}/`, {
                    method: 'PATCH',
                    body: JSON.stringify(postData)
                });
            } else {
                result = await apiFetch('/posts/', {
                    method: 'POST',
                    body: JSON.stringify(postData)
                });
            }

            if (result) {
                if (status) {
                    status.style.color = 'green';
                    status.textContent = editId ? 'Cập nhật thành công!' : 'Đăng bài thành công!';
                } else {
                    alert(editId ? 'Cập nhật bài viết thành công!' : 'Đăng bài viết thành công!');
                }
                setTimeout(() => window.location.href = 'index.html', 1500);
            }
        } catch (err) {
            if (status) {
                status.style.color = 'red';
                status.textContent = 'Thao tác thất bại: ' + err.message;
            } else {
                alert('Thao tác thất bại: ' + err.message);
            }
        }
    });
}

let currentSearchRegion = 'Tất cả';

window.applyFilter = function(regionName, element) {
    if (element) {
        document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }
    currentSearchRegion = regionName;
    const query = new URLSearchParams(window.location.search).get('q') || '';
    performSearch(query);
}

async function performSearch(query) {
    const list = document.getElementById('results-list');
    const countEl = document.getElementById('search-count');
    if (!list) return;

    // Normalize text: remove diacritics and lowercase for accent-insensitive matching
    function normalize(str) {
        return (str || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\u0111/g, 'd').replace(/\u0110/g, 'd'); // đ/Đ
    }

    const q = normalize(query);

    try {
        const posts = await apiFetch('/posts/?status=Active');
        const filtered = posts.filter(p => {
            const matchQuery = normalize(p.title).includes(q) ||
                normalize(p.content).includes(q) ||
                normalize(p.region_name).includes(q) ||
                normalize(p.ingredients).includes(q);
                
            const matchRegion = (currentSearchRegion === 'Tất cả') || (p.region_name === currentSearchRegion);
            return matchQuery && matchRegion;
        });
        document.getElementById('loading-results')?.remove();
        list.innerHTML = '';
        if (filtered.length > 0) {
            if (countEl) countEl.innerText = `Tìm thấy ${filtered.length} kết quả cho "${query}"`;
            filtered.forEach(p => list.appendChild(createPostCard(p)));
        } else {
            const noResults = document.getElementById('no-results');
            if (noResults) noResults.style.display = 'block';
            if (countEl) countEl.innerText = `Không tìm thấy kết quả nào cho "${query}"`;
        }
    } catch (e) {
        console.error('Search error', e);
    }
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
                case 'menu-reports':
                    viewTitle.innerText = "Quản lý báo cáo";
                    viewSubtitle.innerText = "Xử lý các bài viết bị cộng đồng báo cáo vi phạm.";
                    loadAdminReports();
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
                <div class="stat-card blue" style="cursor:pointer;" onclick="document.getElementById('menu-users').click()">
                    <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                    <div class="stat-info">
                        <h3>Tổng người dùng</h3>
                        <div class="value">${stats.total_users.toLocaleString()}</div>
                    </div>
                </div>
                <div class="stat-card green" style="cursor:pointer;" onclick="document.getElementById('menu-posts').click()">
                    <div class="stat-icon green"><i class="fas fa-edit"></i></div>
                    <div class="stat-info">
                        <h3>Tổng bài đăng</h3>
                        <div class="value">${stats.total_posts.toLocaleString()}</div>
                    </div>
                </div>
                <div class="stat-card red" style="cursor:pointer;" onclick="document.getElementById('menu-reports').click()">
                    <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info">
                        <h3>Báo cáo chưa xử lý</h3>
                        <div class="value">${stats.total_reports.toLocaleString()}</div>
                    </div>
                </div>
            </section>
            <div class="dashboard-content-grid">
                <div class="chart-card">
                    <div class="card-header"><h3>Thống kê bài viết theo vùng miền</h3></div>
                    <div class="chart-placeholder">
                        ${stats.trending_dishes ? stats.trending_dishes.slice(0, 5).map((d, i) => `
                            <div class="bar ${i % 2 === 0 ? '' : 'alt'}" style="height: ${40 + (i * 10)}%" title="${d.title}"></div>
                        `).join('') : '<div class="bar" style="height: 60%"></div>'}
                    </div>
                </div>
                <div class="top-dishes-card">
                    <div class="card-header"><h3>Món ăn mới nhất</h3></div>
                    <ul class="dish-list">
                        ${stats.trending_dishes ? stats.trending_dishes.slice(0, 3).map(d => `
                            <li class="dish-item">
                                <div class="dish-meta">
                                    <h4 style="margin:0;">${d.title}</h4>
                                    <p style="margin:0; font-size:12px; color:#888;">${d.region__region_name}</p>
                                </div>
                            </li>
                        `).join('') : '<li>Chưa có dữ liệu</li>'}
                    </ul>
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
    let post = { title: '', content: '', thumbnail: '', ingredients: '', recipe: '' };
    if (postId) {
        try {
            post = await apiFetch(`/posts/${postId}/`);
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
                <div class="settings-grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="settings-group">
                        <label>Tên món ăn</label>
                        <input type="text" id="m-title" class="settings-input" required value="${post.title}" placeholder="Nhập tên món ăn đặc sắc...">
                    </div>
                    <div class="settings-group">
                        <label>Hình ảnh (URL)</label>
                        <input type="text" id="m-thumbnail" class="settings-input" required value="${post.thumbnail}" placeholder="https://example.com/image.jpg">
                    </div>
                </div>

                <div class="settings-group">
                    <label>Giới thiệu ngắn gọn / Câu chuyện văn hóa</label>
                    <textarea id="m-content" class="settings-input" required style="height:80px; resize:vertical; line-height:1.6;" placeholder="Chia sẻ nguồn gốc hoặc ý nghĩa của món ăn này...">${post.content || ''}</textarea>
                </div>

                <div class="settings-grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div class="settings-group">
                        <label>Nguyên liệu cần chuẩn bị</label>
                        <textarea id="m-ingredients" class="settings-input" required style="height:120px; resize:vertical; line-height:1.6;" placeholder="Mỗi nguyên liệu một dòng...">${post.ingredients || ''}</textarea>
                    </div>
                    <div class="settings-group">
                        <label>Các bước thực hiện</label>
                        <textarea id="m-recipe" class="settings-input" required style="height:120px; resize:vertical; line-height:1.6;" placeholder="Bước 1: ...&#10;Bước 2: ...">${post.recipe || ''}</textarea>
                    </div>
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
    const ingredients = document.getElementById('m-ingredients').value;
    const recipe = document.getElementById('m-recipe').value;

    const payload = { 
        title, 
        thumbnail, 
        content, 
        ingredients,
        recipe,
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

async function loadAdminReports() {
    const contentArea = document.getElementById('admin-content-area');
    try {
        const reports = await apiFetch('/reports/');
        contentArea.innerHTML = `
            <div class="admin-content-card">
                <div class="admin-section-header">
                    <h3><i class="fas fa-exclamation-circle"></i> Danh sách báo cáo vi phạm</h3>
                    <div class="badge badge-pending">${reports.filter(r => r.process_status === 'Pending').length} báo cáo mới</div>
                </div>
                
                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Bài viết</th>
                                <th>Người báo cáo</th>
                                <th>Lý do</th>
                                <th>Ngày báo</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reports.map(r => `
                                <tr>
                                    <td>
                                        <a href="chitiet.html?id=${r.post}" target="_blank" style="font-weight:700; color:var(--primary-color); text-decoration:none;">${r.post_title || 'Bài viết #' + r.post}</a>
                                    </td>
                                    <td>${r.user_name || 'Người dùng'}</td>
                                    <td><div style="max-width:200px; font-size:13px; color:#666; line-height: 1.4;">${r.reason}</div></td>
                                    <td>${new Date(r.created_at).toLocaleDateString('vi-VN')}</td>
                                    <td><span class="badge ${r.process_status === 'Pending' ? 'badge-pending' : 'badge-active'}">${r.process_status}</span></td>
                                    <td class="admin-actions">
                                        ${r.process_status === 'Pending' ? `
                                            <button class="btn-admin btn-approve" title="Xử lý xong" onclick="moderateReport(${r.report_id}, 'Processed')">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn-admin btn-reject" title="Bỏ qua" onclick="moderateReport(${r.report_id}, 'Dismissed')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        ` : '<span style="color:#999; font-size:12px;">Đã xử lý</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        contentArea.innerHTML = '<p>Lỗi tải báo cáo.</p>';
    }
}

async function moderateReport(id, status) {
    try {
        await apiFetch(`/reports/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ process_status: status })
        });
        loadAdminReports();
    } catch (e) { alert('Thao tác thất bại.'); }
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
window.moderateReport = moderateReport;

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
    console.log('Initializing profile page...');
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    const currentUser = JSON.parse(localStorage.getItem('user_data'));
    
    try {
        let user;
        if (userId && (!currentUser || userId != currentUser.id)) {
            user = await apiFetch(`/users/${userId}/profile/`);
        } else {
            user = await apiFetch('/auth/me/');
        }

        if (user) {
            document.getElementById('profile-name').innerText = user.full_name || user.username;
            document.getElementById('profile-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=f7630c&color=fff&size=200`;
            document.getElementById('profile-join-date').innerText = `Tham gia từ ${new Date(user.date_joined || Date.now()).toLocaleDateString('vi-VN')}`;
            
            // Stats
            document.getElementById('profile-post-count').innerText = user.post_count || 0;
            document.getElementById('profile-follower-count').innerText = user.follower_count || 0;
            document.getElementById('profile-following-count').innerText = user.following_count || 0;

            // Extra Info
            const passionEl = document.getElementById('profile-passion');
            const locationEl = document.getElementById('profile-location');
            if (passionEl) passionEl.innerText = user.passion || 'Đam mê nấu ăn';
            if (locationEl) locationEl.innerText = user.location || 'Sống tại Hà Nội, Việt Nam';

            // Buttons
            const editBtn = document.getElementById('edit-profile-btn');
            const followBtn = document.getElementById('follow-btn');
            const createPostBox = document.querySelector('.create-post');
            
            const isMyProfile = !userId || (currentUser && userId == currentUser.id);

            if (isMyProfile) {
                if (editBtn) editBtn.style.display = 'block';
                if (followBtn) followBtn.style.display = 'none';
                if (createPostBox) createPostBox.style.display = 'block';
                
                // Attach edit listener
                if (editBtn) {
                    editBtn.onclick = () => {
                        console.log('Redirecting to settings...');
                        window.location.href = 'settings.html';
                    };
                }
            } else {
                if (editBtn) editBtn.style.display = 'none';
                if (followBtn) {
                    followBtn.style.display = 'block';
                    checkFollowStatus(user.id, followBtn);
                    followBtn.onclick = () => toggleFollow(user.id, followBtn);
                }
                if (createPostBox) createPostBox.style.display = 'none';
            }

            // Create Post Input (Global logic check)
            const mockInput = document.querySelector('.mock-input');
            if (mockInput) {
                mockInput.onclick = () => {
                    console.log('Redirecting to create post...');
                    window.location.href = 'dangbai.html';
                };
            }

            // Posts
            const postsContainer = document.getElementById('profile-posts');
            if (postsContainer) {
                postsContainer.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Đang tải bài viết...</div>';
                const posts = await apiFetch('/posts/');
                const userPosts = posts.filter(p => p.author_username === user.username);
                postsContainer.innerHTML = '';
                if (userPosts.length > 0) userPosts.forEach(p => postsContainer.appendChild(createPostCard(p)));
                else postsContainer.innerHTML = '<div class="card" style="padding:40px; text-align:center;">Chưa có bài viết.</div>';
            }

            // Load Followed Users
            loadFollowedUsers();
        }
    } catch (e) {
        console.error('Profile Init Error:', e);
        const container = document.getElementById('profile-posts');
        if (container) container.innerHTML = `<div class="card" style="padding:40px; text-align:center; color:red;">Lỗi tải hồ sơ: ${e.message}</div>`;
    }
}

async function loadFollowedUsers() {
    const list = document.getElementById('followed-list');
    if (!list) return;

    try {
        const users = await apiFetch('/followed-users/');
        if (!users || users.length === 0) {
            list.innerHTML = '<p style="font-size: 14px; color: #999;">Chưa theo dõi ai.</p>';
            return;
        }

        list.innerHTML = users.map(u => `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; cursor: pointer;" onclick="window.location.href='profile.html?id=${u.id}'">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random" style="width: 32px; height: 32px; border-radius: 50%;">
                <span style="font-size: 14px; font-weight: 500;">${u.full_name}</span>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<p style="font-size: 12px; color: red;">Lỗi tải danh sách.</p>';
    }
}

async function initSavedPage() {
    const container = document.getElementById('saved-posts-container');
    if (!container) return;

    // Wire up filter buttons
    const filterBtns = document.querySelectorAll('.filters .btn-view-recipe');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.style.backgroundColor = '#f1f1f1';
                b.style.color = '#333';
            });
            btn.style.backgroundColor = 'var(--primary-color)';
            btn.style.color = 'white';
        });
    });

    try {
        const favorites = await apiFetch('/favorites/');
        container.innerHTML = '';
        if (!favorites || favorites.length === 0) {
            container.innerHTML = '<div style="grid-column: span 2; padding: 40px; text-align: center; color: #666;"><i class="fas fa-bookmark fa-3x" style="color:#eee; margin-bottom:15px;"></i><p>Bạn chưa lưu món ăn nào.</p></div>';
            return;
        }

        favorites.forEach(fav => {
            if (fav.post_details) {
                container.appendChild(createPostCard(fav.post_details));
            }
        });
    } catch (e) {
        container.innerHTML = `<p style="color:red; padding:20px;">Lỗi tải danh sách đã lưu: ${e.message}</p>`;
    }
}

async function initTrendingPage() {
    // The trending page uses 'trending-posts-container', not 'trending-list'
    const list = document.getElementById('trending-posts-container') || document.getElementById('trending-list') || document.getElementById('post-list');
    if (!list) return;

    try {
        const posts = await apiFetch('/posts/?status=Active');
        if (!posts || posts.length === 0) {
            list.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">Chưa có bài viết nào.</div>';
            return;
        }
        // Sort by most recent
        const trending = posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        list.innerHTML = '';
        trending.forEach(p => list.appendChild(createPostCard(p)));
    } catch (e) {
        console.error('Trending load error', e);
    }

    // Wire up hashtag keyword chips
    document.querySelectorAll('[data-hashtag], .hashtag-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const keyword = chip.dataset.hashtag || chip.textContent.replace('#', '').trim();
            window.location.href = `timkiem.html?q=${encodeURIComponent(keyword)}`;
        });
    });
}

async function initNotificationsPage() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    try {
        const notifications = await apiFetch('/notifications/');
        if (!notifications || notifications.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:50px; color:#999;">
                    <i class="fas fa-bell-slash fa-3x" style="opacity:0.2; margin-bottom:15px;"></i>
                    <p>Bạn chưa có thông báo nào.</p>
                </div>`;
            return;
        }

        list.innerHTML = notifications.map(n => {
            let icon = 'fa-bell';
            let color = 'var(--primary-color)';
            let text = '';
            
            if (n.action_type === 'new_post') {
                icon = 'fa-utensils';
                color = 'var(--primary-color)';
                text = `<strong>${n.actor_name}</strong> đã đăng một món ăn mới: <strong>${n.post_title}</strong>`;
            } else if (n.action_type === 'like') {
                icon = 'fa-thumbs-up';
                color = '#007bff';
                text = `<strong>${n.actor_name}</strong> đã thích bài viết của bạn.`;
            } else if (n.action_type === 'comment') {
                icon = 'fa-comment';
                color = '#28a745';
                text = `<strong>${n.actor_name}</strong> đã bình luận về bài viết của bạn.`;
            }

            return `
                <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick(${n.notification_id}, ${n.post})">
                    <div class="notif-icon-circle" style="background-color: ${color};"><i class="fas ${icon}"></i></div>
                    <div class="notif-info">
                        <p>${text}</p>
                        <span class="notif-time">${new Date(n.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Notifications Load Error:', e);
    }
}

async function handleNotifClick(notifId, postId) {
    try {
        // Mark as read
        await apiFetch(`/notifications/${notifId}/`, {
            method: 'PATCH',
            body: JSON.stringify({ is_read: true })
        });
        // Navigate to post
        if (postId) {
            window.location.href = `chitiet.html?id=${postId}`;
        }
    } catch (e) {
        if (postId) window.location.href = `chitiet.html?id=${postId}`;
    }
}
window.handleNotifClick = handleNotifClick;

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
        const posts = await apiFetch('/public/cuisine-data/');
        
        // --- Dynamic Hashtags Extraction ---
        const hashtagContainer = document.getElementById('trending-keywords-container');
        if (hashtagContainer) {
            try {
                const allPosts = await apiFetch('/posts/?status=Active');
                const hashtagCounts = {};
                const hashtagRegex = /#[\wÀ-ỹ]+/g;
                
                if (allPosts && allPosts.length > 0) {
                    allPosts.forEach(p => {
                        const textToSearch = (p.title + " " + (p.content || "")).replace(/<[^>]*>?/gm, '');
                        let match;
                        while ((match = hashtagRegex.exec(textToSearch)) !== null) {
                            const tag = match[0];
                            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
                        }
                    });
                    
                    const sortedHashtags = Object.keys(hashtagCounts).sort((a, b) => hashtagCounts[b] - hashtagCounts[a]).slice(0, 8);
                    
                    if (sortedHashtags.length > 0) {
                        hashtagContainer.innerHTML = sortedHashtags.map(tag => 
                            `<span class="hashtag-chip" onclick="window.location.href='timkiem.html?q=${encodeURIComponent(tag.replace('#', ''))}'" style="padding: 8px 15px; background: #eee; border-radius: 20px; font-weight: 500; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='var(--primary-color)';this.style.color='white'" onmouseout="this.style.background='#eee';this.style.color='#333'">${tag}</span>`
                        ).join('');
                    } else {
                        hashtagContainer.innerHTML = '<div style="padding: 10px; color: grey; font-style: italic; font-size: 14px;">Chưa có từ khóa nào nổi bật.</div>';
                    }
                }
            } catch (err) {
                console.error("Error loading hashtags", err);
            }
        }

        if (posts) {
            // Sort by average rating descending
            const trending = posts.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)).slice(0, 10);
            container.innerHTML = '';
            for (const p of trending) {
                // Fetch full post details for createPostCard
                const fullPost = await apiFetch(`/posts/${p.post_id}/`);
                if (fullPost) {
                    const card = createPostCard(fullPost);
                    const badge = document.createElement('div');
                    badge.style = "padding:10px 16px; color:var(--primary-color); font-weight:bold; font-size:12px; display:flex; align-items:center; gap:8px;";
                    badge.innerHTML = `<i class="fas fa-fire"></i> THỊNH HÀNH (Đánh giá: ${p.avg_rating ? p.avg_rating.toFixed(1) : '---'} ★)`;
                    card.prepend(badge);
                    container.appendChild(card);
                }
            }
        }
    } catch (e) {
        console.error('Error loading trending posts', e);
    }
}

async function toggleFavorite(postId) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Vui lòng đăng nhập để lưu món ăn!');
        window.location.href = 'login.html';
        return;
    }
    try {
        await apiFetch('/favorites/', { method: 'POST', body: JSON.stringify({ post: postId }) });
        alert('Đã cập nhật danh sách yêu thích!');
    } catch (e) { alert('Lỗi: ' + e.message); }
}

async function reportPost(postId) {
    const existingModal = document.getElementById('report-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'report-modal';
    modal.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div class="card" style="width: 90%; max-width: 400px; padding: 25px; border-radius: 12px; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <h3 style="margin-bottom: 15px; color: var(--text-main);">Báo cáo bài viết</h3>
            <p style="font-size: 14px; color: #666; margin-bottom: 15px;">Vui lòng chọn lý do báo cáo hoặc điền lý do của bạn:</p>
            
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="report_reason" value="Spam / Quảng cáo trái phép"> Spam / Quảng cáo trái phép
                </label>
                <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="report_reason" value="Nội dung phản cảm, không phù hợp"> Nội dung phản cảm, không phù hợp
                </label>
                <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="report_reason" value="Sai thông tin món ăn / vùng miền"> Sai thông tin món ăn / vùng miền
                </label>
                <label style="cursor: pointer; display: flex; align-items: center; gap: 8px;">
                    <input type="radio" name="report_reason" value="Vi phạm bản quyền hình ảnh / công thức"> Vi phạm bản quyền hình ảnh / công thức
                </label>
            </div>
            
            <input type="text" id="report-custom-reason" placeholder="Lý do khác (nếu có)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; outline: none; margin-bottom: 20px; box-sizing: border-box;">
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="report-cancel-btn" style="padding: 8px 16px; border: none; background: #eee; border-radius: 8px; cursor: pointer; color: #333; font-weight: 500;">Hủy</button>
                <button id="report-submit-btn" style="padding: 8px 16px; border: none; background: var(--primary-color); border-radius: 8px; cursor: pointer; color: white; font-weight: 500;">Gửi báo cáo</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('report-cancel-btn').addEventListener('click', () => modal.remove());
    
    document.getElementById('report-submit-btn').addEventListener('click', async () => {
        const selectedRadio = document.querySelector('input[name="report_reason"]:checked');
        const customReason = document.getElementById('report-custom-reason').value.trim();
        
        let finalReason = '';
        if (selectedRadio) finalReason += selectedRadio.value;
        if (customReason) finalReason += (finalReason ? ' - ' : '') + customReason;
        
        if (!finalReason) {
            alert('Vui lòng chọn hoặc nhập lý do báo cáo.');
            return;
        }
        
        document.getElementById('report-submit-btn').innerText = 'Đang gửi...';
        
        try {
            await apiFetch('/reports/', { method: 'POST', body: JSON.stringify({ post: postId, reason: finalReason }) });
            alert('Cảm ơn bạn! Báo cáo đã được gửi tới quản trị viên.');
            modal.remove();
        } catch(e) { 
            alert('Lỗi gửi báo cáo: ' + e.message); 
            document.getElementById('report-submit-btn').innerText = 'Gửi báo cáo';
        }
    });
}

function hidePost(postId) {
    if (!confirm('Bạn muốn ẩn bài viết này khỏi bảng tin?')) return;
    const card = document.getElementById(`post-card-${postId}`) || 
                 document.getElementById(`post-${postId}`);
    if (card) {
        // Wrap existing content if not already wrapped
        let contentWrapper = card.querySelector('.post-content-wrapper');
        if (!contentWrapper) {
            contentWrapper = document.createElement('div');
            contentWrapper.className = 'post-content-wrapper';
            while (card.firstChild) {
                contentWrapper.appendChild(card.firstChild);
            }
            card.appendChild(contentWrapper);
        }
        
        // Hide the content wrapper
        contentWrapper.style.display = 'none';

        // Add the restore message
        const restoreMsg = document.createElement('div');
        restoreMsg.className = 'post-restore-msg';
        restoreMsg.style.padding = '12px';
        restoreMsg.style.textAlign = 'center';
        restoreMsg.style.color = 'var(--text-secondary)';
        restoreMsg.style.backgroundColor = 'rgba(0,0,0,0.03)';
        restoreMsg.style.borderRadius = '8px';
        restoreMsg.style.fontSize = '14px';
        restoreMsg.innerHTML = `
            <span>Đã ẩn bài viết.</span>
            <a href="#" onclick="restorePost('${postId}', event)" style="color: var(--primary-color); font-weight: 600; margin-left: 10px; text-decoration: none;">Hoàn tác</a>
        `;
        card.appendChild(restoreMsg);
    }
}

function restorePost(postId, event) {
    if (event) event.preventDefault();
    const card = document.getElementById(`post-card-${postId}`) || 
                 document.getElementById(`post-${postId}`);
    if (card) {
        // Remove the restore message
        const restoreMsg = card.querySelector('.post-restore-msg');
        if (restoreMsg) restoreMsg.remove();
        
        // Show the original content
        const contentWrapper = card.querySelector('.post-content-wrapper');
        if (contentWrapper) {
            contentWrapper.style.display = 'block';
        }
    }
}

window.toggleFavorite = toggleFavorite;
window.reportPost = reportPost;
window.hidePost = hidePost;
window.restorePost = restorePost;

async function initSettingsPage() {
    // Initial load
    switchSettingsTab('tab-account');
}

async function switchSettingsTab(tabId) {
    const container = document.querySelector('.feed-container');
    const menuItems = document.querySelectorAll('.sidebar-left .menu-item');
    if (!container) return;

    // Update active class
    menuItems.forEach(item => {
        item.classList.toggle('active', item.id === tabId);
        const span = item.querySelector('span');
        if (span) span.style.color = item.id === tabId ? 'var(--primary-color)' : '';
        if (span) span.style.fontWeight = item.id === tabId ? 'bold' : 'normal';
    });

    container.innerHTML = '<div style="text-align:center; padding:50px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-color);"></i></div>';

    switch (tabId) {
        case 'tab-account':
            await renderAccountSettings(container);
            break;
        case 'tab-notifications':
            renderNotificationSettings(container);
            break;
        case 'tab-security':
            renderSecuritySettings(container);
            break;
        case 'tab-appearance':
            renderAppearanceSettings(container);
            break;
    }
}

window.switchSettingsTab = switchSettingsTab;

async function renderAccountSettings(container) {
    try {
        const user = await apiFetch('/auth/me/');
        if (!user) return;
        container.innerHTML = `
            <div class="card" style="padding: 30px;">
                <h2 style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">Cài Đặt Tài Khoản</h2>
                <form id="profile-settings-form" style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="display: flex; gap: 20px; align-items: center;">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || user.username)}&background=f7630c&color=fff&size=200" alt="User Avatar" id="settings-avatar" style="width: 80px; height: 80px; border-radius: 50%;">
                        <div>
                            <button type="button" class="btn-view-recipe" style="background-color: var(--primary-color); color: white;">Đổi ảnh đại diện</button>
                            <button type="button" class="btn-view-recipe" style="background-color: #f1f1f1; color: #333; margin-left: 10px;">Xóa ảnh</button>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 5px;">Tên hiển thị</label>
                        <input type="text" id="settings-fullname" value="${user.full_name || ''}" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 5px;">Email</label>
                        <input type="email" id="settings-email" value="${user.email || ''}" disabled style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; background: #f9f9f9;">
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 5px;">Tiểu sử (Slogan)</label>
                        <textarea id="settings-bio" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; resize: vertical;">${user.bio || ''}</textarea>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 5px;">Sở thích / Đam mê</label>
                            <input type="text" id="settings-passion" value="${user.passion || ''}" placeholder="Vd: Đam mê nấu ăn" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 500; margin-bottom: 5px;">Nơi sống</label>
                            <input type="text" id="settings-location" value="${user.location || ''}" placeholder="Vd: Hà Nội, Việt Nam" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-weight: 500; margin-bottom: 5px;">Trạng thái tài khoản</label>
                        <input type="text" id="settings-status" value="${user.status || 'Active'}" disabled style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; background: #f9f9f9;">
                    </div>
                    <div style="margin-top: 10px; text-align: right;">
                        <button type="button" class="btn-view-recipe" style="background-color: #f1f1f1; color: #333;" onclick="window.location.href='profile.html'">Hủy</button>
                        <button type="submit" class="btn-view-recipe" style="background-color: var(--primary-color); color: white; margin-left: 10px;">Lưu thay đổi</button>
                    </div>
                </form>
            </div>
            <div class="card" style="padding: 30px; margin-top: 20px;">
                <h3 style="color: #e74c3c; margin-bottom: 15px;">Vùng Nguy Hiểm</h3>
                <p style="color: #666; margin-bottom: 15px;">Khi xóa tài khoản, tất cả dữ liệu, bài viết và thông tin của bạn sẽ bị xóa vĩnh viễn và không thể khôi phục.</p>
                <button class="btn-view-recipe" style="background-color: #ffebee; color: #c0392b; border: 1px solid #ffcdd2;">Xóa tài khoản</button>
            </div>
        `;

        const form = document.getElementById('profile-settings-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('settings-fullname').value;
            const bio = document.getElementById('settings-bio').value;
            const passion = document.getElementById('settings-passion').value;
            const location = document.getElementById('settings-location').value;
            try {
                await apiFetch('/auth/me/', {
                    method: 'PATCH',
                    body: JSON.stringify({ 
                        full_name: fullName, 
                        bio: bio,
                        passion: passion,
                        location: location
                    })
                });
                alert('Cập nhật thông tin thành công!');
                updateUserUI();
            } catch (err) {
                alert('Lỗi cập nhật: ' + err.message);
            }
        });
    } catch (e) {
        container.innerHTML = '<p style="color:red;">Lỗi tải thông tin người dùng.</p>';
    }
}

function renderNotificationSettings(container) {
    container.innerHTML = `
        <div class="card" style="padding: 30px;">
            <h2 style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">Cài Đặt Thông Báo</h2>
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">Thông báo trình duyệt</div>
                        <div style="font-size: 14px; color: #666;">Nhận thông báo khi có người bình luận hoặc yêu thích món ăn của bạn.</div>
                    </div>
                    <input type="checkbox" checked style="width: 20px; height: 20px; accent-color: var(--primary-color);">
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">Email thông báo</div>
                        <div style="font-size: 14px; color: #666;">Nhận bản tin hàng tuần về các món ăn đang hot.</div>
                    </div>
                    <input type="checkbox" style="width: 20px; height: 20px; accent-color: var(--primary-color);">
                </div>
                <button class="btn-view-recipe" style="background-color: var(--primary-color); color: white; width: fit-content; align-self: flex-end;">Lưu cài đặt</button>
            </div>
        </div>
    `;
}

function renderSecuritySettings(container) {
    container.innerHTML = `
        <div class="card" style="padding: 30px;">
            <h2 style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">Bảo Mật & Mật Khẩu</h2>
            <form style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <label style="display: block; font-weight: 500; margin-bottom: 5px;">Mật khẩu hiện tại</label>
                    <input type="password" placeholder="••••••••" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                </div>
                <div>
                    <label style="display: block; font-weight: 500; margin-bottom: 5px;">Mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                </div>
                <div>
                    <label style="display: block; font-weight: 500; margin-bottom: 5px;">Xác nhận mật khẩu mới</label>
                    <input type="password" placeholder="••••••••" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
                </div>
                <button type="submit" class="btn-view-recipe" style="background-color: var(--primary-color); color: white; width: fit-content; align-self: flex-end;">Cập nhật mật khẩu</button>
            </form>
        </div>
    `;
}

function renderAppearanceSettings(container) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    container.innerHTML = `
        <div class="card" style="padding: 30px;">
            <h2 style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">Tùy Chỉnh Giao Diện</h2>
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 15px;">Chế độ hiển thị</div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div onclick="setTheme('light')" class="theme-option ${currentTheme === 'light' ? 'active' : ''}" style="flex: 1; min-width: 120px; border: 2px solid ${currentTheme === 'light' ? 'var(--primary-color)' : '#ddd'}; border-radius: 10px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.2s;">
                            <i class="fas fa-sun" style="font-size: 24px; color: #f1c40f; margin-bottom: 10px;"></i>
                            <div>Sáng</div>
                        </div>
                        <div onclick="setTheme('dark')" class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" style="flex: 1; min-width: 120px; border: 2px solid ${currentTheme === 'dark' ? 'var(--primary-color)' : '#ddd'}; border-radius: 10px; padding: 15px; text-align: center; cursor: pointer; background: #2d3436; color: white; transition: all 0.2s;">
                            <i class="fas fa-moon" style="font-size: 24px; color: #f1c40f; margin-bottom: 10px;"></i>
                            <div>Tối</div>
                        </div>
                        <div onclick="setTheme('pink')" class="theme-option ${currentTheme === 'pink' ? 'active' : ''}" style="flex: 1; min-width: 120px; border: 2px solid ${currentTheme === 'pink' ? 'var(--primary-color)' : '#ddd'}; border-radius: 10px; padding: 15px; text-align: center; cursor: pointer; background: #ffc0cb; color: #4a4a4a; transition: all 0.2s;">
                            <i class="fas fa-heart" style="font-size: 24px; color: #ff69b4; margin-bottom: 10px;"></i>
                            <div>Hồng</div>
                        </div>
                    </div>
                </div>
                <div style="font-size: 14px; color: var(--text-secondary);">Giao diện sẽ được áp dụng ngay lập tức và lưu lại cho lần truy cập sau.</div>
            </div>
        </div>
    `;
}

function setTheme(theme) {
    localStorage.setItem('theme', theme);
    applyTheme();
    
    // Update UI selection
    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => {
        const isThis = (theme === 'light' && opt.innerText.includes('Sáng')) || 
                       (theme === 'dark' && opt.innerText.includes('Tối')) ||
                       (theme === 'pink' && opt.innerText.includes('Hồng'));
        opt.style.borderColor = isThis ? 'var(--primary-color)' : '#ddd';
        opt.style.borderWidth = isThis ? '2px' : '2px'; // Keep border for layout stability
    });
}

window.setTheme = setTheme;

async function checkFollowStatus(userId, btn) {
    try {
        const follows = await apiFetch('/follows/');
        const isFollowing = follows.some(f => f.followed === userId);
        updateFollowBtn(btn, isFollowing);
    } catch (e) {}
}

function updateFollowBtn(btn, isFollowing) {
    if (isFollowing) {
        btn.innerText = 'Đang theo dõi';
        btn.style.backgroundColor = '#e2e8f0';
        btn.style.color = '#4a5568';
    } else {
        btn.innerText = 'Theo dõi';
        btn.style.backgroundColor = 'var(--primary-color)';
        btn.style.color = 'white';
    }
    btn.dataset.following = isFollowing;
}

async function toggleFollow(userId, btn) {
    const isFollowing = btn.dataset.following === 'true';
    try {
        if (isFollowing) {
            const follows = await apiFetch('/follows/');
            const followRecord = follows.find(f => f.followed === userId);
            if (followRecord) {
                await apiFetch(`/follows/${followRecord.id}/`, { method: 'DELETE' });
            }
        } else {
            await apiFetch('/follows/', {
                method: 'POST',
                body: JSON.stringify({ followed: userId })
            });
        }
        updateFollowBtn(btn, !isFollowing);
        
        // If we are on a profile page, refresh the stats and followed list
        if (window.location.pathname.includes('profile.html')) {
            loadFollowedUsers();
            // Also update the following count on the current page if it's our profile
            const currentUser = JSON.parse(localStorage.getItem('user_data'));
            const urlParams = new URLSearchParams(window.location.search);
            const userIdParam = urlParams.get('id');
            if (!userIdParam || userIdParam == currentUser.id) {
                const countEl = document.getElementById('profile-following-count');
                if (countEl) {
                    let count = parseInt(countEl.innerText) || 0;
                    countEl.innerText = !isFollowing ? count + 1 : Math.max(0, count - 1);
                }
            } else {
                // If we are on someone else's profile, update THEIR follower count
                const countEl = document.getElementById('profile-follower-count');
                if (countEl) {
                    let count = parseInt(countEl.innerText) || 0;
                    countEl.innerText = !isFollowing ? count + 1 : Math.max(0, count - 1);
                }
            }
        }
    } catch (e) {
        alert('Thao tác thất bại: ' + e.message);
    }
}
window.toggleFollow = toggleFollow;
async function deletePost(postId) {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.')) return;

    try {
        await apiFetch(`/posts/${postId}/`, { method: 'DELETE' });
        const card = document.getElementById(`post-card-${postId}`);
        if (card) {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
            setTimeout(() => card.remove(), 500);
        }
        alert('Đã xóa bài viết thành công.');
    } catch (err) {
        alert('Lỗi khi xóa bài viết: ' + err.message);
    }
}
window.deletePost = deletePost;

function editPost(postId) {
    window.location.href = `dangbai.html?edit=${postId}`;
}
window.editPost = editPost;
