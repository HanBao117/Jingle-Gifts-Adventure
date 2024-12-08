const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

const config = {
    type: Phaser.AUTO,
    width: screenWidth,
    height: screenHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let scene;
let body, head, gifts, obstacles, lifeText, timerText, backgroundMusic, currentPlayer;
let score = 0;
let lives = 3;
let gameStarted = false;
let countdown = 60;
let headRotationSpeed = 0.005;
let headRotationAmplitude = 0.4;
let targetX = screenWidth / 2;

let countdownEvent; 
let dropEvent;      

let soundLife;   
let soundHit;    

// 根据你的数据映射
const childPhones = {
    1:  ["021776930", "0277273017"],
    2:  ["0273472347", "0273461680"],
    3:  ["0224708531", "0225174947"],
    4:  ["0211063718", "0212222283"],
    5:  ["021939511", "021850302"],
    6:  ["xxxxxxxx", "xxxxxxx"],
    7:  ["0274062391", "0223458748"],
    8:  ["021657576", "0210782358"],
    9:  ["xxxxxxx1", "xxxxxxxx11"],
    10: ["xxxxxxxx2", "xxxxxxxx22"],
    11:["021723726", "0274572676"],
    12:["0212408006","0211231711"],
    13:["02041895031","02108150046"],
    14:["0225340336","0225365126"],
    15:["0276128748"],
    16:["xxxxxxxx3","xxxxxxxx33"]
};

const phoneToChild = {};
for (let c = 1; c <= 16; c++) {
    let phones = childPhones[c];
    phones.forEach(p => {
        if (p && p.trim() !== '' && !p.includes('xxxxxxx')) {
            phoneToChild[p] = c;
        }
    });
}

const giftTypes = ['gift1', 'gift2', 'gift3', 'gift4', 'gift5', 'gift6', 'gift7', 'gift8', 'gift9', 'gift10'];
const poopTypes = ['poop1', 'poop2', 'poop3', 'poop4'];

function preload() {
    giftTypes.forEach((gift) => {
        this.load.image(gift, `assets/${gift}.png`);
    });

    poopTypes.forEach((poop) => {
        this.load.image(poop, `assets/${poop}.png`);
    });

    for (let i = 1; i <= 16; i++) {
        this.load.image(`avatar_child${i}`, `assets/avatar_child${i}.png`);
    }

    this.load.image('santa_body', 'assets/santa_body.png');
    this.load.image('santa_head', 'assets/santa_head.png');

    this.load.audio('bg_music', 'assets/background_music.mp3');
    this.load.audio('sound_life', 'assets/sound_life.mp3');
    this.load.audio('sound_hit', 'assets/sound_hit.mp3');

    this.load.video('snowvideo', 'assets/snowvideo.mp4', 'loadeddata', false, true);
}

function create() {
    scene = this;
    this.scale.scaleMode = Phaser.Scale.FIT;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;

    const video = this.add.video(screenWidth / 2, screenHeight / 2, 'snowvideo');
    video.setOrigin(0.5);
    video.setDisplaySize(screenWidth * 0.55, screenHeight * 0.32);
    video.play(true);
    video.setDepth(-10);

    // 身体由0.2变0.3
    body = this.physics.add.sprite(screenWidth / 2, screenHeight - 150, 'santa_body');
    body.setScale(0.3); 
    body.setCollideWorldBounds(true);
    body.visible = false;

    // 默认头部0.15变0.225，child16保持0.15
    head = this.add.sprite(body.x, body.y - 30, 'santa_head');
    head.setScale(0.225); 
    head.setOrigin(0.5, 0.6);
    head.visible = false;

    gifts = this.physics.add.group();
    obstacles = this.physics.add.group();

    this.physics.add.overlap(body, gifts, catchGift, null, this);
    this.physics.add.overlap(body, obstacles, hitObstacle, null, this);

    lifeText = this.add.text(16, 16, '❤️❤️❤️', { fontSize: '32px', fill: '#fff' });
    timerText = this.add.text(screenWidth - 200, 16, `Time: ${countdown}`, { fontSize: '32px', fill: '#fff' });

    backgroundMusic = this.sound.add('bg_music');
    backgroundMusic.play({ loop: true, volume: 0.5 });

    soundLife = this.sound.add('sound_life');
    soundLife.setVolume(0.5);
    soundHit = this.sound.add('sound_hit');
    soundHit.setVolume(0.5);

    this.input.on('pointermove', (pointer) => {
        targetX = Phaser.Math.Clamp(pointer.x, 50, screenWidth - 50);
    });

    showGameIntroduction();
}

function update() {
    if (!gameStarted) return;

    const smoothness = 0.1;
    body.x += (targetX - body.x) * smoothness;
    head.x = body.x;

    if (currentPlayer) {
        if (currentPlayer.avatar === 'avatar_child15') {
            head.y = body.y - 12;
            head.setScale(0.225); 
            head.setOrigin(0.5, 0.6);
            head.setTexture('avatar_child15');
        } else if (currentPlayer.avatar === 'avatar_child16') {
            head.y = body.y - 30;
            head.setScale(0.15); // 保持不变
            head.setOrigin(0.5, 0.8);
            head.setTexture('avatar_child16');
        } else {
            head.y = body.y - 30;
            head.setScale(0.225); 
            head.setOrigin(0.5, 0.75);
            head.setTexture(currentPlayer.avatar);
        }
    }

    head.rotation = Math.sin(scene.time.now * headRotationSpeed) * headRotationAmplitude;

    gifts.children.iterate((gift) => {
        if (gift.y > screenHeight) {
            gifts.killAndHide(gift);
        }
    });

    obstacles.children.iterate((obstacle) => {
        if (obstacle.y > screenHeight) {
            obstacles.killAndHide(obstacle);
        } else {
            const type = obstacle.getData('type');
            const dx = body.x - obstacle.x;
            if (type === 'poop4') {
                obstacle.setVelocityX(dx * 0.4);
            } else if (type === 'poop3' || type === 'poop2' || type === 'poop1') {
                obstacle.setVelocityX(dx * 0.3);
            }
        }
    });
}

function showGameIntroduction() {
    const introDiv = document.createElement('div');
    introDiv.style.position = 'absolute';
    introDiv.style.top = '50%';
    introDiv.style.left = '50%';
    introDiv.style.transform = 'translate(-50%, -50%)';
    introDiv.style.backgroundColor = '#fff';
    introDiv.style.padding = '20px';
    introDiv.style.borderRadius = '10px';
    introDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    introDiv.style.zIndex = '1000';
    introDiv.style.textAlign = 'center';

    const title = document.createElement('h2');
    title.textContent = '🎅 Welcome to the Children’s Christmas Adventure! 🎄';
    introDiv.appendChild(title);

    const rules = document.createElement('p');
    // 这里替换为你要求的英文说明
    rules.textContent = 'Collect gifts while avoiding poop 💩! Use touch to move left and right. Catch gifts to increase life. Avoid poop and see how long you can last!';
    rules.style.marginBottom = '30px';
    introDiv.appendChild(rules);

    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    startButton.style.padding = '10px 20px';
    startButton.style.fontSize = '16px';
    startButton.style.backgroundColor = '#28a745';
    startButton.style.color = '#fff';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '5px';
    startButton.style.cursor = 'pointer';
    startButton.style.marginTop = '200px'; 

    startButton.addEventListener('click', () => {
        document.body.removeChild(introDiv);
        promptPlayerLogin();
    });

    introDiv.appendChild(startButton);
    document.body.appendChild(introDiv);
}

function promptPlayerLogin() {
    const loginDiv = document.createElement('div');
    loginDiv.style.position = 'absolute';
    loginDiv.style.top = '30%';
    loginDiv.style.left = '50%';
    loginDiv.style.transform = 'translate(-50%, -50%)';
    loginDiv.style.backgroundColor = '#fff';
    loginDiv.style.padding = '20px';
    loginDiv.style.borderRadius = '10px';
    loginDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    loginDiv.style.zIndex = '1000';

    const loginTitle = document.createElement('h3');
    loginTitle.textContent = 'Enter parent’s phone number or player number (1-16)';
    loginDiv.appendChild(loginTitle);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Phone number or 1-16';
    input.style.display = 'block';
    input.style.marginTop = '10px';
    loginDiv.appendChild(input);

    const errorText = document.createElement('p');
    errorText.style.color = 'red';
    errorText.style.display = 'none';
    errorText.textContent = 'Invalid input. Please enter a valid phone number or a number between 1 and 16.';
    loginDiv.appendChild(errorText);

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Confirm';
    submitButton.style.marginTop = '120px'; 
    submitButton.style.padding = '10px 20px';
    submitButton.style.fontSize = '16px';
    submitButton.style.backgroundColor = '#007bff';
    submitButton.style.color = '#fff';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '5px';
    submitButton.style.cursor = 'pointer';

    submitButton.addEventListener('click', () => {
        const val = input.value.trim();
        let childNum = null;
        if (/^\d+$/.test(val)) {
            const num = parseInt(val,10);
            if (num >=1 && num <=16) {
                childNum = num;
            }
        }
        if (childNum === null) {
            if (phoneToChild[val]) {
                childNum = phoneToChild[val];
            }
        }

        if (childNum) {
            currentPlayer = { playerNumber: childNum, avatar: `avatar_child${childNum}` };
            document.body.removeChild(loginDiv);
            startGame();
        } else {
            errorText.style.display = 'block';
        }
    });
    loginDiv.appendChild(submitButton);

    document.body.appendChild(loginDiv);
}

function startGame() {
    score = 0;
    lives = 3;
    countdown = 60;
    lifeText.setText('❤️❤️❤️');
    timerText.setText(`Time: ${countdown}`);
    gameStarted = true;

    body.visible = true;
    head.visible = true;
    head.setTexture(currentPlayer.avatar);

    backgroundMusic.stop();
    backgroundMusic.play({ loop: true, volume: 0.5 });

    countdownEvent = scene.time.addEvent({
        delay: 1000,
        callback: updateCountdown,
        loop: true
    });

    dropEvent = scene.time.addEvent({
        delay: 1500,
        callback: dropItems,
        loop: true
    });
}

function updateCountdown() {
    if (!gameStarted) return;
    if (countdown > 0) {
        countdown--;
        timerText.setText(`Time: ${countdown}`);
    } else {
        endGame('win');
    }
}

function dropItems() {
    if (!gameStarted) return;

    let itemCount = Phaser.Math.Between(1, 3);
    for (let i = 0; i < itemCount; i++) {
        const x = Phaser.Math.Between(50, screenWidth - 50);
        const spawnY = Phaser.Math.Between(20, 150);

        let giftChance = (countdown <= 10) ? 5 : 2; 
        const isGift = (Phaser.Math.Between(1, giftChance) === 1);

        if (isGift) {
            const giftType = giftTypes[Phaser.Math.Between(0, giftTypes.length - 1)];
            // 礼物0.15变0.225
            const gift = gifts.create(x, spawnY, giftType);
            gift.setScale(0.225); 
            gift.setVelocityY(100);
        } else {
            let possiblePoops = [];
            let speedY = 100;
            if (countdown > 40) {
                possiblePoops = ['poop1'];
                speedY = 100;
            } else if (countdown > 20) {
                possiblePoops = ['poop1','poop2'];
                speedY = 120;
            } else if (countdown > 10) {
                possiblePoops = ['poop1','poop2','poop3'];
                speedY = 140;
            } else {
                possiblePoops = ['poop1','poop2','poop3','poop4'];
                speedY = 150;
            }

            const poopType = possiblePoops[Phaser.Math.Between(0, possiblePoops.length - 1)];
            // poop保持0.05不变
            const poop = obstacles.create(x, spawnY, poopType);
            poop.setScale(0.05); 
            poop.setVelocityY(speedY);

            if (poopType === 'poop4') {
                poop.setData('type', 'poop4');
            } else if (poopType === 'poop3') {
                poop.setData('type', 'poop3');
            } else if (poopType === 'poop2') {
                poop.setData('type', 'poop2');
            } else if (poopType === 'poop1') {
                poop.setData('type', 'poop1');
            }
        }
    }
}

function catchGift(body, gift) {
    if (!gameStarted) return;
    gift.disableBody(true, true);
    score += 10;
    if (score % 50 === 0) {
        lives += 1;
        updateLifeDisplay();
        soundLife.play();
    }
}

function hitObstacle(body, obstacle) {
    if (!gameStarted) return;
    obstacle.disableBody(true, true);
    lives -= 1;
    soundHit.play();
    if (lives <= 0) {
        endGame('lose');
    } else {
        updateLifeDisplay();
    }
}

function updateLifeDisplay() {
    lifeText.setText('❤️'.repeat(lives));
}

function endGame(result) {
    gameStarted = false;
    backgroundMusic.stop();

    if (countdownEvent) countdownEvent.remove();
    if (dropEvent) dropEvent.remove();

    const resultText = (result === 'win') ? 'YOU WIN!' : 'Game Over!';
    const resultColor = (result === 'win') ? '#28a745' : '#dc3545';

    const resultDisplay = scene.add.text(screenWidth / 2, screenHeight / 2, resultText, {
        fontSize: '64px',
        fill: resultColor
    }).setOrigin(0.5);

    const buttonText = (result === 'win') ? 'Restart' : 'Try Again';
    const restartButton = scene.add.text(screenWidth / 2, screenHeight / 2 + 100, buttonText, {
        fontSize: '32px',
        fill: '#fff',
        backgroundColor: '#007bff',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    restartButton.on('pointerdown', () => {
        restartButton.destroy();
        resultDisplay.destroy();
        startGame();
    });
}
