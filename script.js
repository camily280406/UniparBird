const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

/* Elementos da Interface */
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("gameover-screen");
const playerNameInput = document.getElementById("player-name");
const btnStart = document.getElementById("btn-start");
const btnRestart = document.getElementById("btn-restart");
const btnNewPlayer = document.getElementById("btn-new-player");
const btnClearScores = document.getElementById("btn-clear-scores");
const finalScoreText = document.getElementById("final-score-text");
const currentPlayerText = document.getElementById("current-player-text");

/* Imagens do Jogo */
const birds = {
    classico: new Image(),
    colorido: new Image(),
    preto: new Image(),
    azul: new Image()
};

birds.classico.src = "bird.png";
birds.colorido.src = "bird-colorido.png";
birds.preto.src = "bird-preto.png";
birds.azul.src = "bird-azul.png";

let currentBirdKey = "classico";
let currentBirdImg = birds.classico;

const cloudImg = new Image();
cloudImg.src = "cloud.png";

const pipeImg = new Image();
pipeImg.src = "pipe.png";

const logoImg = new Image();
logoImg.src = "unipar-logo.png";

/* Proporções do Passarinho */
let birdWidth = 40;
let birdHeight = 30;

function updateBirdDimensions() {
    if (currentBirdImg.complete && currentBirdImg.naturalWidth !== 0) {
        const aspectRatio = currentBirdImg.naturalWidth / currentBirdImg.naturalHeight;
        birdWidth = 40;
        birdHeight = 40 / aspectRatio;
    }
}

function syncBirdSelection(selectedKey) {
    currentBirdKey = selectedKey;
    currentBirdImg = birds[selectedKey];
    updateBirdDimensions();

    document.querySelectorAll('input[name="bird-select"]').forEach(radio => {
        radio.checked = (radio.value === selectedKey);
    });
    document.querySelectorAll('input[name="bird-select-go"]').forEach(radio => {
        radio.checked = (radio.value === selectedKey);
    });
}

document.querySelectorAll('input[name="bird-select"]').forEach(radio => {
    radio.addEventListener('change', (e) => syncBirdSelection(e.target.value));
});
document.querySelectorAll('input[name="bird-select-go"]').forEach(radio => {
    radio.addEventListener('change', (e) => syncBirdSelection(e.target.value));
});

/* Estado e Física do Jogo */
let currentPlayer = "";
let birdX = 60;
let birdY = 200;
let gravity = 0.38;
let velocity = 0;
let jump = -6.5;

let pipes = [];
let pipeWidth = 60;
let pipeGap = 150;

let clouds = [];
let frameCount = 0;
let score = 0;
let isPlaying = false;

/* Eventos dos Botoes e Teclado */
btnStart.addEventListener("click", () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert("Por favor, digite seu nome!");
        return;
    }
    currentPlayer = name;
    startScreen.classList.add("hidden");
    startGame();
});

btnRestart.addEventListener("click", () => {
    gameOverScreen.classList.add("hidden");
    startGame();
});

btnNewPlayer.addEventListener("click", () => {
    gameOverScreen.classList.remove("hidden");
    startScreen.classList.remove("hidden");
    gameOverScreen.classList.add("hidden");
    playerNameInput.value = "";
    playerNameInput.focus();
    updateLeaderboardDisplays();
});

if (btnClearScores) {
    btnClearScores.addEventListener("click", () => {
        if (confirm("Tem certeza que deseja apagar todos os recordes do evento?")) {
            localStorage.removeItem("flappy_scores");
            updateLeaderboardDisplays();
        }
    });
}

function handleJump() {
    if (isPlaying) {
        velocity = jump;
    }
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") handleJump();
});
canvas.addEventListener("click", handleJump);

/* Gerenciamento do Ranking */
function getScores() {
    const data = localStorage.getItem("flappy_scores");
    return data ? JSON.parse(data) : [];
}

function saveScore(playerName, playerScore) {
    let scores = getScores();
    const cleanName = playerName.trim();
    
    const existingIndex = scores.findIndex(
        entry => entry.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existingIndex !== -1) {
        if (playerScore > scores[existingIndex].score) {
            scores[existingIndex].score = playerScore;
            scores[existingIndex].date = new Date().toLocaleDateString();
        }
    } else {
        scores.push({ 
            name: cleanName, 
            score: playerScore, 
            date: new Date().toLocaleDateString() 
        });
    }
    
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10);
    localStorage.setItem("flappy_scores", JSON.stringify(scores));
}

function renderLeaderboard(elementId) {
    const list = document.getElementById(elementId);
    if (!list) return;
    
    list.innerHTML = "";
    const scores = getScores();

    if (scores.length === 0) {
        list.innerHTML = "<li>Sem recordes ainda!</li>";
        return;
    }

    scores.forEach((entry) => {
        const li = document.createElement("li");
        li.textContent = `${entry.name}: ${entry.score} pts`;
        list.appendChild(li);
    });
}

