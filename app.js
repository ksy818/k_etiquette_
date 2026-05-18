// Initialize Lucide icons
lucide.createIcons();

// --- State Management ---
let state = {
    currentView: 'view-home',
    bookmarks: JSON.parse(localStorage.getItem('kEtiquetteBookmarks')) || [],
    currentEtiquette: null,
    currentLanguage: localStorage.getItem('kEtiquetteLang') || 'ko',
    quizScore: 0,
    currentQuizIndex: 0,
    quizFinished: false,
    memos: JSON.parse(localStorage.getItem('kEtiquetteMemos')) || {},
    quizStats: JSON.parse(localStorage.getItem('kEtiquetteQuizStats')) || { categories: {} },
    notifEnabled: localStorage.getItem('kEtiquetteNotif') === 'true',
    currentTipIndex: 0
};

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
const categoryGrid = document.getElementById('category-grid');
const categoryEtiquetteList = document.getElementById('category-etiquette-list');
const categoryTitle = document.getElementById('category-title');
const backFromCategoryBtn = document.getElementById('back-from-category');

const searchInput = document.getElementById('search-input');
const searchResultsList = document.getElementById('search-results-list');
const emptySearch = document.getElementById('empty-search');

const bookmarksList = document.getElementById('bookmarks-list');
const emptyBookmarks = document.getElementById('empty-bookmarks');

const quizContainer = document.getElementById('quiz-container');

// Settings & Memo Elements
const notifToggle = document.getElementById('notif-toggle');
const memoContainer = document.getElementById('memo-container');
const memoInput = document.getElementById('memo-input');
const memoSaveBtn = document.getElementById('memo-save-btn');
const memoStatus = document.getElementById('memo-status');

// Modal Elements
const modalOverlay = document.getElementById('detail-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalDos = document.getElementById('modal-dos');
const modalDonts = document.getElementById('modal-donts');
const modalBookmarkBtn = document.getElementById('modal-bookmark-btn');

// Language Menu Elements
const settingsBtn = document.getElementById('settings-btn');
const langMenu = document.getElementById('lang-menu');
const langBtns = document.querySelectorAll('.lang-btn');

// --- Initialization ---
function init() {
    state.currentTipIndex = Math.floor(Math.random() * quickTips.length);
    updateLanguageUI();
    setupEventListeners();
    registerServiceWorker();
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }
}

// --- Language Functions ---
function updateLanguageUI() {
    const texts = uiTranslations[state.currentLanguage];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) {
            if (el.getAttribute('data-html') === 'true') {
                el.innerHTML = texts[key];
            } else {
                el.textContent = texts[key];
            }
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[key]) {
            el.placeholder = texts[key];
        }
    });

    // Update random quick tip
    const tipEl = document.getElementById('quick-tip-text');
    if (tipEl && quickTips[state.currentTipIndex]) {
        tipEl.textContent = quickTips[state.currentTipIndex][state.currentLanguage];
    }

    langBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === state.currentLanguage) {
            btn.classList.add('active');
        }
    });

    // Re-render lists
    renderCategories();
    
    if (state.currentView === 'view-category' && categoryTitle.dataset.categoryId) {
        const catId = categoryTitle.dataset.categoryId;
        const cat = categories.find(c => c.id === catId);
        openCategory(cat);
    } else if (state.currentView === 'view-bookmarks') {
        renderBookmarks();
    } else if (state.currentView === 'view-search') {
        handleSearch({ target: searchInput });
    } else if (state.currentView === 'view-quiz') {
        renderQuiz();
    }
}

function changeLanguage(lang) {
    state.currentLanguage = lang;
    localStorage.setItem('kEtiquetteLang', lang);
    updateLanguageUI();
    langMenu.classList.add('hidden');
}

// --- Navigation ---
function switchView(viewId) {
    views.forEach(v => {
        v.classList.remove('active');
        if (v.id === viewId) v.classList.add('active');
    });

    navItems.forEach(nav => {
        nav.classList.remove('active');
        if (nav.dataset.target === viewId) nav.classList.add('active');
    });

    state.currentView = viewId;

    if (viewId === 'view-bookmarks') {
        renderBookmarks();
    } else if (viewId === 'view-quiz') {
        if (!state.quizFinished) {
            renderQuiz();
        } else {
            renderQuizResult();
        }
    }
}

