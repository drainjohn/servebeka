document.addEventListener('DOMContentLoaded', () => {
    const passwordModal = document.getElementById('passwordModal');
    const submitPasswordBtn = document.getElementById('submitPassword');
    const passwordInput = document.getElementById('goddessPassword');
    const passwordError = document.getElementById('passwordError');
    const appContainer = document.querySelector('.app');
    const rtDb = firebase.database();
    let correctPassword = '';

    // Cookie handling functions
    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    // Check for existing login cookie
    const loginToken = getCookie('goddessLogin');
    if (loginToken === 'authenticated') {
        console.log('Cookie found, bypassing modal');
        passwordModal.style.display = 'none';
        appContainer.classList.remove('hidden');
        enableContextMenus();
        loadGoddessData({ uid: 'goddess' });
    } else {
        // Show modal and hide app if no valid cookie
        passwordModal.style.display = 'flex';
        appContainer.classList.add('hidden');
        console.log('No valid cookie, showing modal');
    }

    // Disable context menu and dev tools
    function disableContextMenus() {
        document.body.style.userSelect = 'none';
        document.body.style.pointerEvents = 'none';
        passwordModal.style.pointerEvents = 'auto';
        document.addEventListener('contextmenu', preventContextMenu);
        document.addEventListener('keydown', preventDevTools);
    }

    function enableContextMenus() {
        document.body.style.userSelect = '';
        document.body.style.pointerEvents = '';
        document.removeEventListener('contextmenu', preventContextMenu);
        document.removeEventListener('keydown', preventDevTools);
    }

    function preventContextMenu(e) {
        e.preventDefault();
    }

    function preventDevTools(e) {
        if ((e.key === 'F12') ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
        }
    }

    // Fetch password and lock page if modal is shown
    rtDb.ref('goddess/password').once('value', snap => {
        correctPassword = snap.val() || 'defaultPassword';
        console.log('Password fetched:', correctPassword);
        if (passwordModal.style.display === 'flex') {
            disableContextMenus();
            passwordInput.focus();
        }
    }).catch(err => {
        console.error('Error fetching password:', err);
        showError('Failed to load security settings');
        passwordModal.style.display = 'flex';
    });

    // Handle password submission
    submitPasswordBtn.addEventListener('click', verifyPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPassword();
    });

    function verifyPassword() {
        const enteredPassword = passwordInput.value.trim();
        if (enteredPassword === correctPassword) {
            console.log('Password correct, setting cookie and unlocking');
            setCookie('goddessLogin', 'authenticated', 7); // Cookie lasts 7 days
            passwordModal.style.display = 'none';
            appContainer.classList.remove('hidden');
            enableContextMenus();
            loadGoddessData({ uid: 'goddess' });
        } else {
            console.log('Incorrect password');
            passwordError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // Load app content
    function loadGoddessData(user) {
        console.log('Loading app content');
        loadOverview();
        loadSlaves();
        loadManagement();
        loadCommunication(user.uid);
        loadAnalytics();
        populateSlaveDropdowns();
        updateSecondarySidebar('overview');
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        console.log('Logging out, clearing cookie');
        deleteCookie('goddessLogin');
        passwordModal.style.display = 'flex';
        appContainer.classList.add('hidden');
        passwordInput.value = '';
        passwordError.style.display = 'none';
        disableContextMenus();
    });

    // Safety check for overlaps
    setTimeout(() => {
        if (passwordModal.style.display === 'flex' && getCookie('goddessLogin') !== 'authenticated') {
            console.warn('Modal still visible after 5s, enforcing visibility');
            appContainer.classList.add('hidden');
        }
    }, 5000);
});

// Utility Functions
function showError(message) {
    const popup = document.getElementById('errorPopup');
    document.getElementById('errorMessage').innerText = message;
    popup.style.display = 'flex';
    setTimeout(() => popup.style.display = 'none', 5000);
}

function hideError() {
    document.getElementById('errorPopup').style.display = 'none';
}

function showNotification(message) {
    const notifs = document.getElementById('notifications');
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerText = message;
    notifs.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Navigation Structure
const sections = {
    overview: { secondary: [], content: 'overview' },
    slaves: {
        secondary: [
            { id: 'pending', label: 'Pending', content: 'pendingRequests' },
            { id: 'active', label: 'Active', content: 'activeSlaves' },
            { id: 'blocked', label: 'Blocked', content: 'blockedSlaves' }
        ],
        content: 'slaves'
    },
    management: {
        secondary: [
            { id: 'tasks', label: 'Tasks', content: 'tasks' },
            { id: 'rewards', label: 'Rewards', content: 'rewards' },
            { id: 'training', label: 'Training', content: 'training' },
            { id: 'marketplace', label: 'Marketplace', content: 'marketplace' },
            { id: 'events', label: 'Events', content: 'events' }
        ],
        content: 'management'
    },
    communication: {
        secondary: [
            { id: 'chat', label: 'Chat', content: 'chat' },
            { id: 'groupChat', label: 'Group Chat', content: 'groupChat' },
            { id: 'commands', label: 'Commands', content: 'commands' },
            { id: 'announcements', label: 'Announcements', content: 'announcements' }
        ],
        content: 'communication'
    },
    analytics: { secondary: [], content: 'analytics' }
};

// Navigation Logic
function updateSecondarySidebar(section) {
    const sidebar = document.getElementById('secondarySidebar');
    if (!sidebar) {
        console.error('Secondary sidebar not found');
        return;
    }
    sidebar.innerHTML = '<div class="secondary-nav"></div>';
    const nav = sidebar.querySelector('.secondary-nav');
    sections[section].secondary.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'secondary-btn';
        btn.dataset.tab = item.id;
        btn.innerText = item.label;
        btn.addEventListener('click', () => {
            nav.querySelectorAll('.secondary-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateContent(section, item.content);
        });
        nav.appendChild(btn);
    });
    if (sections[section].secondary.length > 0) {
        nav.children[0].classList.add('active');
        updateContent(section, sections[section].secondary[0].content);
    } else {
        updateContent(section, sections[section].content);
    }
}

function updateContent(section, contentId) {
    const sectionEl = document.getElementById(section);
    if (!sectionEl) {
        console.error(`Section ${section} not found`);
        return;
    }
    const contentEls = sectionEl.querySelectorAll('.tab-content');
    contentEls.forEach(el => {
        el.style.display = el.id === contentId ? 'block' : 'none';
        console.log(`Toggling ${el.id} to ${el.style.display}`); // Debug visibility
    });
    sectionEl.style.display = 'block'; // Ensure the section itself is visible
    Object.keys(sections).forEach(s => {
        if (s !== section) document.getElementById(s).style.display = 'none';
    });
}

// Corrected Navigation Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    Object.keys(sections).forEach(section => {
        const btn = document.getElementById(`${section}Btn`);
        if (btn) {
            btn.addEventListener('click', () => {
                Object.keys(sections).forEach(s => {
                    document.getElementById(s).style.display = s === section ? 'block' : 'none';
                    document.getElementById(`${s}Btn`).classList.toggle('active', s === section);
                });
                updateSecondarySidebar(section);
            });
        } else {
            console.error(`Button ${section}Btn not found`);
        }
    });
    // Default to slaves section for testing
    document.getElementById('slavesBtn')?.click();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    firebase.auth().signOut().then(() => window.location.href = '../../Platform/index.html');
});

