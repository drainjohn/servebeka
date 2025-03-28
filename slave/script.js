// Navigation
const sections = ['dashboard', 'duties', 'communication', 'progress', 'training', 'marketplace', 'events'];
sections.forEach(section => {
    document.getElementById(`${section}Btn`).addEventListener('click', () => {
        sections.forEach(s => {
            document.getElementById(s).style.display = s === section ? 'block' : 'none';
            document.getElementById(`${s}Btn`).classList.toggle('active', s === section);
        });
    });
});

// Tabbed Navigation
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const section = tab.closest('.content-section');
        section.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        section.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).style.display = 'block';
    });
});

// Error & Notification Popups
function showError(message) {
    const popup = document.getElementById('errorPopup');
    const messageSpan = document.getElementById('errorMessage');
    messageSpan.innerText = message;
    popup.style.display = 'flex';
    setTimeout(hideError, 5000);
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

// Authentication Check
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '../../Platform/index.html';
    } else {
        loadSlaveData(user);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '../../Platform/index.html');
});

// Load Slave Data
let slaveData;
function loadSlaveData(user) {
    db.collection('slaves').doc(user.uid).onSnapshot(doc => {
        if (doc.exists) {
            slaveData = doc.data();
            document.getElementById('username').innerText = slaveData.username;
            document.getElementById('streak').innerText = slaveData.streak || 0;
            loadDashboard(user.uid);
            loadDuties(user.uid);
            loadCommunication(user.uid);
            loadProgress(user.uid);
            loadTraining(user.uid);
            loadMarketplace(user.uid);
            loadEvents(user.uid);
        } else {
            showError('Profile not found.');
        }
    });
}

// Dashboard
function loadDashboard(uid) {
    db.collection('tasks').where('slaveId', '==', uid).where('completed', '==', true).get()
        .then(snap => document.getElementById('tasksCompleted').innerText = snap.size);
    db.collection('rewards').doc(uid).get()
        .then(doc => document.getElementById('rewardPoints').innerText = doc.exists ? doc.data().points : 0);
    db.collection('messages').where('to', '==', uid).get()
        .then(snap => document.getElementById('messageCount').innerText = snap.size);
    db.collection('commands').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
        const cmdDiv = document.getElementById('goddessCommands');
        cmdDiv.innerHTML = 'Commands: ';
        snap.forEach(doc => cmdDiv.innerHTML += doc.data().text);
    });
}

// Duties
function loadDuties(uid) {
    const dailyQuests = document.getElementById('dailyQuests');
    const taskList = document.getElementById('taskList');
    const challengeList = document.getElementById('challengeList');

    db.collection('dailyQuests').where('date', '==', new Date().toDateString()).onSnapshot(snap => {
        dailyQuests.innerHTML = '';
        snap.forEach(doc => {
            const quest = doc.data();
            if (!quest.completed) {
                dailyQuests.innerHTML += `<div class="task">${quest.title} (+${quest.points} pts)<button class="btn" onclick="completeTask('${doc.id}', ${quest.points}, 'dailyQuests')">Complete</button></div>`;
            }
        });
    });

    db.collection('tasks').where('slaveId', '==', uid).where('completed', '==', false).onSnapshot(snap => {
        taskList.innerHTML = '';
        snap.forEach(doc => {
            const task = doc.data();
            taskList.innerHTML += `<div class="task">${task.title} (+${task.points} pts)<button class="btn" onclick="completeTask('${doc.id}', ${task.points}, 'tasks')">Complete</button></div>`;
        });
    });

    db.collection('challenges').where('slaveId', '==', uid).onSnapshot(snap => {
        challengeList.innerHTML = '';
        snap.forEach(doc => {
            const challenge = doc.data();
            challengeList.innerHTML += `<div class="task">${challenge.title} (+${challenge.points} pts)<button class="btn" onclick="completeTask('${doc.id}', ${challenge.points}, 'challenges')">Complete</button></div>`;
        });
    });
}