// --- Render Functions ---
function renderCategories() {
    categoryGrid.innerHTML = '';
    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="category-icon-wrapper ${cat.color}">
                <i data-lucide="${cat.icon}"></i>
            </div>
            <h4>${cat.name[state.currentLanguage]}</h4>
        `;
        card.addEventListener('click', () => openCategory(cat));
        categoryGrid.appendChild(card);
    });
    lucide.createIcons();
}

function openCategory(category) {
    categoryTitle.textContent = category.name[state.currentLanguage];
    categoryTitle.dataset.categoryId = category.id;
    const catEtiquettes = etiquettes.filter(e => e.categoryId === category.id);
    
    categoryEtiquetteList.innerHTML = '';
    catEtiquettes.forEach(e => {
        categoryEtiquetteList.appendChild(createEtiquetteItem(e));
    });
    
    lucide.createIcons();
    switchView('view-category');
}

function createEtiquetteItem(item) {
    const el = document.createElement('div');
    el.className = 'etiquette-item';
    
    el.innerHTML = `
        <div class="etiquette-item-icon">
            <i data-lucide="${item.icon}"></i>
        </div>
        <div class="etiquette-item-content">
            <h4>${item.title[state.currentLanguage]}</h4>
            <p>${item.description[state.currentLanguage]}</p>
        </div>
        <div class="etiquette-item-action">
            <i data-lucide="chevron-right"></i>
        </div>
    `;
    
    el.addEventListener('click', () => openModal(item));
    return el;
}

// --- Modal Functions ---
function openModal(item) {
    state.currentEtiquette = item;
    modalTitle.textContent = item.title[state.currentLanguage];
    modalDescription.textContent = item.description[state.currentLanguage];
    
    modalDos.innerHTML = item.dos[state.currentLanguage].map(d => `<li>${d}</li>`).join('');
    modalDonts.innerHTML = item.donts[state.currentLanguage].map(d => `<li>${d}</li>`).join('');
    
    updateModalBookmarkBtn();
    
    // Memo
    memoInput.value = state.memos[item.id] || '';
    memoContainer.classList.remove('hidden');
    memoStatus.classList.add('hidden');
    
    modalOverlay.classList.add('active');
    lucide.createIcons();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    setTimeout(() => { state.currentEtiquette = null; }, 300); // wait for animation
}

function updateModalBookmarkBtn() {
    if (!state.currentEtiquette) return;
    const isBookmarked = state.bookmarks.includes(state.currentEtiquette.id);
    
    if (isBookmarked) {
        modalBookmarkBtn.classList.add('active');
        modalBookmarkBtn.innerHTML = `<i data-lucide="bookmark-check" style="fill: currentColor;"></i>`;
    } else {
        modalBookmarkBtn.classList.remove('active');
        modalBookmarkBtn.innerHTML = `<i data-lucide="bookmark"></i>`;
    }
    lucide.createIcons();
}

function toggleBookmark() {
    if (!state.currentEtiquette) return;
    const id = state.currentEtiquette.id;
    const index = state.bookmarks.indexOf(id);
    
    if (index > -1) {
        state.bookmarks.splice(index, 1);
    } else {
        state.bookmarks.push(id);
    }
    
    localStorage.setItem('kEtiquetteBookmarks', JSON.stringify(state.bookmarks));
    updateModalBookmarkBtn();
    
    if (state.currentView === 'view-bookmarks') {
        renderBookmarks();
    }
}

// --- Bookmarks Functions ---
function renderBookmarks() {
    bookmarksList.innerHTML = '';
    
    if (state.bookmarks.length === 0) {
        bookmarksList.classList.add('hidden');
        emptyBookmarks.classList.remove('hidden');
    } else {
        bookmarksList.classList.remove('hidden');
        emptyBookmarks.classList.add('hidden');
        
        const bookmarkedItems = etiquettes.filter(e => state.bookmarks.includes(e.id));
        bookmarkedItems.forEach(item => {
            bookmarksList.appendChild(createEtiquetteItem(item));
        });
        lucide.createIcons();
    }
}

// --- Memo Function ---
function saveMemo() {
    if (!state.currentEtiquette) return;
    const memoText = memoInput.value.trim();
    if (memoText) {
        state.memos[state.currentEtiquette.id] = memoText;
    } else {
        delete state.memos[state.currentEtiquette.id];
    }
    localStorage.setItem('kEtiquetteMemos', JSON.stringify(state.memos));
    
    memoStatus.classList.remove('hidden');
    setTimeout(() => {
        memoStatus.classList.add('hidden');
    }, 2000);
}

// --- Quiz Functions ---
function renderQuiz() {
    if (state.quizFinished) {
        renderQuizResult();
        return;
    }

    const quiz = quizzes[state.currentQuizIndex];
    const lang = state.currentLanguage;

    quizContainer.innerHTML = `
        <div class="quiz-card">
            <div class="quiz-progress">Question ${state.currentQuizIndex + 1} / ${quizzes.length}</div>
            <h3 class="quiz-question">${quiz.question[lang]}</h3>
            <div class="quiz-options">
                ${quiz.options[lang].map((opt, index) => `
                    <button class="quiz-option-btn" data-index="${index}">${opt}</button>
                `).join('')}
            </div>
        </div>
    `;

    document.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedIndex = parseInt(e.currentTarget.dataset.index, 10);
            const allBtns = document.querySelectorAll('.quiz-option-btn');
            
            // Disable buttons
            allBtns.forEach(b => b.disabled = true);
            
            const isCorrect = (selectedIndex === quiz.answerIndex);
            
            // Highlight
            if (isCorrect) {
                e.currentTarget.classList.add('correct');
            } else {
                e.currentTarget.classList.add('incorrect');
                allBtns[quiz.answerIndex].classList.add('correct');
            }
            
            // Track stats
            if (!state.quizStats.categories[quiz.categoryId]) {
                state.quizStats.categories[quiz.categoryId] = { correct: 0, total: 0 };
            }
            state.quizStats.categories[quiz.categoryId].total++;
            if (isCorrect) {
                state.quizScore++;
                state.quizStats.categories[quiz.categoryId].correct++;
            }
            localStorage.setItem('kEtiquetteQuizStats', JSON.stringify(state.quizStats));
            
            // Show Feedback
            const texts = uiTranslations[lang];
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = `quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;
            feedbackDiv.innerHTML = `
                <div class="feedback-title">
                    <i data-lucide="${isCorrect ? 'check-circle-2' : 'x-circle'}"></i> 
                    ${isCorrect ? texts.quizCorrect : texts.quizIncorrect}
                </div>
                <div class="feedback-explanation">${quiz.explanation[lang]}</div>
                <button class="primary-btn mt-4" id="next-quiz-btn" style="width: 100%;">
                    ${texts.quizNext} <i data-lucide="arrow-right"></i>
                </button>
            `;
            
            const quizCard = document.querySelector('.quiz-card');
            quizCard.appendChild(feedbackDiv);
            lucide.createIcons();
            
            document.getElementById('next-quiz-btn').addEventListener('click', () => {
                state.currentQuizIndex++;
                if (state.currentQuizIndex >= quizzes.length) {
                    state.quizFinished = true;
                    renderQuizResult();
                } else {
                    renderQuiz();
                }
            });
        });
    });
}

