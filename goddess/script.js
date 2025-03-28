// Navigation
const sections = ['overview', 'slaves', 'management', 'communication', 'analytics'];
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
    if (!user || user.email !== 'kohzanden@gmail.com') { // Replace with Goddess email
        window.location.href = '../../Platform/index.html';
    } else {
        loadGoddessData(user);
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '../../Platform/index.html');
});

// Load Goddess Data
function loadGoddessData(user) {
    loadOverview();
    loadSlaves();
    loadManagement();
    loadCommunication(user.uid);
    loadAnalytics();
    populateSlaveDropdowns();
}

// Overview
function loadOverview() {
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
    });
    db.collection('tasks').where('completed', '==', true).onSnapshot(snap => {
        document.getElementById('tasksCompleted').innerText = snap.size;
    });
}

// Slaves
// Slaves
function loadSlaves() {
    const pendingRequests = document.getElementById('pendingRequests');
    const activeSlaves = document.getElementById('activeSlaves');
    const blockedSlaves = document.getElementById('blockedSlaves');

    db.collection('slaves').onSnapshot(snap => {
        pendingRequests.innerHTML = '';
        activeSlaves.innerHTML = '';
        blockedSlaves.innerHTML = '';
        snap.forEach(doc => {
            const slave = doc.data();
            const slaveDiv = document.createElement('div');
            slaveDiv.className = 'item';
            slaveDiv.innerHTML = `
                <span>${slave.username} (${slave.email}) - ${slave.streak || 0} days</span>
                <div>
                    ${slave.allowed ? `<button class="btn" onclick="viewSlave('${doc.id}')">View</button>` : ''}
                    ${slave.request === 'pending' ? `
                        <button class="btn" onclick="approveSlave('${doc.id}')">Approve</button>
                        <button class="btn" onclick="blockSlave('${doc.id}')">Block</button>
                    ` : ''}
                    ${slave.allowed ? `<button class="btn" onclick="banSlave('${doc.id}')">Ban</button>` : ''}
                </div>
            `;
            if (slave.request === 'pending') pendingRequests.appendChild(slaveDiv);
            else if (slave.allowed) activeSlaves.appendChild(slaveDiv);
            else if (slave.request === 'blocked') blockedSlaves.appendChild(slaveDiv);
        });
    });
}

function approveSlave(uid) {
    db.collection('slaves').doc(uid).update({ allowed: true, request: 'approved' })
        .then(() => showNotification('Slave approved.'));
}

function blockSlave(uid) {
    db.collection('slaves').doc(uid).update({ request: 'blocked', allowed: false })
        .then(() => showNotification('Slave blocked.'));
}

function banSlave(uid) {
    db.collection('slaves').doc(uid).update({ allowed: false, request: 'banned' })
        .then(() => showNotification('Slave banned.'));
}

function viewSlave(slaveId) {
    db.collection('slaves').doc(slaveId).get().then(doc => {
        if (doc.exists) {
            const slave = doc.data();
            showSlaveStatsModal(slaveId, slave.username);
        }
    });
}