function updateLeaderboardDisplays() {
    renderLeaderboard("leaderboard-list");
    renderLeaderboard("leaderboard-list-gameover");
}

/* Loop do Jogo */
function startGame() {
    resizeCanvas();
    updateBirdDimensions();
    birdY = canvas.height / 3;
    velocity = 0;
    pipes = [];
    clouds = [
        { x: 50, y: 50, speed: 0.4, size: 70 },
        { x: 250, y: 120, speed: 0.2, size: 90 }
    ];
    score = 0;
    frameCount = 0;
    isPlaying = true;
    loop();
}

function update() {
    if (!isPlaying) return;

    velocity += gravity;
    birdY += velocity;

    /* Nuvens */
    if (frameCount % 100 === 0) {
        clouds.push({
            x: canvas.width,
            y: Math.random() * (canvas.height / 2),
            speed: 0.3 + Math.random() * 0.4,
            size: 60 + Math.random() * 40
        });
    }
    for (let c of clouds) c.x -= c.speed;
    clouds = clouds.filter(c => c.x + c.size > 0);

    /* Obstaculos */
    if (frameCount % 100 === 0) {
        let topPipeHeight = Math.floor(Math.random() * (canvas.height - pipeGap - 100)) + 40;
        pipes.push({
            x: canvas.width,
            top: topPipeHeight,
            bottom: canvas.height - topPipeHeight - pipeGap,
            passed: false
        });
    }

    for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= 2.5;

        if (!p.passed && p.x < birdX) {
            score++;
            p.passed = true;
        }

        /* Colisao */
        if (
            birdX + birdWidth > p.x && birdX < p.x + pipeWidth &&
            (birdY < p.top || birdY + birdHeight > canvas.height - p.bottom)
        ) {
            endGame();
            return;
        }
    }

    if (birdY + birdHeight >= canvas.height || birdY <= 0) {
        endGame();
        return;
    }

    pipes = pipes.filter(p => p.x + pipeWidth > 0);
    frameCount++;
}

function draw() {
    /* 1. Fundo */
    ctx.fillStyle = "#70c5ce";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* 2. Nuvens */
    for (let c of clouds) {
        if (cloudImg.complete && cloudImg.naturalWidth !== 0) {
            ctx.drawImage(cloudImg, c.x, c.y, c.size, c.size * 0.6);
        } else {
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.size / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* 3. Obstaculos */
    for (let p of pipes) {
        if (pipeImg.complete && pipeImg.naturalWidth !== 0) {
            ctx.save();
            ctx.translate(p.x + pipeWidth / 2, p.top / 2);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg, -pipeWidth / 2, -p.top / 2, pipeWidth, p.top);
            ctx.restore();

            ctx.drawImage(pipeImg, p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
        } else {
            ctx.fillStyle = "#73bf2e";
            ctx.fillRect(p.x, 0, pipeWidth, p.top);
            ctx.fillRect(p.x, canvas.height - p.bottom, pipeWidth, p.bottom);
        }
    }

    /* 4. Jogador */
    ctx.save();
    ctx.translate(birdX + birdWidth / 2, birdY + birdHeight / 2);
    let angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (velocity / 10)));
    ctx.rotate(angle);

    if (currentBirdImg.complete && currentBirdImg.naturalWidth !== 0) {
        ctx.drawImage(currentBirdImg, -birdWidth / 2, -birdHeight / 2, birdWidth, birdHeight);
    } else {
        ctx.fillStyle = "#f1c40f";
        ctx.fillRect(-birdWidth / 2, -birdHeight / 2, birdWidth, birdHeight);
    }
    ctx.restore();

    /* 5. Logo Unipar */
    if (logoImg.complete && logoImg.naturalWidth !== 0) {
        const logoWidth = 70;
        const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
        ctx.drawImage(logoImg, canvas.width - logoWidth - 15, 15, logoWidth, logoHeight);
    }

    /* 6. Interface em jogo */
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Arial";
    ctx.fillText(`Pontos: ${score}`, 15, 30);
    ctx.fillText(`Jogador: ${currentPlayer}`, 15, 55);
}

function endGame() {
    isPlaying = false;
    saveScore(currentPlayer, score);
    
    finalScoreText.textContent = `Pontuação: ${score}`;
    currentPlayerText.textContent = `Jogador: ${currentPlayer}`;
    
    updateLeaderboardDisplays();
    gameOverScreen.classList.remove("hidden");
}

function loop() {
    update();
    draw();
    if (isPlaying) {
        requestAnimationFrame(loop);
    }
}

updateLeaderboardDisplays();