function renderQuizResult() {
    const lang = state.currentLanguage;
    const texts = uiTranslations[lang];

    let statsHtml = `<div style="margin-top: 1rem; width: 100%; text-align: left; background: var(--bg-main); padding: 1.25rem; border-radius: var(--radius-md);">`;
    statsHtml += `<h4 style="margin-bottom: 0.75rem; color: var(--text-main); font-size: 1rem;">${texts.categoryAccuracy}</h4>`;
    
    const catStats = state.quizStats.categories;
    for (const [catId, stat] of Object.entries(catStats)) {
        if (stat.total > 0) {
            const catInfo = categories.find(c => c.id === catId);
            const catName = catInfo ? catInfo.name[lang] : catId;
            const percent = Math.round((stat.correct / stat.total) * 100);
            statsHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; font-size: 0.95rem;">
                <span>${catName}</span>
                <strong style="color: var(--primary-color);">${percent}%</strong>
            </div>`;
        }
    }
    statsHtml += '</div>';

    quizContainer.innerHTML = `
        <div class="quiz-result-card">
            <i data-lucide="award" class="quiz-result-icon"></i>
            <h3>${texts.quizResult}: ${state.quizScore} / ${quizzes.length}</h3>
            ${statsHtml}
            <button class="primary-btn mt-4" id="retry-quiz-btn">
                <i data-lucide="rotate-ccw"></i> ${texts.quizRetry}
            </button>
        </div>
    `;
    lucide.createIcons();

    document.getElementById('retry-quiz-btn').addEventListener('click', () => {
        state.quizScore = 0;
        state.currentQuizIndex = 0;
        state.quizFinished = false;
        renderQuiz();
    });
}

// --- Search Functions ---
function handleSearch(e) {
    const query = (e.target.value || '').toLowerCase().trim();
    
    if (query === '') {
        switchView('view-home');
        return;
    }
    
    const results = etiquettes.filter(item => {
        const lang = state.currentLanguage;
        return item.title[lang].toLowerCase().includes(query) || 
               item.description[lang].toLowerCase().includes(query) ||
               item.dos[lang].some(d => d.toLowerCase().includes(query)) ||
               item.donts[lang].some(d => d.toLowerCase().includes(query));
    });
    
    searchResultsList.innerHTML = '';
    
    if (results.length === 0) {
        searchResultsList.classList.add('hidden');
        emptySearch.classList.remove('hidden');
    } else {
        searchResultsList.classList.remove('hidden');
        emptySearch.classList.add('hidden');
        
        results.forEach(item => {
            searchResultsList.appendChild(createEtiquetteItem(item));
        });
        lucide.createIcons();
    }
    
    switchView('view-search');
}

// --- Chatbot Functions ---
const chatbotFab = document.getElementById('chatbot-fab');
const chatbotWindow = document.getElementById('chatbot-window');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

function toggleChat() {
    chatbotWindow.classList.toggle('active');
    if(chatbotWindow.classList.contains('active')) {
        chatbotFab.style.transform = 'scale(0)';
        chatbotFab.style.pointerEvents = 'none';
        
        // Add initial greeting based on language
        if(chatMessages.children.length === 0) {
            const greetings = {
                ko: "안녕하세요! 한국 예절이나 문화에 대해 헷갈리는 점이 있다면 무엇이든 물어보세요! 😊",
                en: "Hello! Ask me anything you're curious about regarding Korean etiquette or culture! 😊",
                ja: "こんにちは！韓国のマナーや文化について分からないことがあれば何でも聞いてください！😊",
                zh: "你好！如果你对韩国的礼仪或文化有任何疑问，请随时问我！😊"
            };
            appendChatMessage(greetings[state.currentLanguage], 'bot');
        }
        
        setTimeout(() => chatInput.focus(), 300);
    } else {
        chatbotFab.style.transform = 'scale(1)';
        chatbotFab.style.pointerEvents = 'all';
    }
}

function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    appendChatMessage(text, 'user');
    chatInput.value = '';
    
    setTimeout(() => {
        let response = "";
        const lang = state.currentLanguage;
        const query = text.toLowerCase();
        
        const results = etiquettes.filter(item => {
            return item.title[lang].toLowerCase().includes(query) || 
                   item.description[lang].toLowerCase().includes(query) ||
                   item.dos[lang].some(d => d.toLowerCase().includes(query)) ||
                   item.donts[lang].some(d => d.toLowerCase().includes(query));
        });

        if (results.length > 0) {
            const item = results[0];
            const doList = item.dos[lang].map(d => `✅ ${d}`).join('\n');
            const dontList = item.donts[lang].map(d => `❌ ${d}`).join('\n');
            response = `[${item.title[lang]}]\n${item.description[lang]}\n\n${doList}\n\n${dontList}`;
        } else {
            const fallbacks = {
                ko: "해당 내용에 대해서는 아직 정보가 없어요. 다른 키워드로 질문해 주시겠어요? 😊",
                en: "I couldn't find information on that. Could you try different keywords? 😊",
                ja: "その内容についてはまだ情報がありません。別のキーワードで質問していただけますか？ 😊",
                zh: "还没有关于这方面的信息。请尝试其他关键词好吗？ 😊",
                vi: "Tôi chưa có thông tin về vấn đề này. Bạn có thể thử với từ khóa khác được không? 😊"
            };
            response = fallbacks[lang] || fallbacks['en'];
        }
        
        appendChatMessage(response, 'bot');
    }, 600);
}

function appendChatMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    navItems.forEach(nav => {
        nav.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            searchInput.value = ''; 
            switchView(target);
        });
    });

    backFromCategoryBtn.addEventListener('click', () => switchView('view-home'));
    
    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    
    modalBookmarkBtn.addEventListener('click', toggleBookmark);
    searchInput.addEventListener('input', handleSearch);

    // Settings / Language
    settingsBtn.addEventListener('click', () => {
        langMenu.classList.toggle('hidden');
    });

    // Close lang menu if clicking outside
    document.addEventListener('click', (e) => {
        if(!settingsBtn.contains(e.target) && !langMenu.contains(e.target)) {
            langMenu.classList.add('hidden');
        }
    });

    langBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            changeLanguage(e.currentTarget.dataset.lang);
        });
    });

    // Notif Toggle
    notifToggle.checked = state.notifEnabled;
    notifToggle.addEventListener('change', (e) => {
        state.notifEnabled = e.target.checked;
        localStorage.setItem('kEtiquetteNotif', state.notifEnabled);
    });

    // Memo Save
    memoSaveBtn.addEventListener('click', saveMemo);

    // Chatbot
    chatbotFab.addEventListener('click', toggleChat);
    closeChatBtn.addEventListener('click', toggleChat);
    sendChatBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
}

// Boot up
document.addEventListener('DOMContentLoaded', init);