// Load Data
function loadGoddessData(user) {
    loadOverview();
    loadSlaves();
    loadManagement();
    loadCommunication(user.uid);
    loadAnalytics();
    populateSlaveDropdowns();
    updateSecondarySidebar('overview'); // Default to overview on load
}

// Overview
// Overview
function loadOverview() {
    const db = firebase.firestore();
    const overviewSection = document.getElementById('overview');

    // Add additional containers dynamically if not present
    if (!overviewSection.querySelector('.recent-activity')) {
        overviewSection.innerHTML += `
            <div class="recent-activity">
                <h3>Recent Activity</h3>
                <div id="activityLog"></div>
            </div>
            <div class="performance-trends">
                <h3>Performance Trends</h3>
                <div id="trendFilters" class="form">
                    <select id="trendMetric">
                        <option value="points">Points</option>
                        <option value="tasks">Tasks Completed</option>
                        <option value="streak">Streak</option>
                    </select>
                    <select id="trendPeriod">
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>
                </div>
                <canvas id="trendChart"></canvas>
            </div>
            <div class="custom-widgets">
                <h3>Custom Widgets</h3>
                <div id="widgetGrid" class="card-grid"></div>
                <button id="addWidgetBtn" class="btn">Add Widget</button>
            </div>
        `;
    }

    // Quick Stats Updates
    db.collection('slaves').where('allowed', '==', true).onSnapshot(snap => {
        document.getElementById('activeSlaves').innerText = snap.size;
        document.getElementById('slaveCount').innerText = snap.size;
    });
    db.collection('slaves').where('request', '==', 'pending').onSnapshot(snap => {
        document.getElementById('pendingCount').innerText = snap.size;
    });
    db.collection('rewards').onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => total += doc.data().points || 0);
        document.getElementById('totalPoints').innerText = total;
        document.getElementById('totalPointsCard').innerText = total;
    });
    db.collection('tasks').where('completed', '==', true).onSnapshot(snap => {
        document.getElementById('tasksCompleted').innerText = snap.size;
        document.getElementById('taskCount').innerText = snap.size;
    });

    // Enhanced Charts
    const pointsChart = new Chart(document.getElementById('pointsChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Points Over Time',
                data: [],
                borderColor: '#7289da',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(114, 137, 218, 0.2)'
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Points', color: '#dcddde' } },
                x: { title: { display: true, text: 'Date', color: '#dcddde' } }
            },
            plugins: {
                legend: { labels: { color: '#dcddde' } },
                tooltip: { mode: 'index', intersect: false }
            },
            responsive: true
        }
    });

    const taskChart = new Chart(document.getElementById('taskChart'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Tasks Completed',
                data: [],
                backgroundColor: '#7289da',
                borderColor: '#5865f2',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Tasks', color: '#dcddde' } },
                x: { title: { display: true, text: 'Slave', color: '#dcddde' } }
            },
            plugins: { legend: { labels: { color: '#dcddde' } } },
            responsive: true
        }
    });

    // Populate Charts with Data
    db.collection('rewards').orderBy('timestamp', 'desc').limit(50).onSnapshot(snap => {
        const data = snap.docs.map(doc => ({
            timestamp: doc.data().timestamp?.toDate(),
            points: doc.data().points || 0
        }));
        pointsChart.data.labels = data.map(d => d.timestamp ? new Date(d.timestamp).toLocaleDateString() : 'Unknown');
        pointsChart.data.datasets[0].data = data.map(d => d.points);
        pointsChart.update();
    });

    db.collection('tasks').where('completed', '==', true).onSnapshot(snap => {
        const data = snap.docs.map(doc => doc.data().slaveId);
        const counts = data.reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {});
        db.collection('slaves').get().then(slaveSnap => {
            const slaveMap = Object.fromEntries(slaveSnap.docs.map(doc => [doc.id, doc.data().username]));
            taskChart.data.labels = Object.keys(counts).map(id => slaveMap[id] || id.slice(0, 5));
            taskChart.data.datasets[0].data = Object.values(counts);
            taskChart.update();
        });
    });

    // Leaderboard with More Details
    db.collection('rewards').orderBy('points', 'desc').limit(5).onSnapshot(snap => {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '<h4>Top Performers</h4>';
        snap.forEach(doc => {
            db.collection('slaves').doc(doc.id).get().then(slaveDoc => {
                if (slaveDoc.exists) {
                    const slave = slaveDoc.data();
                    const item = document.createElement('div');
                    item.className = 'item';
                    item.innerHTML = `
                        <span>${slave.username}</span>
                        <span>${doc.data().points} pts | Streak: ${slave.streak || 0}</span>
                        <button class="btn" onclick="viewSlave('${doc.id}')">View</button>
                    `;
                    leaderboardList.appendChild(item);
                }
            });
        });
    });

    // Recent Activity Log
    const activityLog = document.getElementById('activityLog');
    const activitySources = [
        db.collection('tasks').orderBy('timestamp', 'desc').limit(10),
        db.collection('rewards').orderBy('timestamp', 'desc').limit(10),
        db.collection('events').orderBy('timestamp', 'desc').limit(10)
    ];
    activitySources.forEach(source => {
        source.onSnapshot(snap => {
            snap.docChanges().forEach(change => {
                const data = change.doc.data();
                const timestamp = data.timestamp?.toDate() || new Date();
                const type = change.doc.ref.path.split('/')[0];
                let message = '';
                if (type === 'tasks') message = `${data.title} ${data.completed ? 'completed' : 'assigned'} for ${data.points} pts`;
                if (type === 'rewards') message = `${data.points} pts awarded (${data.type})`;
                if (type === 'events') message = `Event "${data.title}" ${change.type === 'added' ? 'created' : 'updated'}`;
                const logItem = document.createElement('div');
                logItem.className = 'item';
                logItem.innerHTML = `<span>${message}</span><span>${timestamp.toLocaleString()}</span>`;
                activityLog.prepend(logItem);
                if (activityLog.children.length > 20) activityLog.removeChild(activityLog.lastChild);
            });
        });
    });

    // Performance Trends Chart
    const trendChart = new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Trend', data: [], borderColor: '#43b581', tension: 0.1, fill: true, backgroundColor: 'rgba(67, 181, 129, 0.2)' }] },
        options: {
            scales: { y: { beginAtZero: true }, x: { title: { display: true, text: 'Date', color: '#dcddde' } } },
            plugins: { legend: { labels: { color: '#dcddde' } } },
            responsive: true
        }
    });

    function updateTrendChart(metric, period) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - parseInt(period));
        let collection = metric === 'points' ? 'rewards' : metric === 'tasks' ? 'tasks' : 'slaves';
        let field = metric === 'points' ? 'points' : metric === 'tasks' ? 'completed' : 'streak';
        db.collection(collection).where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(cutoff)).onSnapshot(snap => {
            const data = snap.docs.map(doc => ({
                timestamp: doc.data().timestamp?.toDate() || new Date(),
                value: metric === 'tasks' ? (doc.data().completed ? 1 : 0) : (doc.data()[field] || 0)
            }));
            const grouped = data.reduce((acc, d) => {
                const date = d.timestamp.toLocaleDateString();
                acc[date] = (acc[date] || 0) + d.value;
                return acc;
            }, {});
            trendChart.data.labels = Object.keys(grouped).sort();
            trendChart.data.datasets[0].data = Object.values(grouped);
            trendChart.data.datasets[0].label = `${metric.charAt(0).toUpperCase() + metric.slice(1)} (Last ${period} Days)`;
            trendChart.options.scales.y.title.text = metric === 'tasks' ? 'Tasks Completed' : metric.charAt(0).toUpperCase() + metric.slice(1);
            trendChart.update();
        });
    }

    document.getElementById('trendMetric').addEventListener('change', (e) => updateTrendChart(e.target.value, document.getElementById('trendPeriod').value));
    document.getElementById('trendPeriod').addEventListener('change', (e) => updateTrendChart(document.getElementById('trendMetric').value, e.target.value));
    updateTrendChart('points', '7'); // Default

    // Custom Widgets
    const widgetGrid = document.getElementById('widgetGrid');
    const widgetTypes = {
        'top-slave': () => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = '<span>Top Slave</span><span id="widgetTopSlave">Loading...</span>';
            db.collection('rewards').orderBy('points', 'desc').limit(1).onSnapshot(snap => {
                if (snap.size) {
                    db.collection('slaves').doc(snap.docs[0].id).get().then(doc => {
                        card.querySelector('#widgetTopSlave').innerText = `${doc.data().username} (${snap.docs[0].data().points} pts)`;
                    });
                }
            });
            return card;
        },
        'task-progress': () => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = '<span>Avg Task Progress</span><span id="widgetTaskProgress">Loading...</span>';
            db.collection('tasks').onSnapshot(snap => {
                const avg = snap.docs.reduce((acc, doc) => acc + (doc.data().progress || 0), 0) / (snap.size || 1);
                card.querySelector('#widgetTaskProgress').innerText = `${Math.round(avg)}%`;
            });
            return card;
        },
        'message-count': () => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = '<span>Messages Today</span><span id="widgetMessageCount">Loading...</span>';
            let count = 0;
            const today = new Date().setHours(0, 0, 0, 0);
            db.collection('slaves').where('allowed', '==', true).get().then(snap => {
                snap.forEach(doc => {
                    firebase.database().ref(`chats/${doc.id}/messages`).orderByChild('timestamp').startAt(today).on('value', msgSnap => {
                        count += msgSnap.val() ? Object.keys(msgSnap.val()).length : 0;
                        card.querySelector('#widgetMessageCount').innerText = count;
                    });
                });
            });
            return card;
        }
    };

    document.getElementById('addWidgetBtn').addEventListener('click', () => {
        const type = prompt('Enter widget type (top-slave, task-progress, message-count):');
        if (widgetTypes[type]) {
            const widget = widgetTypes[type]();
            widget.innerHTML += '<button class="btn logout" onclick="this.parentElement.remove()">Remove</button>';
            widgetGrid.appendChild(widget);
            showNotification(`Added ${type} widget`);
        } else {
            showError('Invalid widget type');
        }
    });

    // Load saved widgets (example, extend as needed)
    ['top-slave', 'task-progress'].forEach(type => widgetGrid.appendChild(widgetTypes[type]()));
}