function showSlaveStatsModal(slaveId, username) {
    const modal = document.getElementById('slaveStatsModal');
    const statsContent = document.getElementById('slaveStatsContent');
    document.getElementById('slaveStatsName').innerText = `${username}'s Stats`;
    statsContent.innerHTML = '';

    // Fetch and calculate stats
    Promise.all([
        db.collection('tasks').where('slaveId', '==', slaveId).get(),
        db.collection('rewards').doc(slaveId).get(),
        firebase.database().ref(`chats/${slaveId}/messages`).once('value'),
        db.collection('slaves').doc(slaveId).get()
    ]).then(([tasksSnap, rewardsSnap, messagesSnap, slaveSnap]) => {
        const tasks = tasksSnap.docs.map(doc => doc.data());
        const rewards = rewardsSnap.exists ? rewardsSnap.data() : { points: 0 };
        const messages = messagesSnap.val() ? Object.values(messagesSnap.val()) : [];
        const slave = slaveSnap.data();

        // Detailed Stats
        const stats = [
            { label: 'Total Points', value: rewards.points || 0, highlight: true },
            { label: 'Tasks Assigned', value: tasks.length },
            { label: 'Tasks Completed', value: tasks.filter(t => t.completed).length, highlight: true },
            { label: 'Completion Rate', value: tasks.length ? `${Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)}%` : '0%' },
            { label: 'Current Streak', value: `${slave.streak || 0} days`, highlight: true },
            { label: 'Messages Sent', value: messages.filter(m => m.from === slaveId).length },
            { label: 'Last Message', value: messages.length ? messages[messages.length - 1].text : 'N/A' },
            { label: 'Join Date', value: slave.joinDate ? new Date(slave.joinDate).toLocaleDateString() : 'Unknown' },
            { label: 'Last Login', value: slave.lastLogin ? new Date(slave.lastLogin).toLocaleDateString() : 'Unknown' },
            { label: 'Average Points/Task', value: tasks.length ? Math.round(rewards.points / tasks.length) : 0 },
            { label: 'Pending Tasks', value: tasks.filter(t => !t.completed).length },
            { label: 'Total Task Points', value: tasks.reduce((sum, t) => sum + (t.points || 0), 0), highlight: true },
            { label: 'Messages Received', value: messages.filter(m => m.from !== slaveId).length },
            { label: 'Response Time (Avg)', value: calculateAvgResponseTime(messages, slaveId) },
            { label: 'Highest Streak', value: slave.highestStreak || 0, highlight: true },
            { label: 'Task Categories', value: [...new Set(tasks.map(t => t.category || 'Uncategorized'))].join(', ') },
            { label: 'Points Today', value: calculatePointsToday(tasks, rewards) },
            { label: 'Messages Today', value: messages.filter(m => isToday(m.timestamp)).length },
            { label: 'Task Success Rate', value: tasks.length ? `${Math.round((tasks.filter(t => t.completed && t.points > 0).length / tasks.length) * 100)}%` : '0%' },
            { label: 'Activity Score', value: calculateActivityScore(tasks, messages, rewards), highlight: true }
        ];

        // Render stats
        stats.forEach(stat => {
            const statCard = document.createElement('div');
            statCard.className = 'stat-card';
            statCard.innerHTML = `
                <span class="stat-label">${stat.label}</span>
                <span class="stat-value ${stat.highlight ? 'highlight' : ''}">${stat.value}</span>
            `;
            statsContent.appendChild(statCard);
        });

        modal.style.display = 'flex';
    }).catch(err => {
        showError('Failed to load stats: ' + err.message);
    });
}

function closeSlaveStatsModal() {
    document.getElementById('slaveStatsModal').style.display = 'none';
}

// Helper Functions for Stats
function calculateAvgResponseTime(messages, slaveId) {
    const responseTimes = [];
    for (let i = 1; i < messages.length; i++) {
        if (messages[i].from === slaveId && messages[i - 1].from !== slaveId) {
            const timeDiff = (messages[i].timestamp - messages[i - 1].timestamp) / 1000; // seconds
            if (timeDiff > 0 && timeDiff < 86400) responseTimes.push(timeDiff); // Cap at 24 hours
        }
    }
    const avg = responseTimes.length ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    return avg ? `${Math.round(avg / 60)} min` : 'N/A';
}

function calculatePointsToday(tasks, rewards) {
    const today = new Date().setHours(0, 0, 0, 0);
    return tasks.filter(t => t.completed && new Date(t.timestamp.toDate()).setHours(0, 0, 0, 0) === today)
        .reduce((sum, t) => sum + (t.points || 0), 0);
}

function isToday(timestamp) {
    const today = new Date().setHours(0, 0, 0, 0);
    return new Date(timestamp).setHours(0, 0, 0, 0) === today;
}

function calculateActivityScore(tasks, messages, rewards) {
    const taskScore = tasks.filter(t => t.completed).length * 10;
    const messageScore = messages.filter(m => m.from === slaveId).length * 5;
    const pointScore = (rewards.points || 0) / 10;
    return Math.round(taskScore + messageScore + pointScore);
}

// Management
function populateSlaveDropdowns() {
    const taskSlave = document.getElementById('taskSlave');
    const rewardSlave = document.getElementById('rewardSlave');
    const chatRecipient = document.getElementById('chatRecipient');
    db.collection('slaves').where('allowed', '==', true).onSnapshot(snap => {
        snap.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.innerText = doc.data().username;
            taskSlave.appendChild(option.cloneNode(true));
            rewardSlave.appendChild(option.cloneNode(true));
            chatRecipient.appendChild(option.cloneNode(true));
        });
    });
}

