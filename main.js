// Button Event Listeners
document.getElementById('loginBtn').addEventListener('click', loginUser);
document.getElementById('signupBtn').addEventListener('click', () => {
    loadModal('signupModal', createSignupModal);
});

// Error Popup Functions
function showError(message) {
    const popup = document.getElementById('errorPopup');
    const messageSpan = document.getElementById('errorMessage');
    messageSpan.innerText = message;
    popup.style.display = 'flex';
    setTimeout(hideError, 5000); // Auto-hide after 5 seconds
}

function hideError() {
    document.getElementById('errorPopup').style.display = 'none';
}

// Authentication Functions
function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            return db.collection('slaves').doc(user.uid).get();
        })
        .then(doc => {
            if (doc.exists && doc.data().allowed) {
                window.location.href = './slave/index.html';
            } else {
                showError('Access denied. Await Goddess approval.');
            }
        })
        .catch(error => {
            showError(`${error.message}\nNot a slave yet? Sign Up`);
        });
}

function signupUser(step) {
    if (step === 1) {
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                const user = userCredential.user;
                user.sendEmailVerification();
                nextSignupStep(1);
                checkEmailVerification();
            })
            .catch(error => showError(error.message));
    } else if (step === 4) {
        const username = document.getElementById('signupUsername').value;
        const user = auth.currentUser;
        db.collection('slaves').doc(user.uid).set({
            email: user.email,
            username: username,
            allowed: false,
            request: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            showError('Request sent to Princess Beka. Await her approval.');
            closeModal('signupModal');
        }).catch(error => showError(error.message));
    }
}

function checkEmailVerification() {
    const interval = setInterval(() => {
        auth.currentUser.reload().then(() => {
            if (auth.currentUser.emailVerified) {
                document.getElementById('step2Next').disabled = false;
                clearInterval(interval);
            }
        });
    }, 1000);
}

function nextSignupStep(step) {
    document.getElementById(`signupStep${step}`).style.display = 'none';
    document.getElementById(`signupStep${step + 1}`).style.display = 'block';
}

// Modal Content Creation
function createSignupModal() {
    return `
        <div class="modal-content">
            <span class="close" onclick="closeModal('signupModal')"><svg style="width: 20px; height: 20px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></span>
            <h2>Join the Realm</h2>
            <div id="signupStep1">
                <p>Enter your credentials to begin.</p>
                <input type="email" id="signupEmail" placeholder="Email" required>
                <input type="password" id="signupPassword" placeholder="Password" required>
                <button class="btn signup" onclick="signupUser(1)">Next</button>
            </div>
            <div id="signupStep2" style="display:none">
                <p>Verify your email to proceed.</p>
                <button id="step2Next" class="btn signup" disabled onclick="nextSignupStep(2)">Next</button>
            </div>
            <div id="signupStep3" style="display:none">
                <p>Select your servant name.</p>
                <input type="text" id="signupUsername" placeholder="Username" required>
                <button class="btn signup" onclick="nextSignupStep(3)">Next</button>
            </div>
            <div id="signupStep4" style="display:none">
                <p><strong>Terms:</strong></p>
                <p>Serve Princess Beka with absolute loyalty.</p>
                <button class="btn signup" onclick="signupUser(4)"> Agree & Request</button>
            </div>
        </div>
    `;
}