// Slaves

function showSection(sectionId, subSection = 'pending') {
    document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
    document.getElementById(sectionId).style.display = 'block';

    // Update sidebar active state
    document.querySelectorAll('.sidebar .nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.sidebar .nav-item[onclick="showSection('${sectionId}', '${subSection}')"]`)?.classList.add('active');

    if (sectionId === 'management') loadManagement();
    if (sectionId === 'slaves') loadSlaves(subSection);
}

// Slaves
function loadSlaves() {
    const db = firebase.firestore();
    const pendingRequests = document.getElementById('pendingRequests');
    const activeSlavesNow = document.getElementById('activeSlavesNow');
    const blockedSlaves = document.getElementById('blockedSlaves');

    // Verify DOM elements exist
    if (!pendingRequests || !activeSlavesNow || !blockedSlaves) {
        console.error('One or more slave containers not found in DOM');
        return;
    }

    db.collection('slaves').onSnapshot(snap => {
        // Clear containers and add headers
        pendingRequests.innerHTML = '<h3>Pending Requests</h3>';
        activeSlavesNow.innerHTML = '<h3>Active Slaves</h3>';
        blockedSlaves.innerHTML = '<h3>Blocked Slaves</h3>';

        console.log(`Total slaves in snapshot: ${snap.size}`); // Debug log

        snap.forEach(doc => {
            const slave = doc.data();
            const slaveDiv = document.createElement('div');
            slaveDiv.className = 'item slave-item';
            slaveDiv.dataset.slaveId = doc.id;

            // Base slave info
            slaveDiv.innerHTML = `
                <span>${slave.username} (${slave.email}) - ${slave.streak || 0} days</span>
                <div class="slave-actions">
                    ${slave.request === 'pending' ? `
                        <button class="btn" onclick="approveSlave('${doc.id}')">Approve</button>
                        <button class="btn logout" onclick="blockSlave('${doc.id}')">Reject</button>
                    ` : ''}
                    ${slave.allowed && slave.request !== 'banned' && slave.request !== 'pending' ? `
                        <button class="btn" onclick="viewSlave('${doc.id}')">View</button>
                        <button class="btn" onclick="messageSlave('${doc.id}')">Message</button>
                        <button class="btn" onclick="rewardSlave('${doc.id}')">Reward</button>
                        <button class="btn" onclick="banSlave('${doc.id}')">Ban</button>
                        <button class="btn logout" onclick="removeSlave('${doc.id}')">Remove</button>
                    ` : ''}
                    ${slave.request === 'banned' ? `
                        <button class="btn" onclick="retrieveSlave('${doc.id}')">Retrieve</button>
                    ` : ''}
                </div>
            `;

            // Add click event for modal (excluding buttons)
            slaveDiv.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn')) {
                    viewSlave(doc.id);
                }
            });

            // Categorize slaves
            if (slave.request === 'pending') {
                console.log(`Appending ${slave.username} to Pending`);
                pendingRequests.appendChild(slaveDiv);
            } else if (slave.allowed && slave.request !== 'banned' && slave.request !== 'pending') {
                console.log(`Appending ${slave.username} to Active`);
                activeSlavesNow.appendChild(slaveDiv);
            } else if (slave.request === 'banned') {
                console.log(`Appending ${slave.username} to Blocked`);
                blockedSlaves.appendChild(slaveDiv);
            } else {
                console.log(`Uncategorized: ${slave.username}, allowed: ${slave.allowed}, request: ${slave.request}`);
            }
        });
    }, error => {
        console.error('Error fetching slaves:', error);
    });
}

// Action Functions (add these if not already present)
function messageSlave(slaveId) {
    document.getElementById('communicationBtn').click(); // Switch to Communication tab
    setTimeout(() => {
        const chatItem = document.querySelector(`.chat-item[data-slave-id="${slaveId}"]`);
        if (chatItem) chatItem.click();
    }, 100);
}

