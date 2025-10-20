document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timeDisplay = document.getElementById('time-display');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const progressRing = document.getElementById('progress-ring-fg');
    const alarmSound = document.getElementById('alarm-sound');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const sessionTracker = document.getElementById('session-tracker');

    // Timer Settings (in seconds)
    const timers = {
        pomodoro: 25 * 60,
        shortBreak: 5 * 60,
        longBreak: 15 * 60,
    };

    // App State
    let currentMode = 'pomodoro';
    let remainingTime = timers[currentMode];
    let intervalId = null;
    let isRunning = false;
    let pomodorosCompleted = 0;
    let tasks = JSON.parse(localStorage.getItem('pomodoroTasks')) || [];

    // Progress Ring setup
    const radius = progressRing.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressRing.style.strokeDasharray = `${circumference} ${circumference}`;

    // --- Core Functions ---
    function updateDisplay() {
        const minutes = Math.floor(remainingTime / 60).toString().padStart(2, '0');
        const seconds = (remainingTime % 60).toString().padStart(2, '0');
        timeDisplay.textContent = `${minutes}:${seconds}`;
        document.title = `${minutes}:${seconds} - ${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}`;
        setProgress(remainingTime / timers[currentMode]);
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        startBtn.textContent = 'Pause';
        intervalId = setInterval(() => {
            remainingTime--;
            updateDisplay();
            if (remainingTime <= 0) {
                clearInterval(intervalId);
                alarmSound.play();
                switchMode();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;
        startBtn.textContent = 'Start';
        clearInterval(intervalId);
    }

    function resetTimer() {
        pauseTimer();
        remainingTime = timers[currentMode];
        updateDisplay();
    }

    function switchMode(mode = null) {
        pauseTimer();
        if (currentMode === 'pomodoro' && remainingTime <= 0) {
            pomodorosCompleted++;
            updateSessionTracker();
        }

        if (mode) {
            currentMode = mode;
        } else {
            // Automatic switching
            if (currentMode === 'pomodoro') {
                currentMode = (pomodorosCompleted % 4 === 0) ? 'longBreak' : 'shortBreak';
            } else {
                currentMode = 'pomodoro';
            }
        }
        
        modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === currentMode);
        });
        
        remainingTime = timers[currentMode];
        updateDisplay();
    }

    // --- UI & Event Listeners ---
    startBtn.addEventListener('click', () => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    resetBtn.addEventListener('click', resetTimer);
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    function setProgress(percent) {
        const offset = circumference - percent * circumference;
        progressRing.style.strokeDashoffset = offset;
    }
    
    // --- Task List Functions ---
    function renderTasks() {
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';
            li.dataset.index = index;
            
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-task-btn">&times;</button>
            `;
            taskList.appendChild(li);
        });
    }

    function addTask(text) {
        tasks.push({ text, completed: false });
        saveAndRenderTasks();
    }

    function toggleTask(index) {
        tasks[index].completed = !tasks[index].completed;
        saveAndRenderTasks();
    }

    function deleteTask(index) {
        tasks.splice(index, 1);
        saveAndRenderTasks();
    }
    
    function saveAndRenderTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
        renderTasks();
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = taskInput.value.trim();
        if (text) {
            addTask(text);
            taskInput.value = '';
        }
    });

    taskList.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            toggleTask(e.target.parentElement.dataset.index);
        }
        if (e.target.classList.contains('delete-task-btn')) {
            deleteTask(e.target.parentElement.dataset.index);
        }
    });

    function updateSessionTracker() {
        sessionTracker.textContent = `Pomodoros completed: ${pomodorosCompleted}`;
    }

    // --- Initial Setup ---
    function init() {
        updateDisplay();
        renderTasks();
        updateSessionTracker();
    }

    init();
});

