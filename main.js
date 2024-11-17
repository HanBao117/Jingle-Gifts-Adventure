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

let player, ground, gifts, obstacles, scoreText;
let score = 0;
let dropSpeed = 50; // 初始掉落速度
let gameStarted = false;

function preload() {
    this.load.image('background', 'assets/background.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.image('santa', 'assets/santa.png');
    this.load.image('santaCry', 'assets/santa_cry.png');
    this.load.image('gift', 'assets/gift.png');
    this.load.image('poop', 'assets/poop.png');
    this.load.image('diaper', 'assets/diaper.png');
}

function create() {
    // 动态适配屏幕大小
    this.scale.scaleMode = Phaser.Scale.FIT;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;

    // 背景
    this.add.image(screenWidth / 2, screenHeight / 2, 'background');

    // 地面
    ground = this.physics.add.staticGroup();
    ground.create(screenWidth / 2, screenHeight - 20, 'ground').setScale(1.5, 0.5).refreshBody();

    // Santa
    player = this.physics.add.sprite(screenWidth / 2, screenHeight - 100, 'santa');
    player.setScale(0.4);
    player.setCollideWorldBounds(true);

    // 礼物和障碍物组
    gifts = this.physics.add.group();
    obstacles = this.physics.add.group();

    // 玩家与礼物的碰撞
    this.physics.add.overlap(player, gifts, catchGift, null, this);

    // 玩家与障碍物的碰撞
    this.physics.add.overlap(player, obstacles, hitObstacle, null, this);

    // 分数显示
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });

    // 触摸屏控制
    this.input.on('pointermove', (pointer) => {
        if (pointer.x < player.x) {
            player.setVelocityX(-400);
        } else if (pointer.x > player.x) {
            player.setVelocityX(400);
        } else {
            player.setVelocityX(0);
        }
    });

    // 开始按钮
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Game';
    document.body.appendChild(startButton);

    startButton.addEventListener('click', () => {
        startButton.style.display = 'none';
        gameStarted = true;

        // 定时生成礼物和障碍物
        this.time.addEvent({
            delay: 1500,
            callback: dropItems,
            callbackScope: this,
            loop: true
        });
    });
}

function update() {
    if (!gameStarted) return;

    // 删除超出屏幕的物体
    gifts.children.iterate((gift) => {
        if (gift.y > screenHeight) {
            gift.destroy();
        }
    });

    obstacles.children.iterate((obstacle) => {
        if (obstacle.y > screenHeight) {
            obstacle.destroy();
        }
    });

    // 掉落速度逐渐增加
    dropSpeed += 0.001;
}

// 生成礼物或障碍物
function dropItems() {
    const x = Phaser.Math.Between(50, screenWidth - 50);
    const isGift = Phaser.Math.Between(0, 1) === 0;

    if (isGift) {
        const gift = gifts.create(x, 50, 'gift');
        gift.setScale(0.1);
        gift.setVelocityY(dropSpeed);
    } else {
        const obstacleType = Phaser.Math.Between(0, 1) === 0 ? 'poop' : 'diaper';
        const obstacle = obstacles.create(x, 50, obstacleType);
        obstacle.setScale(0.1);
        obstacle.setVelocityY(dropSpeed);
    }
}

// 接住礼物
function catchGift(player, gift) {
    gift.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score);
}

// 接住障碍物
function hitObstacle(player, obstacle) {
    obstacle.disableBody(true, true);
    score -= 20;
    if (score < 0) score = 0;
    scoreText.setText('Score: ' + score);

    player.setTexture('santaCry');
    this.time.delayedCall(500, () => {
        player.setTexture('santa');
    });
}