function loadManagement() {
    // Tasks
    document.getElementById('assignTask').addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value;
        const points = parseInt(document.getElementById('taskPoints').value);
        const slaveId = document.getElementById('taskSlave').value;
        if (title && points) {
            if (slaveId === 'all') {
                db.collection('slaves').where('allowed', '==', true).get().then(snap => {
                    snap.forEach(doc => {
                        db.collection('tasks').add({
                            slaveId: doc.id,
                            title: title,
                            points: points,
                            completed: false,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                });
            } else {
                db.collection('tasks').add({
                    slaveId: slaveId,
                    title: title,
                    points: points,
                    completed: false,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskPoints').value = '';
            showNotification('Task assigned.');
        }
    });

    db.collection('tasks').onSnapshot(snap => {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';
        snap.forEach(doc => {
            const task = doc.data();
            db.collection('slaves').doc(task.slaveId).get().then(slaveDoc => {
                taskList.innerHTML += `
                    <div class="item">
                        <span>${task.title} (${task.points} pts) - ${slaveDoc.data().username} ${task.completed ? '[Done]' : ''}</span>
                        <div>
                            <button class="btn" onclick="editTask('${doc.id}', '${task.title}', ${task.points})">Edit</button>
                            <button class="btn" onclick="deleteTask('${doc.id}')">Delete</button>
                        </div>
                    </div>
                `;
            });
        });
    });

    // Rewards
    document.getElementById('awardPoints').addEventListener('click', () => {
        const slaveId = document.getElementById('rewardSlave').value;
        const points = parseInt(document.getElementById('rewardPoints').value);
        if (slaveId && points) {
            db.collection('rewards').doc(slaveId).get().then(doc => {
                const currentPoints = doc.exists ? doc.data().points : 0;
                db.collection('rewards').doc(slaveId).set({ points: currentPoints + points });
                showNotification(`Awarded ${points} points to slave.`);
                document.getElementById('rewardPoints').value = '';
            });
        }
    });

    db.collection('rewards').onSnapshot(snap => {
        const rewardList = document.getElementById('rewardList');
        rewardList.innerHTML = '';
        snap.forEach(doc => {
            db.collection('slaves').doc(doc.id).get().then(slaveDoc => {
                rewardList.innerHTML += `<div class="item">${slaveDoc.data().username}<span>${doc.data().points} pts</span></div>`;
            });
        });
    });

    // Training
    document.getElementById('addLesson').addEventListener('click', () => {
        const title = document.getElementById('lessonTitle').value;
        if (title) {
            db.collection('lessons').add({ title, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            document.getElementById('lessonTitle').value = '';
            showNotification('Lesson added.');
        }
    });

    db.collection('lessons').onSnapshot(snap => {
        const lessonList = document.getElementById('lessonList');
        lessonList.innerHTML = '';
        snap.forEach(doc => {
            lessonList.innerHTML += `<div class="item">${doc.data().title}<button class="btn" onclick="deleteLesson('${doc.id}')">Delete</button></div>`;
        });
    });

    // Marketplace
    document.getElementById('addItem').addEventListener('click', () => {
        const name = document.getElementById('itemName').value;
        const cost = parseInt(document.getElementById('itemCost').value);
        if (name && cost) {
            db.collection('shop').add({ name, cost, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            document.getElementById('itemName').value = '';
            document.getElementById('itemCost').value = '';
            showNotification('Item added.');
        }
    });

    db.collection('shop').onSnapshot(snap => {
        const shopItems = document.getElementById('shopItems');
        shopItems.innerHTML = '';
        snap.forEach(doc => {
            shopItems.innerHTML += `<div class="item">${doc.data().name} (${doc.data().cost} pts)<button class="btn" onclick="deleteItem('${doc.id}')">Delete</button></div>`;
        });
    });

    // Events
    document.getElementById('createEvent').addEventListener('click', () => {
        const title = document.getElementById('eventTitle').value;
        const endDate = new Date(document.getElementById('eventEndDate').value);
        if (title && endDate) {
            db.collection('events').add({ title, endDate, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            document.getElementById('eventTitle').value = '';
            document.getElementById('eventEndDate').value = '';
            showNotification('Event created.');
        }
    });

    db.collection('events').onSnapshot(snap => {
        const eventList = document.getElementById('eventList');
        eventList.innerHTML = '';
        snap.forEach(doc => {
            eventList.innerHTML += `<div class="item">${doc.data().title} (Ends: ${new Date(doc.data().endDate.toDate()).toLocaleDateString()})<button class="btn" onclick="deleteEvent('${doc.id}')">Delete</button></div>`;
        });
    });
}

function editTask(taskId, title, points) {
    const newTitle = prompt('Edit Task Title:', title);
    const newPoints = parseInt(prompt('Edit Points:', points));
    if (newTitle && newPoints) {
        db.collection('tasks').doc(taskId).update({ title: newTitle, points: newPoints });
        showNotification('Task updated.');
    }
}

function deleteTask(taskId) {
    db.collection('tasks').doc(taskId).delete();
    showNotification('Task deleted.');
}

function deleteLesson(lessonId) {
    db.collection('lessons').doc(lessonId).delete();
    showNotification('Lesson deleted.');
}

function deleteItem(itemId) {
    db.collection('shop').doc(itemId).delete();
    showNotification('Item deleted.');
}

function deleteEvent(eventId) {
    db.collection('events').doc(eventId).delete();
    showNotification('Event deleted.');
}

// Communication
function loadCommunication(uid) {
    const chatList = document.getElementById('chatList');
    const chatMessages = document.getElementById('chatMessages');
    let currentChat = null;

    // Load chat list from Firestore (slaves), but messages from Realtime DB
    db.collection('slaves').where('allowed', '==', true).onSnapshot(snap => {
        chatList.innerHTML = '';
        snap.forEach(doc => {
            const slave = doc.data();
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.slaveId = doc.id;
            chatItem.innerHTML = `
                <div class="profile-circle">${slave.username.charAt(0).toUpperCase()}</div>
                <div class="chat-info">
                    <span class="chat-username">${slave.username}</span>
                    <span class="chat-last-message" id="lastMessage-${doc.id}"></span>
                </div>
                <span class="chat-timestamp" id="timestamp-${doc.id}"></span>
            `;
            chatItem.addEventListener('click', () => {
                document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
                chatItem.classList.add('active');
                currentChat = doc.id;
                loadChatMessages(doc.id, slave.username);
            });
            chatList.appendChild(chatItem);

            // Load last message and timestamp from Realtime DB
            firebase.database().ref(`chats/${doc.id}/messages`).orderByChild('timestamp').limitToLast(1).on('value', msgSnap => {
                const lastMsg = msgSnap.val();
                if (lastMsg) {
                    const msg = Object.values(lastMsg)[0];
                    document.getElementById(`lastMessage-${doc.id}`).innerText = msg.text;
                    document.getElementById(`timestamp-${doc.id}`).innerText = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            });
        });
    });

    function loadChatMessages(slaveId, username) {
        document.getElementById('chatRecipientName').innerText = username;
        document.getElementById('chatProfileCircle').innerText = username.charAt(0).toUpperCase();
        chatMessages.innerHTML = '';
        firebase.database().ref(`chats/${slaveId}/messages`).orderByChild('timestamp').on('value', snap => {
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

    function sendMessage() {
        const text = document.getElementById('chatInput').value.trim();
        if (text && currentChat) {
            const chatRef = firebase.database().ref(`chats/${currentChat}`);
            chatRef.child('slaveId').set(currentChat); // Ensure slaveId is set
            const newMessageRef = chatRef.child('messages').push();
            newMessageRef.set({
                from: uid,
                fromName: 'Goddess',
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                document.getElementById('chatInput').value = '';
                showNotification('Message sent.');
            }).catch(err => {
                showError('Failed to send message: ' + err.message);
            });
        }
    }

    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Commands and Announcements unchanged
    document.getElementById('sendCommand').addEventListener('click', () => {
        const text = document.getElementById('commandInput').value.trim();
        if (text) {
            db.collection('commands').add({ text, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            document.getElementById('commandInput').value = '';
            showNotification('Command proclaimed.');
        }
    });

    db.collection('commands').orderBy('timestamp', 'desc').limit(5).onSnapshot(snap => {
        const commandList = document.getElementById('commandList');
        commandList.innerHTML = '';
        snap.forEach(doc => commandList.innerHTML += `<div class="item">${doc.data().text}<button class="btn" onclick="deleteCommand('${doc.id}')">Delete</button></div>`);
    });

    document.getElementById('sendAnnouncement').addEventListener('click', () => {
        const text = document.getElementById('announcementInput').value.trim();
        if (text) {
            db.collection('announcements').add({ text, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            document.getElementById('announcementInput').value = '';
            showNotification('Announcement sent.');
        }
    });

    db.collection('announcements').orderBy('timestamp', 'desc').limit(5).onSnapshot(snap => {
        const announcementList = document.getElementById('announcementList');
        announcementList.innerHTML = '';
        snap.forEach(doc => announcementList.innerHTML += `<div class="item">${doc.data().text}<button class="btn" onclick="deleteAnnouncement('${doc.id}')">Delete</button></div>`);
    });
}

function replyMessage(slaveId, originalText) {
    const reply = prompt(`Replying to "${originalText}":`);
    if (reply) {
        db.collection('messages').add({
            from: auth.currentUser.uid,
            fromName: 'Goddess',
            to: slaveId,
            text: reply,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('Reply sent.');
    }
}

function deleteCommand(commandId) {
    db.collection('commands').doc(commandId).delete();
    showNotification('Command deleted.');
}

function deleteAnnouncement(announcementId) {
    db.collection('announcements').doc(announcementId).delete();
    showNotification('Announcement deleted.');
}

// Analytics
function loadAnalytics() {
    db.collection('rewards').onSnapshot(rewardSnap => {
        let totalPoints = 0;
        rewardSnap.forEach(doc => totalPoints += doc.data().points || 0);
        db.collection('slaves').where('allowed', '==', true).get().then(slaveSnap => {
            const avg = slaveSnap.size ? Math.round(totalPoints / slaveSnap.size) : 0;
            document.getElementById('avgPoints').innerText = avg;
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
                document.getElementById('mostActive').innerText = doc.data().username;
            });
        }
    });

    db.collection('messages').onSnapshot(snap => {
        document.getElementById('totalMessages').innerText = snap.size;
    });
}