function rewardSlave(slaveId) {
    const points = prompt('Enter points to reward:');
    if (points && !isNaN(points)) {
        firebase.firestore().collection('rewards').doc(slaveId).set({
            points: parseInt(points),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(() => showNotification(`Awarded ${points} points`));
    }
}

function banSlave(slaveId) {
    firebase.firestore().collection('slaves').doc(slaveId).update({
        request: 'banned', // Match your existing field usage
        banDate: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => showNotification('Slave banned'));
}

function removeSlave(slaveId) {
    if (confirm('Are you sure you want to remove this slave?')) {
        firebase.firestore().collection('slaves').doc(slaveId).delete()
            .then(() => showNotification('Slave removed'));
    }
}

function retrieveSlave(slaveId) {
    firebase.firestore().collection('slaves').doc(slaveId).update({
        request: 'approved', // Assuming 'approved' reverts to active status
        banDate: firebase.firestore.FieldValue.delete()
    }).then(() => showNotification('Slave retrieved'));
}

function approveSlave(uid) {
    firebase.firestore().collection('slaves').doc(uid).update({
        allowed: true,
        request: 'approved',
        level: 1,
        streak: 0,
        joinDate: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => showNotification('Slave approved'));
}

function blockSlave(uid) {
    firebase.firestore().collection('slaves').doc(uid).update({
        request: 'banned', // Changed to 'banned' for consistency
        allowed: false
    }).then(() => showNotification('Slave rejected'));
}

function retrieveSlave(uid) {
    firebase.firestore().collection('slaves').doc(uid).update({
        allowed: true,
        request: 'approved'
    }).then(() => showNotification('Slave retrieved'));
}

function viewSlave(slaveId) {
    const db = firebase.firestore();
    db.collection('slaves').doc(slaveId).get().then(doc => {
        if (doc.exists) {
            const slave = doc.data();
            showSlaveStatsModal(slaveId, slave);
        }
    });
}

// Placeholder for modal (add your existing showSlaveStatsModal if different)
function showSlaveStatsModal(slaveId, slave) {
    const modal = document.getElementById('slaveStatsModal');
    if (!modal) {
        console.error('Slave stats modal not found');
        return;
    }
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${slave.username}'s Stats</h2>
            <p>Level: ${slave.level || 1}</p>
            <p>Streak: ${slave.streak || 0} days</p>
            <button class="btn" onclick="closeSlaveStatsModal()">Close</button>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeSlaveStatsModal() {
    document.getElementById('slaveStatsModal').style.display = 'none';
}

function showNotification(message) {
    console.log(message); // Replace with your notification logic if available
}

function calculateActivityScore(tasks, messages, rewards) {
    return Math.round(tasks.filter(t => t.completed).length * 10 + messages.length * 5 + (rewards.points || 0) / 10);
}

// Management
function populateSlaveDropdowns() {
    const db = firebase.firestore();
    const taskSlave = document.getElementById('taskSlave');
    const rewardSlave = document.getElementById('rewardSlave');
    db.collection('slaves').where('allowed', '==', true).onSnapshot(snap => {
        taskSlave.innerHTML = '<option value="all">All Slaves</option>';
        rewardSlave.innerHTML = '<option value="">Select Slave</option>';
        snap.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.innerText = doc.data().username;
            taskSlave.appendChild(option.cloneNode(true));
            rewardSlave.appendChild(option.cloneNode(true));
        });
    });
}

function loadManagement() {
    const db = firebase.firestore();
    const storage = firebase.storage();

    // Toggle Form Visibility
    function toggleForm(formId, btnId) {
        const form = document.getElementById(formId);
        const btn = document.getElementById(btnId);
        // Remove existing listeners to prevent duplicates
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', () => {
            form.classList.toggle('hidden');
            form.style.maxHeight = form.classList.contains('hidden') ? '0' : `${form.scrollHeight}px`;
        });
    }

    toggleForm('taskForm', 'createTaskBtn');
    toggleForm('rewardForm', 'createRewardBtn');
    toggleForm('lessonForm', 'createLessonBtn');
    toggleForm('itemForm', 'createItemBtn');
    toggleForm('eventForm', 'createEventBtn');

    // Preview Modal
    function showPreview(title, content) {
        const modal = document.getElementById('previewModal');
        document.getElementById('previewTitle').innerText = title;
        document.getElementById('previewBody').innerHTML = content;
        modal.classList.remove('hidden');
    }

    document.getElementById('closePreview').addEventListener('click', () => {
        document.getElementById('previewModal').classList.add('hidden');
    });

    // Tasks - Fixed to prevent duplicate task creation
    const assignTaskBtn = document.getElementById('assignTask');
    // Remove existing listeners by cloning the button
    const newAssignTaskBtn = assignTaskBtn.cloneNode(true);
    assignTaskBtn.parentNode.replaceChild(newAssignTaskBtn, assignTaskBtn);
    newAssignTaskBtn.addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value.trim();
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const points = parseInt(document.getElementById('taskPoints').value);
        const deadline = document.getElementById('taskDeadline').value;
        const slaveId = document.getElementById('taskSlave').value;
        const dependencies = document.getElementById('taskDependencies').value.split(',').map(id => id.trim()).filter(id => id);
        const recurring = document.getElementById('recurringTask').checked;

        if (!title || !points) return showError('Title and points required');

        const taskData = {
            slaveId,
            title,
            category,
            priority,
            points,
            completed: false,
            progress: 0,
            dependencies,
            recurring,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ...(deadline && { deadline: firebase.firestore.Timestamp.fromDate(new Date(deadline)) })
        };

        if (slaveId === 'all') {
            // Batch write to prevent multiple triggers
            const batch = db.batch();
            db.collection('slaves').where('allowed', '==', true).get().then(snap => {
                snap.forEach(doc => {
                    const taskRef = db.collection('tasks').doc();
                    batch.set(taskRef, { ...taskData, slaveId: doc.id });
                });
                batch.commit().then(() => {
                    clearForm('taskForm');
                    showNotification('Tasks assigned to all slaves');
                }).catch(err => showError('Error assigning tasks: ' + err.message));
            });
        } else {
            db.collection('tasks').add(taskData).then(() => {
                clearForm('taskForm');
                showNotification('Task assigned');
            }).catch(err => showError('Error assigning task: ' + err.message));
        }
    });

    document.getElementById('saveTaskTemplate').addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value.trim();
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const points = parseInt(document.getElementById('taskPoints').value);
        if (!title || !points) return showError('Title and points required');
        db.collection('taskTemplates').add({ title, category, priority, points });
        clearForm('taskForm');
        showNotification('Template saved');
    });

    document.getElementById('previewTask').addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value.trim();
        const category = document.getElementById('taskCategory').value;
        const priority = document.getElementById('taskPriority').value;
        const points = document.getElementById('taskPoints').value;
        if (!title || !points) return showError('Title and points required');
        showPreview('Task Preview', `
            <strong>Title:</strong> ${title}<br>
            <strong>Category:</strong> ${category}<br>
            <strong>Priority:</strong> ${priority}<br>
            <strong>Points:</strong> ${points}
        `);
    });

    db.collection('taskTemplates').onSnapshot(snap => {
        const templateList = document.getElementById('templateList');
        templateList.innerHTML = '';
        snap.forEach(doc => {
            const t = doc.data();
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `<span>${t.title} (${t.points} pts) - ${t.category}</span>`;
            item.addEventListener('click', () => {
                document.getElementById('taskTitle').value = t.title;
                document.getElementById('taskCategory').value = t.category;
                document.getElementById('taskPriority').value = t.priority;
                document.getElementById('taskPoints').value = t.points;
            });
            templateList.appendChild(item);
        });
    });

    db.collection('tasks').orderBy('timestamp', 'desc').onSnapshot(snap => {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        snap.forEach(doc => {
            const task = doc.data();
            db.collection('slaves').doc(task.slaveId).get().then(slaveDoc => {
                const item = document.createElement('div');
                item.className = `item ${task.priority}`;
                item.draggable = true;
                item.innerHTML = `
                    <div>
                        <input type="checkbox" class="task-select" data-id="${doc.id}">
                        <span>${task.title} (${task.points} pts) - ${slaveDoc.exists ? slaveDoc.data().username : 'Unknown'}</span>
                        <span class="task-progress">${task.progress}%</span>
                    </div>
                    <div>
                        <button class="btn" onclick="editTask('${doc.id}', '${task.title}', ${task.points}, '${task.category}', '${task.priority}')">Edit</button>
                        <button class="btn" onclick="updateProgress('${doc.id}', ${task.progress})">Progress</button>
                        <button class="btn logout" onclick="deleteTask('${doc.id}')">Delete</button>
                    </div>
                `;
                taskList.appendChild(item);
            });
        });
        makeSortable(taskList);
    });

    document.getElementById('bulkComplete').addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.task-select:checked')).map(cb => cb.dataset.id);
        if (!selected.length) return showError('No tasks selected');
        selected.forEach(id => db.collection('tasks').doc(id).update({ completed: true }));
        showNotification('Tasks marked complete');
    });

    // Rewards
    document.getElementById('awardPoints').addEventListener('click', () => {
        const slaveId = document.getElementById('rewardSlave').value;
        const points = parseInt(document.getElementById('rewardPoints').value);
        const type = document.getElementById('rewardType').value;
        const description = document.getElementById('rewardDescription').value.trim();
        const tier = document.getElementById('rewardTier').value;
        const expiration = document.getElementById('rewardExpiration').value;

        if (!slaveId || !points || slaveId === 'all') return showError('Select a specific slave and enter points');

        const rewardData = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Unique ID for each reward entry
            points,
            type,
            description,
            tier,
            timestamp: new Date().toISOString(),
            ...(expiration && { expiration: firebase.firestore.Timestamp.fromDate(new Date(expiration)) })
        };

        const rewardRef = db.collection('rewards').doc(slaveId);
        rewardRef.get().then(doc => {
            const currentPoints = doc.exists ? (doc.data().points || 0) : 0;
            const currentHistory = doc.exists ? (doc.data().history || []) : [];

            rewardRef.set({
                points: currentPoints + points,
                history: [...currentHistory, rewardData],
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).then(() => {
                db.collection('slaves').doc(slaveId).update({
                    level: Math.floor((currentPoints + points) / 100) + 1
                });
                clearForm('rewardForm');
                showNotification(`Awarded ${points} ${type} (${tier}) to slave`);
            }).catch(err => showError('Error awarding points: ' + err.message));
        }).catch(err => showError('Error fetching reward data: ' + err.message));
    });

    document.getElementById('bulkAward').addEventListener('click', () => {
        const points = parseInt(document.getElementById('rewardPoints').value);
        const type = document.getElementById('rewardType').value;
        const description = document.getElementById('rewardDescription').value.trim();
        const tier = document.getElementById('rewardTier').value;
        const expiration = document.getElementById('rewardExpiration').value;
        if (!points) return showError('Points required');
        const rewardData = {
            points,
            type,
            description,
            tier,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ...(expiration && { expiration: firebase.firestore.Timestamp.fromDate(new Date(expiration)) })
        };
        db.collection('slaves').where('allowed', '==', true).get().then(snap => {
            snap.forEach(doc => {
                const slaveId = doc.id;
                db.collection('rewards').doc(slaveId).get().then(rewardDoc => {
                    const currentPoints = rewardDoc.exists ? rewardDoc.data().points || 0 : 0;
                    db.collection('rewards').doc(slaveId).set({
                        points: currentPoints + points,
                        history: firebase.firestore.FieldValue.arrayUnion(rewardData)
                    }, { merge: true });
                    db.collection('slaves').doc(slaveId).update({ level: Math.floor((currentPoints + points) / 100) + 1 });
                });
            });
            clearForm('rewardForm');
            showNotification(`Bulk awarded ${points} ${type} (${tier})`);
        });
    });

    document.getElementById('previewReward').addEventListener('click', () => {
        const points = document.getElementById('rewardPoints').value;
        const type = document.getElementById('rewardType').value;
        const description = document.getElementById('rewardDescription').value.trim();
        const tier = document.getElementById('rewardTier').value;
        if (!points) return showError('Points required');
        showPreview('Reward Preview', `
            <strong>Points:</strong> ${points}<br>
            <strong>Type:</strong> ${type}<br>
            <strong>Description:</strong> ${description || 'None'}<br>
            <strong>Tier:</strong> ${tier}
        `);
    });

    db.collection('rewards').onSnapshot(snap => {
        const rewardList = document.getElementById('rewardList');
        rewardList.innerHTML = ''; // Clear the list to prevent duplicates
        const renderedIds = new Set(); // Track rendered reward IDs to avoid duplicates

        snap.forEach(doc => {
            db.collection('slaves').doc(doc.id).get().then(slaveDoc => {
                const slaveName = slaveDoc.exists ? slaveDoc.data().username : 'Unknown';
                const history = doc.data().history || [];

                history.forEach(h => {
                    if (!renderedIds.has(h.id)) { // Only render if ID hasn’t been seen
                        const item = document.createElement('div');
                        item.className = 'item';
                        item.dataset.rewardId = h.id; // Store ID for reference
                        item.innerHTML = `
                            <span>${slaveName} - ${h.points} ${h.type} (${h.tier}) ${h.description ? `- ${h.description}` : ''}</span>
                            <span>${h.expiration ? `Exp: ${new Date(h.expiration.toDate()).toLocaleDateString()}` : ''} (Awarded: ${new Date(h.timestamp).toLocaleString()})</span>
                        `;
                        rewardList.appendChild(item);
                        renderedIds.add(h.id); // Mark this reward as rendered
                    }
                });
            }).catch(err => showError('Error fetching slave data: ' + err.message));
        });
    });

    // Training
    let quizQuestions = [];
    document.getElementById('addQuiz').addEventListener('click', () => {
        const question = document.getElementById('quizQuestion').value.trim();
        const answers = document.getElementById('quizAnswers').value.split(',').map(a => a.trim());
        const correct = parseInt(document.getElementById('quizCorrect').value);
        if (!question || answers.length < 2 || isNaN(correct) || correct < 0 || correct >= answers.length) {
            return showError('Valid question, answers, and correct index required');
        }
        quizQuestions.push({ question, answers, correct });
        const qList = document.getElementById('quizQuestions');
        const qItem = document.createElement('div');
        qItem.className = 'quiz-question';
        qItem.innerHTML = `${question} (${answers[correct]})`;
        qList.appendChild(qItem);
        document.getElementById('quizQuestion').value = document.getElementById('quizAnswers').value = document.getElementById('quizCorrect').value = '';
        showNotification('Quiz question added');
    });

    document.getElementById('addLesson').addEventListener('click', () => {
        const title = document.getElementById('lessonTitle').value.trim();
        const content = document.getElementById('lessonContent').value.trim();
        const schedule = document.getElementById('lessonSchedule').value;
        if (!title || !content) return showError('Title and content required');
        db.collection('lessons').add({
            title,
            content,
            quizzes: quizQuestions,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            ...(schedule && { scheduled: firebase.firestore.Timestamp.fromDate(new Date(schedule)) })
        });
        clearForm('lessonForm');
        quizQuestions = [];
        document.getElementById('quizQuestions').innerHTML = '';
        showNotification('Lesson published');
    });

    document.getElementById('previewLesson').addEventListener('click', () => {
        const title = document.getElementById('lessonTitle').value.trim();
        const content = document.getElementById('lessonContent').value.trim();
        if (!title || !content) return showError('Title and content required');
        const quizHtml = quizQuestions.map(q => `<p>${q.question}<br>${q.answers.map((a, i) => `${i}. ${a}`).join('<br>')}</p>`).join('');
        showPreview('Lesson Preview', `<strong>${title}</strong><br><br>${content.replace(/\n/g, '<br>')}<br><br>${quizHtml}`);
    });

    db.collection('lessons').orderBy('timestamp', 'desc').onSnapshot(snap => {
        const lessonList = document.getElementById('lessonList');
        lessonList.innerHTML = '';
        snap.forEach(doc => {
            const lesson = doc.data();
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${lesson.title} ${lesson.scheduled ? `(Scheduled: ${new Date(lesson.scheduled.toDate()).toLocaleString()})` : ''}</span>
                <span>${lesson.quizzes?.length ? `${lesson.quizzes.length} questions` : ''}</span>
                <button class="btn logout" onclick="deleteLesson('${doc.id}')">Delete</button>
            `;
            lessonList.appendChild(item);
        });
    });

    // Marketplace
    document.getElementById('addItem').addEventListener('click', () => {
        const name = document.getElementById('itemName').value.trim();
        const category = document.getElementById('itemCategory').value;
        const cost = parseInt(document.getElementById('itemCost').value);
        const stock = parseInt(document.getElementById('itemStock').value);
        const discount = parseInt(document.getElementById('itemDiscount').value) || 0;
        const biddable = document.getElementById('itemBiddable').checked;
        const file = document.getElementById('itemImage').files[0];
        if (!name || !cost || !stock) return showError('Name, cost, and stock required');
        const itemData = { name, category, cost, stock, discount, biddable, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        if (file) {
            const ref = storage.ref(`marketplace/${file.name}`);
            ref.put(file).then(() => ref.getDownloadURL().then(url => {
                db.collection('shop').add({ ...itemData, image: url });
                clearForm('itemForm');
            }));
        } else {
            db.collection('shop').add(itemData);
            clearForm('itemForm');
        }
    });

    document.getElementById('previewItem').addEventListener('click', () => {
        const name = document.getElementById('itemName').value.trim();
        const cost = document.getElementById('itemCost').value;
        const discount = document.getElementById('itemDiscount').value || 0;
        if (!name || !cost) return showError('Name and cost required');
        const finalCost = cost * (1 - discount / 100);
        showPreview('Item Preview', `
            <strong>${name}</strong><br>
            <strong>Cost:</strong> ${finalCost} pts (Original: ${cost} pts, ${discount}% off)
        `);
    });

    db.collection('shop').orderBy('timestamp', 'desc').onSnapshot(snap => {
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';
        snap.forEach(doc => {
            const item = doc.data();
            const finalCost = item.cost * (1 - item.discount / 100);
            const shopItem = document.createElement('div');
            shopItem.className = 'item';
            shopItem.innerHTML = `
                <span>${item.name} (${finalCost} pts) [${item.category}] ${item.stock} in stock ${item.biddable ? '[Biddable]' : ''}</span>
                <div>
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px;">` : ''}
                    <button class="btn logout" onclick="deleteItem('${doc.id}')">Delete</button>
                </div>
            `;
            shopItems.appendChild(shopItem);
        });
        document.getElementById('marketFilter').addEventListener('input', (e) => {
            const filter = e.target.value.toLowerCase();
            Array.from(shopItems.children).forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(filter) ? '' : 'none';
            });
        });
    });

    // Events
    document.getElementById('createEvent').addEventListener('click', () => {
        const title = document.getElementById('eventTitle').value.trim();
        const type = document.getElementById('eventType').value;
        const description = document.getElementById('eventDescription').value.trim();
        const endDate = new Date(document.getElementById('eventEndDate').value);
        const recurring = document.getElementById('eventRecurring').value;
        const reminder = document.getElementById('eventReminder').checked;
        if (!title || !endDate) return showError('Title and end date required');
        db.collection('events').add({
            title,
            type,
            description,
            endDate: firebase.firestore.Timestamp.fromDate(endDate),
            recurring,
            reminder,
            rsvps: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        clearForm('eventForm');
        showNotification('Event created');
    });

    document.getElementById('previewEvent').addEventListener('click', () => {
        const title = document.getElementById('eventTitle').value.trim();
        const type = document.getElementById('eventType').value;
        const description = document.getElementById('eventDescription').value.trim();
        const endDate = document.getElementById('eventEndDate').value;
        if (!title || !endDate) return showError('Title and end date required');
        showPreview('Event Preview', `
            <strong>${title}</strong> [${type}]<br>
            <strong>Ends:</strong> ${new Date(endDate).toLocaleString()}<br><br>
            ${description.replace(/\n/g, '<br>')}
        `);
    });

    db.collection('events').orderBy('timestamp', 'desc').onSnapshot(snap => {
        const eventList = document.getElementById('eventList');
        eventList.innerHTML = '';
        snap.forEach(doc => {
            const event = doc.data();
            const item = document.createElement('div');
            item.className = 'item';
            const timeLeft = event.endDate.toDate() - new Date();
            const countdown = timeLeft > 0 ? `${Math.floor(timeLeft / (1000 * 60 * 60))}h ${Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))}m` : 'Ended';
            item.innerHTML = `
                <span>${event.title} (${event.type}) - ${event.recurring !== 'none' ? `[${event.recurring}]` : ''}</span>
                <div>
                    <span class="event-countdown">${countdown}</span>
                    <button class="btn logout" onclick="deleteEvent('${doc.id}')">Delete</button>
                </div>
            `;
            eventList.appendChild(item);
        });
    });

    function clearForm(formId) {
        const form = document.getElementById(formId);
        form.querySelectorAll('input, textarea').forEach(el => el.value = '');
        form.querySelectorAll('input[type="checkbox"]').forEach(el => el.checked = false);
        form.classList.add('hidden');
        form.style.maxHeight = '0';
    }
}

function editTask(taskId, title, points, category, priority) {
    const newTitle = prompt('Edit Task Title:', title);
    const newPoints = parseInt(prompt('Edit Points:', points));
    const newCategory = prompt('Edit Category:', category);
    const newPriority = prompt('Edit Priority (low/medium/high):', priority);
    if (newTitle && newPoints && newCategory && newPriority) {
        firebase.firestore().collection('tasks').doc(taskId).update({
            title: newTitle,
            points: newPoints,
            category: newCategory,
            priority: newPriority
        });
        showNotification('Task updated');
    }
}

function updateProgress(taskId, currentProgress) {
    const progress = parseInt(prompt('Update Progress (0-100):', currentProgress));
    if (progress >= 0 && progress <= 100) {
        firebase.firestore().collection('tasks').doc(taskId).update({ progress });
        if (progress === 100) firebase.firestore().collection('tasks').doc(taskId).update({ completed: true });
        showNotification('Progress updated');
    }
}

function makeSortable(container) {
    let draggedItem = null;
    container.addEventListener('dragstart', e => draggedItem = e.target.closest('.item'));
    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedItem) {
            const afterElement = getDragAfterElement(container, e.clientY);
            if (afterElement) container.insertBefore(draggedItem, afterElement);
            else container.appendChild(draggedItem);
            draggedItem = null;
        }
    });
}

function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll('.item:not(.dragging)')];
    return items.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function deleteTask(taskId) { firebase.firestore().collection('tasks').doc(taskId).delete().then(() => showNotification('Task deleted')); }
function deleteLesson(lessonId) { firebase.firestore().collection('lessons').doc(lessonId).delete().then(() => showNotification('Lesson deleted')); }
function deleteItem(itemId) { firebase.firestore().collection('shop').doc(itemId).delete().then(() => showNotification('Item deleted')); }
function deleteEvent(eventId) { firebase.firestore().collection('events').doc(eventId).delete().then(() => showNotification('Event deleted')); }

// Communication
function loadCommunication() {
    const db = firebase.firestore();
    const rtDb = firebase.database();
    const chatList = document.getElementById('chatList');
    const chatMessages = document.getElementById('chatMessages');
    const unreadBadge = document.getElementById('unreadBadge');
    let currentChat = null;
    let unreadCount = 0;

    // Track unread messages across all chats
    function updateUnreadBadge() {
        unreadBadge.innerText = unreadCount;
        unreadBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    db.collection('slaves').where('allowed', '==', true).onSnapshot(snap => {
        chatList.innerHTML = '';
        snap.forEach(doc => {
            const slave = doc.data();
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.slaveId = doc.id;
            chatItem.innerHTML = `
                <div class="profile-circle" id="profile-${doc.id}">
                    ${slave.username.charAt(0).toUpperCase()}
                    <span class="online-indicator" id="online-${doc.id}" style="display: none;"></span>
                </div>
                <div class="chat-info">
                    <span class="chat-username">${slave.username}</span>
                    <span class="chat-last-message" id="lastMessage-${doc.id}"></span>
                </div>
                <span class="chat-timestamp" id="timestamp-${doc.id}"></span>
                <span class="unread-count" id="unread-${doc.id}" style="display: none;">0</span>
            `;
            chatItem.addEventListener('click', () => {
                document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
                chatItem.classList.add('active');
                currentChat = doc.id;
                loadChatMessages(doc.id, slave.username);
                markAsRead(doc.id);
            });
            chatList.appendChild(chatItem);

            // Online Status
            rtDb.ref(`presence/${doc.id}`).on('value', snap => {
                const onlineIndicator = document.getElementById(`online-${doc.id}`);
                onlineIndicator.style.display = snap.val() ? 'block' : 'none';
                onlineIndicator.style.background = snap.val() ? '#43b581' : '#747f8d';
            });

            // Typing Indicator
            rtDb.ref(`typing/${doc.id}`).on('value', snap => {
                if (currentChat === doc.id && snap.val()) {
                    const typingDiv = document.createElement('div');
                    typingDiv.className = 'chat-message other typing-indicator';
                    typingDiv.innerText = `${slave.username} is typing...`;
                    chatMessages.appendChild(typingDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    setTimeout(() => typingDiv.remove(), 2000);
                }
            });

            // Last Message and Unread Count
            rtDb.ref(`chats/${doc.id}/messages`).orderByChild('timestamp').on('value', snap => {
                const messages = snap.val();
                if (messages) {
                    const lastMsg = Object.values(messages).slice(-1)[0];
                    document.getElementById(`lastMessage-${doc.id}`).innerText = lastMsg.text.slice(0, 20) + (lastMsg.text.length > 20 ? '...' : '');
                    document.getElementById(`timestamp-${doc.id}`).innerText = new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const unread = Object.values(messages).filter(msg => msg.from !== 'Goddess' && !msg.read && new Date(msg.timestamp) > (slave.lastRead || 0)).length;
                    const unreadSpan = document.getElementById(`unread-${doc.id}`);
                    unreadSpan.innerText = unread;
                    unreadSpan.style.display = unread > 0 ? 'block' : 'none';
                    unreadCount = Array.from(chatList.querySelectorAll('.unread-count')).reduce((sum, span) => sum + parseInt(span.innerText || 0), 0);
                    updateUnreadBadge();
                }
            });
        });
    });

    function loadChatMessages(slaveId, username) {
        document.getElementById('chatRecipientName').innerText = username;
        document.getElementById('chatProfileCircle').innerText = username.charAt(0).toUpperCase();
        chatMessages.innerHTML = '';
        rtDb.ref(`chats/${slaveId}/messages`).orderByChild('timestamp').on('value', snap => {
            chatMessages.innerHTML = '';
            const messages = snap.val();
            if (messages) {
                Object.values(messages).forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `chat-message ${msg.from === 'Goddess' ? 'self' : 'other'}`;
                    msgDiv.innerText = msg.text;
                    chatMessages.appendChild(msgDiv);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });
    }

    function markAsRead(slaveId) {
        rtDb.ref(`chats/${slaveId}/messages`).once('value', snap => {
            const updates = {};
            const messages = snap.val();
            if (messages) {
                Object.entries(messages).forEach(([key, msg]) => {
                    if (msg.from !== 'Goddess' && !msg.read) {
                        updates[`${key}/read`] = true;
                    }
                });
                rtDb.ref(`chats/${slaveId}/messages`).update(updates);
                unreadCount -= parseInt(document.getElementById(`unread-${slaveId}`).innerText || 0);
                document.getElementById(`unread-${slaveId}`).innerText = '0';
                document.getElementById(`unread-${slaveId}`).style.display = 'none';
                updateUnreadBadge();
            }
        });
    }

    function sendMessage() {
        const text = document.getElementById('chatInput').value.trim();
        if (!text || !currentChat) return showError('Select a chat and enter a message');
        const chatRef = rtDb.ref(`chats/${currentChat}/messages`).push();
        chatRef.set({
            from: 'Goddess', // Static identifier for Goddess
            fromName: 'Goddess',
            text,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        }).then(() => {
            document.getElementById('chatInput').value = '';
            showNotification('Message sent');
            db.collection('slaves').doc(currentChat).update({
                lastRead: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    }

    // Typing Indicator for Goddess
    let typingTimeout;
    document.getElementById('chatInput').addEventListener('input', () => {
        if (currentChat) {
            rtDb.ref(`typing/goddess`).set(true); // Use 'goddess' as static ID
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => rtDb.ref(`typing/goddess`).set(false), 1000);
        }
    });

    document.getElementById('sendMessage').style.borderRadius = '50%';
    document.getElementById('sendMessage').style.background = '5865f2';
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // Group Chat, Commands, Announcements (unchanged)
    document.getElementById('createGroupChat').addEventListener('click', () => {
        const name = document.getElementById('groupChatName').value.trim();
        if (!name) return showError('Group name required');
        db.collection('groupChats').add({
            name,
            members: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('groupChatName').value = '';
        showNotification('Group chat created');
    });

    db.collection('groupChats').orderBy('timestamp', 'desc').onSnapshot(snap => {
        const groupChatList = document.getElementById('groupChatList');
        groupChatList.innerHTML = '';
        snap.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${doc.data().name}</span>
                <button class="btn logout" onclick="deleteGroupChat('${doc.id}')">Delete</button>
            `;
            groupChatList.appendChild(item);
        });
    });

    document.getElementById('sendCommand').addEventListener('click', () => {
        const text = document.getElementById('commandInput').value.trim();
        if (!text) return showError('Command required');
        db.collection('commands').add({
            text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('commandInput').value = '';
        showNotification('Command proclaimed');
    });

    db.collection('commands').orderBy('timestamp', 'desc').limit(5).onSnapshot(snap => {
        const commandList = document.getElementById('commandList');
        commandList.innerHTML = '';
        snap.forEach(doc => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${doc.data().text}</span>
                <button class="btn logout" onclick="deleteCommand('${doc.id}')">Delete</button>
            `;
            commandList.appendChild(item);
        });
    });

    document.getElementById('sendAnnouncement').addEventListener('click', () => {
        const text = document.getElementById('announcementInput').value.trim();
        const schedule = document.getElementById('announcementSchedule').value;
        if (!text) return showError('Announcement required');
        const data = { text, timestamp: firebase.firestore.FieldValue.serverTimestamp() };
        if (schedule) data.scheduled = firebase.firestore.Timestamp.fromDate(new Date(schedule));
        db.collection('announcements').add(data);
        document.getElementById('announcementInput').value = document.getElementById('announcementSchedule').value = '';
        showNotification('Announcement sent');
    });

    db.collection('announcements').orderBy('timestamp', 'desc').limit(5).onSnapshot(snap => {
        const announcementList = document.getElementById('announcementList');
        announcementList.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `
                <span>${data.text} ${data.scheduled ? `(Scheduled: ${new Date(data.scheduled.toDate()).toLocaleString()})` : ''}</span>
                <button class="btn logout" onclick="deleteAnnouncement('${doc.id}')">Delete</button>
            `;
            announcementList.appendChild(item);
        });
    });
}

// Presence Tracking for Goddess
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        const uid = user.uid;
        const presenceRef = firebase.database().ref(`presence/${uid}`);
        presenceRef.set(true);
        presenceRef.onDisconnect().set(false);
    }
});

function deleteGroupChat(groupId) { firebase.firestore().collection('groupChats').doc(groupId).delete().then(() => showNotification('Group chat deleted')); }
function deleteCommand(commandId) { firebase.firestore().collection('commands').doc(commandId).delete().then(() => showNotification('Command deleted')); }
function deleteAnnouncement(announcementId) { firebase.firestore().collection('announcements').doc(announcementId).delete().then(() => showNotification('Announcement deleted')); }

// Analytics
function loadAnalytics() {
    const db = firebase.firestore();
    db.collection('rewards').onSnapshot(snap => {
        let totalPoints = 0;
        snap.forEach(doc => totalPoints += doc.data().points || 0);
        db.collection('slaves').where('allowed', '==', true).get().then(slaveSnap => {
            document.getElementById('avgPoints').innerText = slaveSnap.size ? Math.round(totalPoints / slaveSnap.size) : 0;
        });
    });

    db.collection('tasks').onSnapshot(snap => {
        const total = snap.size;
        const completed = snap.docs.filter(doc => doc.data().completed).length;
        document.getElementById('completionRate').innerText = total ? `${Math.round((completed / total) * 100)}%` : '0%';
    });

    db.collection('rewards').orderBy('points', 'desc').limit(1).onSnapshot(snap => {
        if (snap.size) {
            db.collection('slaves').doc(snap.docs[0].id).get().then(doc => {
                document.getElementById('mostActive').innerText = doc.data().username || 'None';
            });
        } else {
            document.getElementById('mostActive').innerText = 'None';
        }
    });

    let totalMessages = 0;
    db.collection('slaves').where('allowed', '==', true).get().then(snap => {
        const promises = snap.docs.map(doc =>
            firebase.database().ref(`chats/${doc.id}/messages`).once('value').then(msgSnap => {
                totalMessages += msgSnap.val() ? Object.keys(msgSnap.val()).length : 0;
                document.getElementById('totalMessages').innerText = totalMessages;
            })
        );
        Promise.all(promises).then(() => { });
    });

    const slaveActivityChart = new Chart(document.getElementById('slaveActivityChart'), {
        type: 'pie',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#7289da', '#43b581', '#faa61a', '#f04747', '#b9bbbe'] }] },
        options: { plugins: { legend: { labels: { color: '#dcddde' } } } }
    });
    const pointsTrendChart = new Chart(document.getElementById('pointsTrendChart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Points Trend', data: [], borderColor: '#7289da', tension: 0.1 }] },
        options: { scales: { y: { beginAtZero: true } }, plugins: { legend: { labels: { color: '#dcddde' } } } }
    });

    db.collection('slaves').where('allowed', '==', true).onSnapshot(snap => {
        slaveActivityChart.data.labels = snap.docs.map(doc => doc.data().username);
        slaveActivityChart.data.datasets[0].data = snap.docs.map(doc => doc.data().streak || 0);
        slaveActivityChart.update();
    });

    db.collection('rewards').orderBy('timestamp', 'desc').onSnapshot(snap => {
        const data = snap.docs.map(doc => ({ id: doc.id, points: doc.data().points, timestamp: doc.data().timestamp?.toDate() }));
        pointsTrendChart.data.labels = data.map(d => d.timestamp ? new Date(d.timestamp).toLocaleDateString() : d.id.slice(0, 5));
        pointsTrendChart.data.datasets[0].data = data.map(d => d.points || 0);
        pointsTrendChart.update();
    });

    document.getElementById('exportReport').addEventListener('click', () => {
        const report = {
            slaves: document.getElementById('slaveCount').innerText,
            tasks: document.getElementById('taskCount').innerText,
            points: document.getElementById('totalPoints').innerText,
            avgPoints: document.getElementById('avgPoints').innerText,
            completionRate: document.getElementById('completionRate').innerText,
            mostActive: document.getElementById('mostActive').innerText,
            messages: document.getElementById('totalMessages').innerText,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dominion_report_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Report exported');
    });
}