function completeTask(taskId, points, collection) {
    db.collection(collection).doc(taskId).update({ completed: true })
        .then(() => {
            db.collection('rewards').doc(auth.currentUser.uid).get()
                .then(doc => {
                    const currentPoints = doc.exists ? doc.data().points : 0;
                    db.collection('rewards').doc(auth.currentUser.uid).set({ points: currentPoints + points });
                    showNotification(`Completed! +${points} points`);
                    updateStreak();
                });
        });
}

function updateStreak() {
    const uid = auth.currentUser.uid;
    db.collection('slaves').doc(uid).get().then(doc => {
        const lastLogin = doc.data().lastLogin ? new Date(doc.data().lastLogin) : null;
        const today = new Date();
        const streak = doc.data().streak || 0;
        if (!lastLogin || (today - lastLogin) / (1000 * 60 * 60 * 24) === 1) {
            db.collection('slaves').doc(uid).update({ streak: streak + 1, lastLogin: today });
        } else if ((today - lastLogin) / (1000 * 60 * 60 * 24) > 1) {
            db.collection('slaves').doc(uid).update({ streak: 1, lastLogin: today });
        }
    });
}

// Communication
function loadCommunication(uid) {
    const chatMessages = document.getElementById('chatMessages');

    function loadChatMessages() {
        firebase.database().ref(`chats/${uid}`).child('messages').orderByChild('timestamp').on('value', snap => {
            chatMessages.innerHTML = '';
            const messages = snap.val();
            if (messages) {
                Object.values(messages).forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = `chat-message ${msg.from === uid ? 'self' : 'other'}`;
                    msgDiv.innerText = msg.text;
                    chatMessages.appendChild(msgDiv);
                });
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    loadChatMessages();

    function sendMessage() {
        const text = document.getElementById('chatInput').value.trim();
        if (text) {
            const chatRef = firebase.database().ref(`chats/${uid}`);
            chatRef.child('slaveId').set(uid); // Ensure slaveId is set
            const newMessageRef = chatRef.child('messages').push();
            newMessageRef.set({
                from: uid,
                fromName: slaveData.username,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                document.getElementById('chatInput').value = '';
            }).catch(err => {
                showError('Failed to send message: ' + err.message);
            });
        }
    }

    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    db.collection('announcements').orderBy('timestamp', 'desc').limit(5).onSnapshot(snap => {
        const announcementList = document.getElementById('announcementList');
        announcementList.innerHTML = '';
        snap.forEach(doc => announcementList.innerHTML += `<div class="item">${doc.data().text}</div>`);
    });
}

// Progress
function loadProgress(uid) {
    db.collection('rewards').doc(uid).onSnapshot(doc => {
        const data = doc.exists ? doc.data() : { points: 0 };
        const points = data.points;
        document.getElementById('totalPoints').innerText = points;
        document.getElementById('rewardPoints').innerText = points;
        document.getElementById('rank').innerText = points >= 200 ? 'Elite' : points >= 100 ? 'Devoted' : points >= 50 ? 'Loyal' : 'Novice';
        document.getElementById('devotion').innerText = `${Math.min(points / 2, 100)}%`;
        document.getElementById('devotionCircle').setAttribute('stroke-dasharray', `${Math.min(points / 2, 100)}, 100`);

        const badgeList = document.getElementById('badgeList');
        badgeList.innerHTML = '';
        if (points >= 10) badgeList.innerHTML += '<div class="badge">Initiate</div>';
        if (points >= 50) badgeList.innerHTML += '<div class="badge">Loyalist</div>';
        if (points >= 100) badgeList.innerHTML += '<div class="badge">Chosen</div>';
        if (points >= 200) badgeList.innerHTML += '<div class="badge">Elite</div>';
    });

    db.collection('rewards').orderBy('points', 'desc').limit(5).onSnapshot(snap => {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = '';
        snap.forEach(doc => {
            db.collection('slaves').doc(doc.id).get().then(slaveDoc => {
                leaderboardList.innerHTML += `<div class="item">${slaveDoc.data().username}<span>${doc.data().points} pts</span></div>`;
            });
        });
    });
}

// Training
function loadTraining(uid) {
    const lessonList = document.getElementById('lessonList');
    const quizList = document.getElementById('quizList');

    db.collection('lessons').onSnapshot(snap => {
        lessonList.innerHTML = '';
        snap.forEach(doc => lessonList.innerHTML += `<div class="item">${doc.data().title}<button class="btn" onclick="viewLesson('${doc.id}')">View</button></div>`);
    });

    db.collection('quizzes').onSnapshot(snap => {
        quizList.innerHTML = '';
        snap.forEach(doc => quizList.innerHTML += `<div class="item">${doc.data().title} (+${doc.data().points} pts)<button class="btn" onclick="takeQuiz('${doc.id}', ${doc.data().points})">Take</button></div>`);
    });
}

function viewLesson(lessonId) {
    showNotification(`Viewing lesson ${lessonId}`);
}

function takeQuiz(quizId, points) {
    db.collection('quizzes').doc(quizId).update({ completed: true })
        .then(() => {
            db.collection('rewards').doc(auth.currentUser.uid).get()
                .then(doc => {
                    const currentPoints = doc.exists ? doc.data().points : 0;
                    db.collection('rewards').doc(auth.currentUser.uid).set({ points: currentPoints + points });
                    showNotification(`Quiz completed! +${points} points`);
                });
        });
}

// Marketplace
function loadMarketplace(uid) {
    const shopItems = document.getElementById('shopItems');
    const auctionList = document.getElementById('auctionList');

    db.collection('shop').onSnapshot(snap => {
        shopItems.innerHTML = '';
        snap.forEach(doc => {
            const item = doc.data();
            shopItems.innerHTML += `<div class="item">${item.name} (${item.cost} pts)<button class="btn" onclick="buyItem('${doc.id}', ${item.cost})">Buy</button></div>`;
        });
    });

    db.collection('auctions').onSnapshot(snap => {
        auctionList.innerHTML = '';
        snap.forEach(doc => {
            const auction = doc.data();
            auctionList.innerHTML += `<div class="item">${auction.item} (Bid: ${auction.currentBid} pts)<button class="btn" onclick="bidAuction('${doc.id}', ${auction.currentBid + 10})">Bid</button></div>`;
        });
    });
}

function buyItem(itemId, cost) {
    db.collection('rewards').doc(auth.currentUser.uid).get().then(doc => {
        const points = doc.exists ? doc.data().points : 0;
        if (points >= cost) {
            db.collection('rewards').doc(auth.currentUser.uid).update({ points: points - cost });
            db.collection('inventory').doc(auth.currentUser.uid).collection('items').add({ itemId });
            showNotification('Item purchased!');
        } else {
            showError('Not enough points!');
        }
    });
}

function bidAuction(auctionId, bid) {
    db.collection('rewards').doc(auth.currentUser.uid).get().then(doc => {
        const points = doc.exists ? doc.data().points : 0;
        if (points >= bid) {
            db.collection('auctions').doc(auctionId).update({ currentBid: bid, bidder: auth.currentUser.uid });
            showNotification(`Bid placed: ${bid} points`);
        } else {
            showError('Not enough points to bid!');
        }
    });
}

// Events
function loadEvents(uid) {
    const eventList = document.getElementById('eventList');
    const pastEventList = document.getElementById('pastEventList');

    db.collection('events').where('endDate', '>', new Date()).onSnapshot(snap => {
        eventList.innerHTML = '';
        snap.forEach(doc => eventList.innerHTML += `<div class="item">${doc.data().title} (Ends: ${new Date(doc.data().endDate.toDate()).toLocaleDateString()})</div>`);
    });

    db.collection('events').where('endDate', '<=', new Date()).onSnapshot(snap => {
        pastEventList.innerHTML = '';
        snap.forEach(doc => pastEventList.innerHTML += `<div class="item">${doc.data().title} (Winner: ${doc.data().winner || 'N/A'})</div>`);
    });
}