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

            // Admin Actions
            if (userData.role_name === 'Admin') {
                // Add Admin Dashboard Link in sidebar if not exists
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
                    sidebarMenu.appendChild(li);
                }

                // Add to dropdown as well
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
                    if (data.user.role === 'Admin') window.location.href = 'admin.html';
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
        <div class="post-content">
            <p>${post.title}</p>
            <div class="post-image-placeholder">
                <img src="${post.thumbnail || 'https://picsum.photos/seed/food/800/600'}" alt="${post.title}" class="post-img" style="cursor:pointer;" onclick="window.location.href='chitiet.html?id=${post.post_id}'">
            </div>
        </div>
        <div class="post-footer">
            <div class="post-stats">
                <div class="stat-left" onclick="toggleFavorite(${post.post_id})">
                    <span class="like-icons"><i class="far fa-thumbs-up"></i></span>
                    <span class="stat-text">Yêu thích</span>
                </div>
                <div class="stat-right">
                    <button class="btn-view-recipe" onclick="window.location.href='chitiet.html?id=${post.post_id}'">Xem chi tiết</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

async function loadPostDetail(id) {
    const container = document.getElementById('post-detail-container');
    if (!container) return;

    try {
        const post = await apiFetch(`/posts/${id}/`);
        if (post) {
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
                    <div class="recipe-steps">${post.recipe ? post.recipe.split('\n').filter(r => r.trim()).map((r, i) => `<div class="recipe-step"><div class="step-num">${i + 1}</div><p>${r}</p></div>`).join('') : 'Đang cập nhật...'}</div>
                </div>`;
        }
    } catch (err) { container.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Lỗi tải dữ liệu.</div>'; }
}

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
    try {
        const stats = await apiFetch('/admin/stats/');
        if (stats) {
            const usersEl = document.getElementById('stat-total-users');
            const postsEl = document.getElementById('stat-total-posts');
            const reportsEl = document.getElementById('stat-total-reports');
            
            if (usersEl) usersEl.innerText = stats.total_users.toLocaleString();
            if (postsEl) postsEl.innerText = stats.total_posts.toLocaleString();
            if (reportsEl) reportsEl.innerText = stats.total_reports.toLocaleString();
        }
    } catch (e) {
        console.error('Failed to load admin stats', e);
    }
}

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
