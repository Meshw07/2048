class Game2048 {
    constructor() {
        this.gridSize = 4;
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('best2048')) || 0;
        this.unlockedLevels = [3, 4, 5, 6, 7];
        this.grid = [];
        this.isGameOver = false;
        this.isMoving = false;
        this.hasWon = false;
        this.isPaused = false;
        this.suppressSelectChange = false;

        this.gridContainer = document.getElementById('grid-container');
        this.scoreEl = document.getElementById('score');
        this.bestScoreEl = document.getElementById('best-score');
        this.levelText = document.getElementById('level-text');
        this.targetText = document.getElementById('target-text');
        this.messageContainer = document.getElementById('message-container');
        this.messageText = document.getElementById('message-text');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.tryAgainBtn = document.getElementById('try-again-btn');
        this.levelSelectOverlay = document.getElementById('level-select-overlay');
        this.levelButtons = document.getElementById('level-buttons');
        this.levelLockMsg = document.getElementById('level-lock-msg');
        this.currentLevelBadge = document.getElementById('current-level-badge');

        this.bestScoreEl.textContent = this.bestScore;
        this.updateLevelButtons();

        document.getElementById('toggle-instructions-btn').addEventListener('click', () => {
            const instr = document.getElementById('instructions');
            const btn = document.getElementById('toggle-instructions-btn');
            if (instr.style.display === 'none') {
                instr.style.display = 'block';
                btn.textContent = 'How to Play ▴';
            } else {
                instr.style.display = 'none';
                btn.textContent = 'How to Play ▾';
            }
        });

        this.newGameBtn.addEventListener('click', () => {
            this.showLevelSelect();
        });
        this.tryAgainBtn.addEventListener('click', () => {
            this.messageContainer.style.display = 'none';
            this.isPaused = false;
            this.showLevelSelect();
        });
        document.addEventListener('keydown', (e) => this.handleKey(e));

        let touchStartX, touchStartY;
        this.gridContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        this.gridContainer.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.max(Math.abs(dx), Math.abs(dy)) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.move(dx > 0 ? 'right' : 'left');
                } else {
                    this.move(dy > 0 ? 'down' : 'up');
                }
            }
        });

        this.newGame();
    }

    updateLevelButtons() {
        this.levelButtons.innerHTML = '';
        const allLevels = [
            { size: 3, label: 'Level 1', sub: '3×3' },
            { size: 4, label: 'Level 2', sub: '4×4' },
            { size: 5, label: 'Level 3', sub: '5×5' },
            { size: 6, label: 'Level 4', sub: '6×6' },
            { size: 7, label: 'Level 5', sub: '7×7' }
        ];
        const lockedLevels = allLevels.filter(l => !this.unlockedLevels.includes(l.size));
        this.levelLockMsg.textContent = lockedLevels.length > 0 ? 'Complete earlier levels to unlock more!' : '';
        allLevels.forEach(level => {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.setAttribute('data-size', level.size);
            const unlocked = this.unlockedLevels.includes(level.size);
            btn.innerHTML = unlocked ? level.label + '<br><small>' + level.sub + '</small>' : level.label + ' 🔒<br><small>' + level.sub + '</small>';
            btn.disabled = !unlocked;
            btn.addEventListener('click', () => {
                if (!unlocked) return;
                this.gridSize = level.size;
                this.hideLevelSelect();
                this.newGame();
            });
            this.levelButtons.appendChild(btn);
        });
    }

    showLevelSelect() {
        this.updateLevelButtons();
        this.levelSelectOverlay.style.display = 'flex';
    }

    hideLevelSelect() {
        this.levelSelectOverlay.style.display = 'none';
    }

    updateLevelBadge() {
        const level = this.getLevel();
        this.currentLevelBadge.textContent = 'Level ' + level + ' (' + this.gridSize + '×' + this.gridSize + ')';
    }

    getTarget() {
        const targets = { 3: 128, 4: 1024, 5: 2048, 6: 4096, 7: 8192 };
        return targets[this.gridSize] || 2048;
    }

    getLevel() {
        const levels = { 3: 1, 4: 2, 5: 3, 6: 4, 7: 5 };
        return levels[this.gridSize] || 2;
    }

    updateLevelInfo() {
        this.levelText.textContent = 'Level ' + this.getLevel() + ' - ' + this.gridSize + 'x' + this.gridSize + ' Grid';
        this.targetText.textContent = 'Target: ' + this.getTarget();
    }

    newGame() {
        this.grid = [];
        for (let r = 0; r < this.gridSize; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.gridSize; c++) {
                this.grid[r][c] = 0;
            }
        }
        this.score = 0;
        this.isGameOver = false;
        this.isMoving = false;
        this.hasWon = false;
        this.isPaused = false;
        this.messageContainer.style.display = 'none';
        this.updateLevelInfo();
        this.updateLevelBadge();
        this.renderGrid();
        this.addRandomTile();
        this.addRandomTile();
        this.updateScore();
    }

    renderGrid() {
        this.gridContainer.innerHTML = '';
        const containerWidth = this.gridContainer.clientWidth - 20;
        const gap = Math.max(6, Math.floor(containerWidth * 0.02));
        const cellSize = Math.floor((containerWidth - gap * (this.gridSize - 1)) / this.gridSize);
        this.gridContainer.style.height = (cellSize * this.gridSize + gap * (this.gridSize - 1) + 20) + 'px';
        this.cellSize = cellSize;
        this.gap = gap;

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.width = cellSize + 'px';
                cell.style.height = cellSize + 'px';
                cell.style.top = (r * (cellSize + gap) + 10) + 'px';
                cell.style.left = (c * (cellSize + gap) + 10) + 'px';
                this.gridContainer.appendChild(cell);
            }
        }
        this.renderAllTiles();
    }

    renderAllTiles() {
        this.gridContainer.querySelectorAll('.tile').forEach(el => el.remove());
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] !== 0) {
                    const el = this.createTileElement(r, c, this.grid[r][c], false, false);
                    this.gridContainer.appendChild(el);
                }
            }
        }
    }

    createTileElement(row, col, value, isNew, isMerged) {
        const el = document.createElement('div');
        let cls = 'tile tile-' + (value <= 2048 ? value : 'super');
        if (isNew) cls += ' tile-new';
        if (isMerged) cls += ' tile-merged';
        el.className = cls;
        el.style.width = this.cellSize + 'px';
        el.style.height = this.cellSize + 'px';
        el.style.top = (row * (this.cellSize + this.gap) + 10) + 'px';
        el.style.left = (col * (this.cellSize + this.gap) + 10) + 'px';
        el.style.lineHeight = this.cellSize + 'px';
        el.style.fontSize = this.getFontSize(value) + 'px';
        el.textContent = value;
        return el;
    }

    getFontSize(value) {
        const base = this.cellSize * 0.45;
        if (value >= 100000) return base * 0.5;
        if (value >= 10000) return base * 0.6;
        if (value >= 1000) return base * 0.75;
        return base;
    }

    addRandomTile() {
        const empty = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) empty.push({ r, c });
            }
        }
        if (empty.length === 0) return;
        const { r, c } = empty[Math.floor(Math.random() * empty.length)];
        this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
        const el = this.createTileElement(r, c, this.grid[r][c], true, false);
        this.gridContainer.appendChild(el);
    }

    handleKey(e) {
        if (this.isGameOver || this.isMoving || this.isPaused) return;
        const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
        if (map[e.key]) {
            e.preventDefault();
            this.move(map[e.key]);
        }
    }

    slideRow(row) {
        let filtered = row.filter(v => v !== 0);
        let merged = [];
        let score = 0;
        let mergedIndices = [];
        for (let i = 0; i < filtered.length; i++) {
            if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
                let newVal = filtered[i] * 2;
                merged.push(newVal);
                score += newVal;
                mergedIndices.push(merged.length - 1);
                i++;
            } else {
                merged.push(filtered[i]);
            }
        }
        while (merged.length < this.gridSize) merged.push(0);
        return { result: merged, score: score, mergedIndices: mergedIndices };
    }

    move(direction) {
        if (this.isGameOver || this.isMoving || this.isPaused) return;
        this.isMoving = true;

        let moved = false;
        let totalScore = 0;
        let mergedPositions = new Set();
        const prevGrid = this.grid.map(r => [...r]);

        if (direction === 'left') {
            for (let r = 0; r < this.gridSize; r++) {
                const res = this.slideRow(this.grid[r]);
                this.grid[r] = res.result;
                totalScore += res.score;
                res.mergedIndices.forEach(i => mergedPositions.add(r + ',' + i));
            }
        } else if (direction === 'right') {
            for (let r = 0; r < this.gridSize; r++) {
                const reversed = [...this.grid[r]].reverse();
                const res = this.slideRow(reversed);
                this.grid[r] = res.result.reverse();
                totalScore += res.score;
                res.mergedIndices.forEach(i => mergedPositions.add(r + ',' + (this.gridSize - 1 - i)));
            }
        } else if (direction === 'up') {
            for (let c = 0; c < this.gridSize; c++) {
                let col = [];
                for (let r = 0; r < this.gridSize; r++) col.push(this.grid[r][c]);
                const res = this.slideRow(col);
                for (let r = 0; r < this.gridSize; r++) this.grid[r][c] = res.result[r];
                totalScore += res.score;
                res.mergedIndices.forEach(i => mergedPositions.add(i + ',' + c));
            }
        } else if (direction === 'down') {
            for (let c = 0; c < this.gridSize; c++) {
                let col = [];
                for (let r = 0; r < this.gridSize; r++) col.push(this.grid[r][c]);
                col.reverse();
                const res = this.slideRow(col);
                res.result.reverse();
                for (let r = 0; r < this.gridSize; r++) this.grid[r][c] = res.result[r];
                totalScore += res.score;
                res.mergedIndices.forEach(i => mergedPositions.add((this.gridSize - 1 - i) + ',' + c));
            }
        }

        for (let r = 0; r < this.gridSize && !moved; r++) {
            for (let c = 0; c < this.gridSize && !moved; c++) {
                if (this.grid[r][c] !== prevGrid[r][c]) moved = true;
            }
        }

        if (moved) {
            this.score += totalScore;
            this.updateScore();

            this.gridContainer.querySelectorAll('.tile').forEach(el => el.remove());
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (this.grid[r][c] !== 0) {
                        const isMerged = mergedPositions.has(r + ',' + c);
                        const el = this.createTileElement(r, c, this.grid[r][c], false, isMerged);
                        this.gridContainer.appendChild(el);
                    }
                }
            }

            setTimeout(() => {
                this.addRandomTile();

                if (!this.hasWon) {
                    let won = false;
                    for (let r = 0; r < this.gridSize && !won; r++) {
                        for (let c = 0; c < this.gridSize && !won; c++) {
                            if (this.grid[r][c] === this.getTarget()) {
                                this.hasWon = true;
                                won = true;
                                this.isPaused = true;
                                const allGridSizes = [3, 4, 5, 6, 7];
                                const nextSize = allGridSizes[allGridSizes.indexOf(this.gridSize) + 1];
                                if (nextSize) {
                                    setTimeout(() => this.showWinChoice(nextSize), 200);
                                } else {
                                    setTimeout(() => this.showMessage('All Levels Completed! You are the Champion!'), 200);
                                }
                                this.isMoving = false;
                                return;
                            }
                        }
                    }
                }

                if (!this.hasMoves()) {
                    this.isGameOver = true;
                    setTimeout(() => this.showMessage('Game Over!'), 300);
                }
                this.isMoving = false;
            }, 150);
        } else {
            this.isMoving = false;
        }
    }

    unlockNextLevel() {
        const allGridSizes = [3, 4, 5, 6, 7];
        const currentIdx = allGridSizes.indexOf(this.gridSize);
        if (currentIdx < allGridSizes.length - 1) {
            const nextSize = allGridSizes[currentIdx + 1];
            if (!this.unlockedLevels.includes(nextSize)) {
                this.unlockedLevels.push(nextSize);
                localStorage.setItem('unlocked2048', JSON.stringify(this.unlockedLevels));
                return nextSize;
            }
        }
        return null;
    }

    hasMoves() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c] === 0) return true;
            }
        }
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const val = this.grid[r][c];
                if (c < this.gridSize - 1 && this.grid[r][c + 1] === val) return true;
                if (r < this.gridSize - 1 && this.grid[r + 1][c] === val) return true;
            }
        }
        return false;
    }

    updateScore() {
        this.scoreEl.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.bestScoreEl.textContent = this.bestScore;
            localStorage.setItem('best2048', this.bestScore);
        }
    }

    showMessage(text) {
        this.messageText.textContent = text;
        const msgEl = document.getElementById('message');
        const existingBtn = document.getElementById('next-level-btn');
        if (existingBtn) existingBtn.remove();

        if (text.includes('Level Up') || text.includes('Champion')) {
            const nextBtn = document.createElement('button');
            nextBtn.id = 'next-level-btn';
            nextBtn.className = 'btn';
            nextBtn.style.marginTop = '15px';
            nextBtn.style.marginLeft = '10px';
            nextBtn.style.background = '#8f7a66';

            if (text.includes('Champion')) {
                nextBtn.textContent = 'Play Again';
                nextBtn.addEventListener('click', () => {
                    this.messageContainer.style.display = 'none';
                    this.gridSize = 3;
                    this.isPaused = false;
                    this.hideLevelSelect();
                    this.showLevelSelect();
                });
            } else {
                nextBtn.textContent = 'Next Level >>';
                const allGridSizes = [3, 4, 5, 6, 7];
                const currentIdx = allGridSizes.indexOf(this.gridSize);
                const nextSize = allGridSizes[currentIdx + 1];
                nextBtn.addEventListener('click', () => {
                    this.messageContainer.style.display = 'none';
                    this.isPaused = false;
                    this.gridSize = nextSize;
                    this.hideLevelSelect();
                    this.newGame();
                });
            }
            msgEl.appendChild(nextBtn);
        }
        this.messageContainer.style.display = 'flex';
    }

    showWinChoice(nextSize) {
        this.messageText.textContent = 'Level Complete! You reached the target!';
        const msgEl = document.getElementById('message');
        const existingBtn = document.getElementById('next-level-btn');
        if (existingBtn) existingBtn.remove();
        const existingStay = document.getElementById('stay-btn');
        if (existingStay) existingStay.remove();

        const btnWrap = document.createElement('div');
        btnWrap.style.marginTop = '15px';
        btnWrap.style.display = 'flex';
        btnWrap.style.gap = '10px';
        btnWrap.style.justifyContent = 'center';

        const stayBtn = document.createElement('button');
        stayBtn.id = 'stay-btn';
        stayBtn.className = 'btn';
        stayBtn.style.background = '#8f7a66';
        stayBtn.textContent = 'Continue Playing';
        stayBtn.addEventListener('click', () => {
            this.messageContainer.style.display = 'none';
            this.isPaused = false;
        });

        const nextBtn = document.createElement('button');
        nextBtn.id = 'next-level-btn';
        nextBtn.className = 'btn';
        nextBtn.style.background = '#8f7a66';
        nextBtn.textContent = 'Next Level >>';
        nextBtn.addEventListener('click', () => {
            this.messageContainer.style.display = 'none';
            this.unlockNextLevel();
            this.gridSize = nextSize;
            this.isPaused = false;
            this.hideLevelSelect();
            this.newGame();
        });

        btnWrap.appendChild(stayBtn);
        btnWrap.appendChild(nextBtn);
        msgEl.appendChild(btnWrap);
        this.messageContainer.style.display = 'flex';
    }
}

window.addEventListener('DOMContentLoaded', () => { new Game2048(); });
