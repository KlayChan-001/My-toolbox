// --- GLOBAL VARS ---
const modeOrder = ['basic', 'scientific', 'equation', 'advanced', 'developer', 'converter', 'memory', 'record', 'account', 'settings'];
let currentMode = 'basic';
let expression = '';
let resultDisplayed = false;
let effectsEnabled = true;
let memoryList = [];
let actionLog = [];
let isLoggedIn = false;
let currentUser = null;
let isPaidUser = false;
let devMode = false;
let currentEditElement = null;
let decimalPlaces = 8;
let userVariables = {};

// Developer Mode Vars
let devExpression = '0';
let devBase = 10;
let devBits = 64;
let devSigned = true;

const userDatabase = {
    "1C01": { pass: "CYL", name: "Chan Yin Lok" },
    "1C02": { pass: "CCY", name: "Cheng Chi Yin" },
    "1C03": { pass: "CMC", name: "Cheng Man Chun" },
    "1C04": { pass: "CTW", name: "Cheung Tsz Wun" },
    "1C05": { pass: "CHK", name: "Choi Hor Kiu" },
    "1C06": { pass: "CPK", name: "Chui Pak Kiu" },
    "1C07": { pass: "FKH", name: "Fung Ki Hong" },
    "1C08": { pass: "FPK", name: "Fung Pak Ki" },
    "1C09": { pass: "GYN", name: "Guo Yining" },
    "1C10": { pass: "HSL", name: "Ho Si Long" },
    "1C11": { pass: "LLH", name: "Lau Lok Him" },
    "1C12": { pass: "LCS", name: "Lee Cheung Shing" },
    "1C13": { pass: "LLT", name: "Lee Long Tin" },
    "1C14": { pass: "LTH", name: "Lee Tsz Him" },
    "1C15": { pass: "LTH", name: "Lee Tung Hin" },
    "1C16": { pass: "LYL", name: "Leung Yat Long" },
    "1C17": { pass: "LYC", name: "Liao Yat Chun" },
    "1C18": { pass: "LSJ", name: "Lui Sze Jit" },
    "1C19": { pass: "NLS", name: "Ngai Lok Sun Riley" },
    "1C20": { pass: "SHH", name: "Shih Ho Hin" },
    "1C21": { pass: "TTL", name: "Tam Tsz Long Elvin" },
    "1C22": { pass: "TSY", name: "Tse Sing Yin" },
    "1C23": { pass: "THM", name: "Tu Rex Hoi Ming" },
    "1C24": { pass: "WY", name: "Wo York Ralph" },
    "1C25": { pass: "WCH", name: "Wong Chun Hei" },
    "1C26": { pass: "WSC", name: "Wong Sze Chun" },
    "1C27": { pass: "XCH", name: "Xie Chun Hei" },
    "1C28": { pass: "YCS", name: "Yeung Chun Sun Hayden" },
    "1C29": { pass: "YHY", name: "Yeung Heung Yin" },
    "1C30": { pass: "YLH", name: "Yin Lihao" },
    "1C31": { pass: "YHY", name: "Yip Evan" },
    "1C32": { pass: "YCF", name: "Young Chi Fung" },
    "1C33": { pass: "YCT", name: "Yuen Chun Ting Hayden" },
    "1C34": { pass: "ZJJJ", name: "Zeng Jiang Jun Jie" }
};

// --- DOM ELEMENTS ---
const basicDisplay = document.getElementById('display-basic');
const sciDisplay = document.getElementById('display-sci');

// --- STARTUP ---
window.addEventListener('load', () => {
    loadData();
    setTimeout(() => {
        document.getElementById('app').classList.add('loaded');
        triggerCascade();
    }, 1200);
    setupEqualButtons();
    initDevMode();
});

function triggerCascade() {
    const buttons = document.querySelectorAll('.keypad-btn, .mem-btn');
    buttons.forEach((btn, i) => {
        btn.classList.remove('anim-pop');
        void btn.offsetWidth;
        btn.style.animationDelay = `${i * 0.02}s`;
        btn.classList.add('anim-pop');
    });
}

// --- MODE SWITCHING ---
function switchMode(mode) {
    const oldIndex = modeOrder.indexOf(currentMode);
    const newIndex = modeOrder.indexOf(mode);
    currentMode = mode;

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const btns = document.querySelectorAll('.nav-btn');
    for(let b of btns) {
        if(b.getAttribute('onclick') && b.getAttribute('onclick').includes(mode)) {
            b.classList.add('active');
            break;
        }
    }

    const panels = document.querySelectorAll('.panel');
    panels.forEach(p => { p.classList.remove('active', 'slide-up', 'slide-down', 'slide-right'); });

    const newPanel = document.getElementById(`panel-${mode}`);
    if (newIndex > oldIndex) newPanel.classList.add('slide-down');
    else if (newIndex < oldIndex) newPanel.classList.add('slide-up');
    
    newPanel.classList.add('active');

    if (mode === 'developer') {
        updateDevUI();
    }

    if (mode === 'memory') {
        updateVariablesUI();
    }

    setTimeout(() => {
        const buttons = newPanel.querySelectorAll('.keypad-btn, .mem-btn');
        buttons.forEach((btn, i) => {
            btn.classList.remove('anim-pop');
            void btn.offsetWidth;
            btn.style.animationDelay = `${i * 0.02}s`;
            btn.classList.add('anim-pop');
        });
    }, 50);
    logAction(`Switched to ${mode} mode.`);
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('expanded'); }

// --- CALCULATOR LOGIC ---
function getActiveDisplay() { return currentMode === 'basic' ? basicDisplay : sciDisplay; }
function updateDisplay(val) { const d = getActiveDisplay(); if(val === '') val = '0'; d.innerText = val; }

function appendNum(n) { if(resultDisplayed) { expression=''; resultDisplayed=false;} expression+=n; updateDisplay(expression); logAction(`Appended number: '${n}'`); }
function appendOp(op) { resultDisplayed=false; expression+=op; updateDisplay(expression); logAction(`Appended operator: '${op}'`); }
function clearDisplay() { expression=''; updateDisplay('0'); logAction('Cleared display.'); }
function deleteLast() { if(resultDisplayed) expression=''; else expression=expression.slice(0,-1); updateDisplay(expression); logAction('Deleted last character.'); }
function toggleSign() { if(expression.startsWith('-')) expression=expression.substring(1); else expression='-'+expression; updateDisplay(expression); }

function sciMath(type) {
    switch(type) {
        case 'sin': expression += 'Math.sin('; break;
        case 'cos': expression += 'Math.cos('; break;
        case 'tan': expression += 'Math.tan('; break;
        case 'log': expression += 'Math.log10('; break;
        case 'ln': expression += 'Math.log('; break;
        case 'sqrt': expression += 'Math.sqrt('; break;
        case 'sq': expression += '**2'; break;
        case 'pi': expression += 'Math.PI'; break;
        case 'e': expression += 'Math.E'; break;
    }
    updateDisplay(expression);
}

function calculate() {
    try {
        // Do not modify original expression for display later
        let workExpression = expression.replace(/×/g, '*').replace(/÷/g, '/');

        // Feature: Handle variable assignment like A=10
        const assignmentMatch = workExpression.match(/^\s*([a-zA-Z])\s*=\s*(.+)$/);
        if (assignmentMatch) {
            const varName = assignmentMatch[1];
            let valueExpr = assignmentMatch[2];
            
            // We need to evaluate the right side, which might contain other variables
            let valueEval = preprocessAndEval(valueExpr);

            userVariables[varName] = valueEval;
            saveData(); // Persist variables
            if(currentMode === 'memory') {
                updateVariablesUI();
            }
            
            expression = valueEval.toString();
            updateDisplay(expression);
            resultDisplayed = true;
            logAction(`Defined variable ${varName} = ${valueEval}`);
            return; // End execution here for assignments
        }

        // For regular calculations, preprocess and evaluate
        let res = preprocessAndEval(workExpression);
        
        expression = res.toString();
        updateDisplay(expression);
        resultDisplayed = true;
        logAction(`Calculated: ${workExpression.replace(/\*/g, '×').replace(/\//g, '÷')} = ${res}`);
    } catch(e) { 
        updateDisplay("Error"); 
        logAction(`Calculation Error on expression: "${expression}"`);
        expression=''; 
        resultDisplayed=true; 
    }
}

function preprocessAndEval(str) {
    // Preprocess for implicit multiplication and variables.
    // Order is important here.
    
    // 1. Handle implicit multiplication between variables (e.g., AA -> A*A, AB -> A*B)
    // This is safer if we iterate char by char.
    let tempStr = "";
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const nextChar = str[i+1];
        tempStr += char;
        if (nextChar && userVariables.hasOwnProperty(char) && userVariables.hasOwnProperty(nextChar) && /[a-zA-Z]/.test(char) && /[a-zA-Z]/.test(nextChar)) {
             tempStr += "*";
        }
    }
    str = tempStr;
    
    // 2. Handle implicit multiplication for number/paren followed by a variable (e.g., 2A -> 2*A, (x)A -> (x)*A)
    str = str.replace(/([\d\)])\s*([a-zA-Z])(?!\w)/g, (match, p1, p2) => {
         if (userVariables.hasOwnProperty(p2)) return `${p1}*${p2}`;
         return match;
    });

    // 3. Standard syntax adjustments
    let evalStr = str.replace(/%/g, '/100');
    evalStr = evalStr.replace(/([0-9.]+)%/g, '($1/100)'); // Redundant, but safe
    evalStr = evalStr.replace(/(\d|\))(?=\()/g, '$1*').replace(/(\))(?=\d)/g, '$1*');

    // 4. Substitute variables with their values
    evalStr = evalStr.replace(/(?<![.\w])([a-zA-Z])(?![.\w])/g, (match) => {
        if (userVariables[match] !== undefined) {
            return `(${userVariables[match]})`;
        }
        return match;
    });
    
    if (evalStr.trim() === '') {
        return 0;
    }

    // Evaluate the final string
    let res = eval(evalStr);

    // Apply Rounding
    if(!Number.isInteger(res)) res = parseFloat(res.toFixed(decimalPlaces));
    
    return res;
}

// --- ADVANCED MATH (LCM/HCF) ---
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
const lcm = (a, b) => (a * b) / gcd(a, b);

function calcAdvanced(type) {
    const input = document.getElementById('adv-input').value;
    const resDiv = document.getElementById('res-advanced');
    resDiv.classList.remove('error');
    
    // Parse Input
    let nums = input.split(/[\s,]+/).filter(n => n.trim() !== '').map(Number);
    
    if (nums.some(isNaN)) { resDiv.innerText = "Invalid Numbers"; resDiv.classList.add('error'); return; }
    if (nums.length < 2) { resDiv.innerText = "Enter at least 2 numbers"; resDiv.classList.add('error'); return; }
    if (nums.length > 10) { resDiv.innerText = "Max 10 numbers allowed"; resDiv.classList.add('error'); return; }

    let result = nums[0];
    if (type === 'hcf') {
        for (let i = 1; i < nums.length; i++) result = gcd(result, nums[i]);
        resDiv.innerText = `HCF: ${result}`;
    } else {
        for (let i = 1; i < nums.length; i++) result = lcm(result, nums[i]);
        resDiv.innerText = `LCM: ${result}`;
    }
}

function simplifyExpression() {
    const input = document.getElementById('simplify-input').value;
    const resDiv = document.getElementById('res-simplify');
    resDiv.classList.remove('error');
    try {
        if (!input.trim()) {
            resDiv.innerText = "";
            return;
        }
        const result = simplifyPolynomial(input);
        resDiv.innerText = result;
        logDev(`Simplified '${input}' to '${result}'`);
    } catch (e) {
        resDiv.classList.add('error');
        resDiv.innerText = e.message;
        logDev(`Simplification Error: ${e.message}`);
    }
}

function simplifyPolynomial(expr) {
    // Pre-process input
    let processed = expr.replace(/\s/g, '');
    processed = processed.replace(/p(\d+)/g, '^$1'); // xp2 -> x^2
    processed = processed.replace(/([a-zA-Z0-9])([a-zA-Z])/g, '$1*$2'); // 2x -> 2*x, yx->y*x
    processed = processed.replace(/([a-zA-Z])([a-zA-Z])/g, '$1*$2'); // handle xy
    processed = processed.replace(/\-/g, '+-');
    if (processed.startsWith('+')) processed = processed.substring(1);

    const termStrings = processed.split('+');
    const terms = {};

    for (const termStr of termStrings) {
        if (!termStr) continue;

        let mutableTermStr = termStr;
        let coeff = 1;

        if (mutableTermStr.startsWith('-')) {
            coeff = -1;
            mutableTermStr = mutableTermStr.substring(1);
        }
        
        const vars = {};
        const parts = mutableTermStr.split('*');

        for (let part of parts) {
            if (!part) continue;
            
            if (!isNaN(part)) {
                coeff *= parseFloat(part);
            } else {
                const [variable, powerStr] = part.split('^');
                if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variable)) throw new Error(`Invalid variable: '${variable}'`);
                const power = powerStr ? parseInt(powerStr) : 1;
                vars[variable] = (vars[variable] || 0) + power;
            }
        }
        
        const sortedVars = Object.keys(vars).sort();
        let key = sortedVars.map(v => (vars[v] === 1) ? v : `${v}^${vars[v]}`).filter(s => s).join('*');
        
        terms[key] = (terms[key] || 0) + coeff;
    }

    // Reconstruct
    const sortedKeys = Object.keys(terms).sort((a, b) => {
        const degA = a.split('*').reduce((sum, p) => sum + (parseInt(p.split('^')[1] || '1')), 0);
        const degB = b.split('*').reduce((sum, p) => sum + (parseInt(p.split('^')[1] || '1')), 0);
        if (degA !== degB) return degB - degA; // Higher degree first
        if (a.length !== b.length) return b.length - a.length; // More variables first
        return a.localeCompare(b);
    });

    let resultParts = [];
    for (const key of sortedKeys) {
        const coeff = terms[key];
        if (Math.abs(coeff) < 1e-9) continue;
        const absCoeff = Math.abs(coeff);
        let partStr = (key === '') ? absCoeff.toString() : ((absCoeff === 1) ? key : `${absCoeff}*${key}`);
        resultParts.push({ sign: coeff > 0 ? '+' : '-', str: partStr });
    }

    if (resultParts.length === 0) return '0';
    let resultStr = resultParts.map(p => `${p.sign} ${p.str}`).join(' ');
    if (resultStr.startsWith('+ ')) resultStr = resultStr.substring(2);
    if (resultStr.startsWith('- ')) resultStr = '-' + resultStr.substring(2);
    return resultStr;
}

// --- DEVELOPER MODE LOGIC ---
function initDevMode() {
    const grid = document.getElementById('bit-grid');
    for(let i=63; i>=0; i--) {
        const btn = document.createElement('button');
        btn.className = 'bit-btn';
        btn.innerText = '0';
        btn.onclick = () => toggleBit(i);
        btn.title = `Bit ${i}`;
        grid.appendChild(btn);
        if (i % 16 === 0 && i !== 0) {
            // Optional spacer or break if needed, grid handles it mostly
        }
    }
}

function setDevBase(b) {
    devBase = b;
    document.querySelectorAll('.radix-row').forEach(r => r.classList.remove('active'));
    if(b===16) document.getElementById('row-hex').classList.add('active');
    if(b===10) document.getElementById('row-dec').classList.add('active');
    if(b===8) document.getElementById('row-oct').classList.add('active');
    if(b===2) document.getElementById('row-bin').classList.add('active');
    
    // Update Keypad State
    const hexBtns = document.querySelectorAll('.dev-hex-btn');
    hexBtns.forEach(btn => {
        const val = btn.innerText.trim();
        if (b === 10 || b === 8 || b === 2) btn.disabled = true;
        else btn.disabled = false;
    });
    
    // Additional disabling for Oct/Bin
    document.querySelectorAll('#keypad-dev .keypad-btn').forEach(btn => {
        const txt = btn.innerText.trim();
        if (['2','3','4','5','6','7','8','9'].includes(txt)) {
            if (b === 2) btn.disabled = true;
            else if (b === 8 && (txt === '8' || txt === '9')) btn.disabled = true;
            else btn.disabled = false;
        }
    });
}

function cycleWordSize() {
    if(devBits === 64) devBits = 32;
    else if(devBits === 32) devBits = 16;
    else if(devBits === 16) devBits = 8;
    else devBits = 64;
    
    const labels = {64:'QWORD', 32:'DWORD', 16:'WORD', 8:'BYTE'};
    document.getElementById('btn-word-size').innerText = labels[devBits];
    updateDevUI();
}

function toggleDevSigned() {
    devSigned = !devSigned;
    document.getElementById('btn-signed').classList.toggle('active', devSigned);
    updateDevUI();
}

function appendDev(val) {
    if(devExpression === '0') devExpression = '';
    devExpression += val;
    updateDevUI();
}

function devMath(op) {
    if (op === 'NEG') {
        // Wrap current expression in -(...)
        devExpression = `-(${devExpression})`;
    } else {
        devExpression += op;
    }
    updateDevUI();
}

function devBackspace() {
    devExpression = devExpression.slice(0, -1);
    if(devExpression === '') devExpression = '0';
    updateDevUI();
}

function clearDev() {
    devExpression = '0';
    updateDevUI();
}

function devBitwise(op) {
    const map = { 'AND': '&', 'OR': '|', 'XOR': '^', 'NOT': '~', 'LSH': '<<', 'RSH': '>>' };
    if (map[op]) devExpression += map[op];
    else if (op === 'ROL' || op === 'ROR') {
        // Not directly supported in expression string easily without function
        // For simplicity in this version, we might skip or implement a wrapper
        alert("Rotation not supported in expression mode yet.");
    }
    updateDevUI();
}

function getDevValue() {
    try {
        // Replace numbers with BigInts (suffix n)
        // Regex to find numbers (hex, bin, oct, dec) and append n
        // This is a simplified parser.
        let expr = devExpression.replace(/0x[0-9A-Fa-f]+/g, m => m+'n')
                                .replace(/0b[01]+/g, m => m+'n')
                                .replace(/\b\d+\b/g, m => m+'n');
        
        // Evaluate
        let val = eval(expr); // Safe-ish for local calc
        if (typeof val !== 'bigint') val = BigInt(Math.floor(val));
        
        // Mask to word size
        const mask = (1n << BigInt(devBits)) - 1n;
        return val & mask;
    } catch(e) {
        return 0n;
    }
}

function updateDevUI() {
    const val = getDevValue();
    const mask = (1n << BigInt(devBits)) - 1n;
    
    // Display Main
    let displayVal = val;
    if (devSigned) {
        const maxPos = 1n << (BigInt(devBits) - 1n);
        if (val >= maxPos) displayVal = val - (1n << BigInt(devBits));
    }
    
    document.getElementById('display-dev').innerText = displayVal.toString(devBase).toUpperCase();

    // Update Radix Rows
    document.getElementById('val-hex').innerText = (val).toString(16).toUpperCase();
    document.getElementById('val-dec').innerText = displayVal.toString(10);
    document.getElementById('val-oct').innerText = (val).toString(8);
    document.getElementById('val-bin').innerText = (val).toString(2);

    // Update Bits
    const bitBtns = document.getElementById('bit-grid').children;
    for(let i=0; i<64; i++) {
        const bitIndex = 63 - i; // Grid is 63..0
        const bitVal = (val >> BigInt(bitIndex)) & 1n;
        const btn = bitBtns[i];
        btn.innerText = bitVal.toString();
        btn.className = bitVal ? 'bit-btn on' : 'bit-btn';
        btn.style.opacity = (bitIndex < devBits) ? '1' : '0.2';
    }
}

function toggleBit(index) {
    let val = getDevValue();
    const mask = 1n << BigInt(index);
    val = val ^ mask;
    
    // Update expression to this new value
    devExpression = val.toString();
    updateDevUI();
}

function calcDev() {
    try {
        const val = getDevValue();
        devExpression = val.toString();
        updateDevUI();
    } catch(e) {
        document.getElementById('display-dev').innerText = "Error";
    }
}

function devAscii() {
    const val = Number(getDevValue() & 0xFFn); // Only low byte
    const char = String.fromCharCode(val);
    alert(`ASCII Code ${val} = '${char}'`);
}

// --- ROUNDING SETTING ---
function updateRounding() {
    const input = document.getElementById('rounding-input');
    let val = parseInt(input.value);
    if (!devMode) {
        if (val < 0) val = 0;
        if (val > 10) val = 10;
        input.value = val;
    }
    decimalPlaces = val;
    logDev(`Rounding set to ${decimalPlaces}`);
}

// --- GLOW RADIUS SETTING ---
function updateGlowRadius() {
    const val = document.getElementById('glow-radius-input').value;
    const px = (val * 20) + 10;
    document.documentElement.style.setProperty('--glow-radius', px + 'px');
}

// --- DEV MODE LOGIC ---
function toggleDevMode() {
    devMode = document.getElementById('dev-toggle').checked;
    const consoleDiv = document.getElementById('dev-console');
    consoleDiv.style.display = devMode ? 'flex' : 'none';
    
    if(devMode) {
        document.body.classList.add('dev-active');
        document.querySelectorAll('.display-screen').forEach(d => d.contentEditable = true);
    } else {
        document.body.classList.remove('dev-active');
        document.querySelectorAll('.display-screen').forEach(d => d.contentEditable = false);
        updateRounding();
    }
    logDev(`Dev Mode: ${devMode}`);
}

function logDev(msg) {
    if(!devMode) return;
    const consoleLog = document.getElementById('dev-console-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
    consoleLog.appendChild(entry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Interceptor for editing buttons (FIXED: Excludes menu-list-btn)
document.addEventListener('click', function(e) {
    if (!devMode) return;
    const btn = e.target.closest('.reveal-btn');
    if (btn && (btn.classList.contains('keypad-btn') || btn.classList.contains('mem-btn')) && !btn.classList.contains('menu-list-btn')) {
        e.stopImmediatePropagation();
        e.preventDefault();
        openEditor(btn);
    }
}, true);

function openEditor(el) {
    currentEditElement = el;
    const span = el.querySelector('span') || el;
    document.getElementById('edit-label').value = span.innerText || el.innerText;
    document.getElementById('edit-action').value = el.getAttribute('onclick');
    let classes = [];
    if(el.classList.contains('accent')) classes.push('accent');
    if(el.classList.contains('equal-btn')) classes.push('equal-btn');
    document.getElementById('edit-class').value = classes.join(' ');
    document.getElementById('dev-modal').style.display = 'flex';
}

function closeEditor() { document.getElementById('dev-modal').style.display = 'none'; currentEditElement = null; }
function saveComponent() {
    if(!currentEditElement) return;
    const label = document.getElementById('edit-label').value;
    const action = document.getElementById('edit-action').value;
    const cls = document.getElementById('edit-class').value;
    const span = currentEditElement.querySelector('span');
    if(span) span.innerText = label; else currentEditElement.innerText = label;
    currentEditElement.setAttribute('onclick', action);
    currentEditElement.classList.remove('accent', 'equal-btn');
    if(cls.includes('accent')) currentEditElement.classList.add('accent');
    if(cls.includes('equal-btn')) currentEditElement.classList.add('equal-btn');
    closeEditor();
}
function deleteComponent() { if(currentEditElement) { currentEditElement.remove(); closeEditor(); } }
function addNewButton(containerId) {
    const container = document.getElementById(containerId);
    const btn = document.createElement('button');
    btn.className = 'reveal-btn keypad-btn anim-pop';
    btn.setAttribute('onclick', "appendNum('0')");
    btn.innerHTML = '<span>New</span>';
    const placeholder = container.querySelector('.add-btn-placeholder');
    container.insertBefore(btn, placeholder);
}

// --- MEMORY & VARIABLES ---
function memStore() { let v=parseFloat(expression); if(!isNaN(v)) { memoryList.unshift(v); resultDisplayed=true; logAction(`Stored to memory: ${v}`); } }
function memRecall() { if(memoryList.length){ expression=memoryList[0].toString(); updateDisplay(expression); logAction(`Recalled from memory: ${memoryList[0]}`); } }
function memAdd() { if(memoryList.length){ memoryList[0]+=parseFloat(expression||0); resultDisplayed=true; logAction(`Added to memory: ${expression||0}`); } else memStore(); }
function memSub() { if(memoryList.length){ memoryList[0]-=parseFloat(expression||0); resultDisplayed=true; logAction(`Subtracted from memory: ${expression||0}`); } else { memoryList.unshift(-parseFloat(expression||0)); } }
function memClear() { memoryList=[]; logAction('Cleared all memory.'); }

function clearAllVariables() {
    userVariables = {};
    saveData();
    updateVariablesUI();
    logAction('Cleared all variables.');
}

function clearVariable(varName) {
    delete userVariables[varName];
    saveData();
    updateVariablesUI();
    logAction(`Cleared variable ${varName}.`);
}

function updateVariablesUI() {
    const container = document.getElementById('variable-container');
    if (!container) return; // Exit if the container is not on the current panel
    container.innerHTML = '';
    const variables = Object.keys(userVariables);
    if (variables.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#666;margin-top:50px;">No variables stored. Use format: A=10</div>';
    } else {
        variables.sort().forEach(varName => {
            const val = userVariables[varName];
            let item = document.createElement('div');
            item.className = 'memory-item'; // reuse existing style
            item.style.cursor = 'pointer';
                                item.innerHTML = `<div>
                                <span class="mem-val" style="font-size: 1.8rem; color: var(--accent-color); flex-grow: 0; margin-right: 15px;">${varName}</span>
                                <span class="mem-val" style="font-size: 1.8rem; flex-grow: 1; text-align: left;">= ${val}</span>
                                <button class="reveal-btn" style="width: 40px; height: 40px; border-radius: 50%; padding: 0; min-width: 40px; flex-shrink: 0;" onclick="clearVariable('${varName}')"><i class="fas fa-times"></i></button>
                            </div>`;                item.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    appendNum(varName); 
                    switchMode('basic'); 
                }
            });
            container.appendChild(item);
        });
    }
}

// --- CONVERTER ---
const converterData = {
    length: { units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34, nmi: 1852 }, labels: { m: 'Meters', km: 'Kilometers', cm: 'Centimeters', mm: 'Millimeters', in: 'Inches', ft: 'Feet', yd: 'Yards', mi: 'Miles', nmi: 'Nautical Miles' } },
    mass: { units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, t: 1000, st: 6.35029 }, labels: { kg: 'Kilograms', g: 'Grams', mg: 'Milligrams', lb: 'Pounds', oz: 'Ounces', t: 'Metric Tons', st: 'Stone' } },
    volume: { units: { l: 1, ml: 0.001, m3: 1000, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588, fl_oz: 0.0295735 }, labels: { l: 'Liters', ml: 'Milliliters', m3: 'Cubic Meters', gal: 'Gallons (US)', qt: 'Quarts (US)', pt: 'Pints (US)', cup: 'Cups', fl_oz: 'Fluid Oz' } },
    area: { units: { m2: 1, ha: 10000, km2: 1000000, ft2: 0.092903, ac: 4046.86, mi2: 2589988 }, labels: { m2: 'Square Meters', ha: 'Hectares', km2: 'Square KM', ft2: 'Square Feet', ac: 'Acres', mi2: 'Square Miles' } },
    speed: { units: { kmh: 1, mph: 1.60934, ms: 3.6, kn: 1.852, mach: 1234.8 }, labels: { kmh: 'Km/h', mph: 'Miles/h', ms: 'Meters/s', kn: 'Knots', mach: 'Mach (Std)' } },
    time: { units: { s: 1, min: 60, h: 3600, d: 86400, wk: 604800, y: 31536000 }, labels: { s: 'Seconds', min: 'Minutes', h: 'Hours', d: 'Days', wk: 'Weeks', y: 'Years' } },
    money: { units: { usd: 1, eur: 1.05, gbp: 1.26, jpy: 0.0067, cny: 0.14, inr: 0.012, cad: 0.73, aud: 0.65, hkd: 0.128 }, labels: { usd: 'USD ($)', eur: 'EUR (€)', gbp: 'GBP (£)', jpy: 'JPY (¥)', cny: 'CNY (¥)', inr: 'INR (₹)', cad: 'CAD ($)', aud: 'AUD ($)', hkd: 'HKD ($)' } }
};

function updateConverterUI() {
    const cat = document.getElementById('conv-category').value;
    const fromSel = document.getElementById('conv-from');
    const toSel = document.getElementById('conv-to');
    const unitUI = document.getElementById('unit-ui');
    const tipUI = document.getElementById('tip-ui');

    if (cat === 'tip') { unitUI.style.display = 'none'; tipUI.style.display = 'block'; return; } 
    else { unitUI.style.display = 'block'; tipUI.style.display = 'none'; }

    fromSel.innerHTML = ''; toSel.innerHTML = '';

    if (cat === 'temp') {
        const opts = [['c', 'Celsius'], ['f', 'Fahrenheit'], ['k', 'Kelvin']];
        opts.forEach(o => { fromSel.add(new Option(o[1], o[0])); toSel.add(new Option(o[1], o[0])); });
        toSel.value = 'f'; 
    } else if (converterData[cat]) {
        const data = converterData[cat];
        for (let key in data.units) { fromSel.add(new Option(data.labels[key] || key, key)); toSel.add(new Option(data.labels[key] || key, key)); }
        if(toSel.options.length > 1) toSel.selectedIndex = 1;
    }
    runConversion();
}

function runConversion() {
    const cat = document.getElementById('conv-category').value;
    if(cat === 'tip') return;
    const val = parseFloat(document.getElementById('conv-input').value);
    const from = document.getElementById('conv-from').value;
    const to = document.getElementById('conv-to').value;
    const out = document.getElementById('conv-output');
    if (isNaN(val)) { out.value = ''; return; }

    if (cat === 'temp') {
        let cVal; 
        if (from === 'c') cVal = val; else if (from === 'f') cVal = (val - 32) * 5/9; else if (from === 'k') cVal = val - 273.15;
        let res;
        if (to === 'c') res = cVal; else if (to === 'f') res = (cVal * 9/5) + 32; else if (to === 'k') res = cVal + 273.15;
        out.value = parseFloat(res.toFixed(4));
    } else {
        const data = converterData[cat];
        const baseVal = val * data.units[from];
        const result = baseVal / data.units[to];
        out.value = parseFloat(result.toFixed(decimalPlaces));
    }
}

function calcTip() {
    const bill = parseFloat(document.getElementById('tip-bill').value) || 0;
    const percent = parseFloat(document.getElementById('tip-percent').value) || 0;
    const people = parseFloat(document.getElementById('tip-people').value) || 1;
    const tipAmt = bill * (percent / 100);
    const total = bill + tipAmt;
    const perPerson = total / (people > 0 ? people : 1);
    document.getElementById('res-tip-amount').innerText = '$' + tipAmt.toFixed(2);
    document.getElementById('res-tip-total').innerText = '$' + total.toFixed(2);
    document.getElementById('res-tip-person').innerText = '$' + perPerson.toFixed(2);
}

// --- ALGEBRA & SETTINGS ---
function toggleEquationType() {
    const t=document.getElementById('eq-type').value;
    document.getElementById('ui-quadratic').style.display = t==='quadratic'?'block':'none';
    document.getElementById('ui-system').style.display = t==='system'?'block':'none';
}
function setAccent(c, el) { document.documentElement.style.setProperty('--accent-color', c); document.querySelectorAll('.color-option').forEach(x=>x.classList.remove('selected')); if(el) el.classList.add('selected'); }
function setCustomAccent(c) { setAccent(c); document.getElementById('custom-wrapper').classList.add('selected'); }
function setBg(c) { document.documentElement.style.setProperty('--bg-color', c); }
function setBtnColor(c) { document.documentElement.style.setProperty('--btn-bg', c); }
function toggleEffects() { document.body.classList.toggle('no-effects', !document.getElementById('effect-toggle').checked); }

function toggleNonMetro() {
    const isNonMetro = document.getElementById('non-metro-toggle').checked;
    document.body.classList.toggle('non-metro', isNonMetro);
    logAction(`Non-Metro Style: ${isNonMetro}`);
}

function toggleTopBar() {
    const isTop = document.getElementById('top-bar-toggle').checked;
    document.getElementById('app').classList.toggle('top-menu', isTop);
}

function loginUser() { 
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    
    const user = userDatabase[u];

    if (user && user.pass === p) {
        document.getElementById('login-box').style.display='none'; 
        document.getElementById('profile-box').style.display='block';
        document.getElementById('welcome-message').innerText = `Hello , ${user.name} !`;
        isLoggedIn = true;
        currentUser = u;
        logAction(`User logged in as '${user.name}'.`);
    } else {
        alert("Invalid Username or Password");
    }
}
function logoutUser() { 
    document.getElementById('login-box').style.display='block'; 
    document.getElementById('profile-box').style.display='none'; 
    logAction("User signed out.");
    isLoggedIn = false;
    currentUser = null;
    closePaidFeature();
    saveData();
}

function openProfileSettings() {
    if (!currentUser || !userDatabase[currentUser]) return;

    const user = userDatabase[currentUser];
    document.getElementById('profile-edit-name').value = user.name;
    
    // Clear password fields
    document.getElementById('profile-edit-old-pass').value = '';
    document.getElementById('profile-edit-new-pass').value = '';
    document.getElementById('profile-edit-confirm-pass').value = '';
    document.getElementById('profile-edit-upload').value = ''; // Clear file input

    document.getElementById('profile-settings-modal').style.display = 'flex';
}

function closeProfileSettings() {
    document.getElementById('profile-settings-modal').style.display = 'none';
}

function saveProfileSettings() {
    if (!currentUser || !userDatabase[currentUser]) return;
    const user = userDatabase[currentUser];
    
    // Name
    const newName = document.getElementById('profile-edit-name').value.trim();
    if (newName && newName !== user.name) {
        user.name = newName;
        document.getElementById('welcome-message').innerText = `Hello , ${newName} !`;
        logAction(`Display name changed to '${newName}'.`);
    }

    // Password
    const oldPass = document.getElementById('profile-edit-old-pass').value;
    const newPass = document.getElementById('profile-edit-new-pass').value;
    const confirmPass = document.getElementById('profile-edit-confirm-pass').value;
    let passwordChanged = false;
    if (oldPass || newPass || confirmPass) {
        if (oldPass !== user.pass) {
            alert("Incorrect old password.");
            return;
        }
        if (!newPass) {
            alert("New password cannot be empty.");
            return;
        }
        if (newPass !== confirmPass) {
            alert("New passwords do not match.");
            return;
        }
        user.pass = newPass;
        passwordChanged = true;
    }

    // Picture
    const profileUploadInput = document.getElementById('profile-edit-upload');
    const hasNewPicture = profileUploadInput.files && profileUploadInput.files[0];

    const finishSave = () => {
        if (passwordChanged) logAction(`Password changed.`);
        saveData();
        closeProfileSettings();
        alert("Profile updated successfully!");
    };

    if (hasNewPicture) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('default-avatar').style.display = 'none';
            const img = document.getElementById('custom-avatar');
            img.src = e.target.result;
            img.style.display = 'block';
            logAction("Profile badge updated.");
            finishSave();
        }
        reader.readAsDataURL(profileUploadInput.files[0]);
    } else {
        finishSave();
    }
}

function openPaidFeature() {
    document.getElementById('profile-box').style.display = 'none';
    document.getElementById('paid-feature-page').style.display = 'block';
    if(isPaidUser) {
        document.getElementById('payment-section').style.display = 'none';
        document.getElementById('glow-customizer').style.display = 'block';
    } else {
        document.getElementById('payment-section').style.display = 'block';
        document.getElementById('glow-customizer').style.display = 'none';
    }
}

function closePaidFeature() {
    document.getElementById('paid-feature-page').style.display = 'none';
    if(isLoggedIn) document.getElementById('profile-box').style.display = 'block';
    else document.getElementById('login-box').style.display = 'block';
}

function simulatePayment(method, btn) {
    const span = btn.querySelector('span');
    const originalText = span.innerHTML;
    span.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    setTimeout(() => {
        isPaidUser = true;
        logAction(`Payment successful via ${method}`);
        alert(`Payment successful via ${method}! You can now customize the glow effect.`);
        openPaidFeature();
        span.innerHTML = originalText;
    }, 1500);
}

function setGlowColor(hex) {
    const r = parseInt(hex.substr(1,2), 16), g = parseInt(hex.substr(3,2), 16), b = parseInt(hex.substr(5,2), 16);
    document.documentElement.style.setProperty('--border-glow', `rgba(${r}, ${g}, ${b}, 0.8)`);
    document.documentElement.style.setProperty('--surface-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
    logAction(`Glow color changed to ${hex}`);
}

function resetGlowColor() {
    document.documentElement.style.setProperty('--border-glow', 'rgba(255, 255, 255, 0.6)');
    document.documentElement.style.setProperty('--surface-glow', 'rgba(255, 255, 255, 0.15)');
    logAction('Glow color reset to default');
}

function openAboutPage() { document.getElementById('panel-settings').classList.remove('active'); document.getElementById('panel-about').classList.add('active', 'slide-up'); }
function closeAboutPage() { document.getElementById('panel-about').classList.remove('active', 'slide-up'); document.getElementById('panel-settings').classList.add('active', 'slide-down'); }

// --- ACTION RECORDER & DEV CONSOLE COMMANDS ---
function logAction(msg) {
    if (!isLoggedIn) return;
    const timestamp = new Date().toLocaleTimeString();
    actionLog.unshift({ time: timestamp, message: msg });
    if (actionLog.length > 200) actionLog.pop();
    updateRecordDisplay();
    saveData();
}
function updateRecordDisplay() {
    const container = document.getElementById('record-container');
    if (!container) return;
    container.innerHTML = actionLog.length === 0 ? '<div class="record-entry"><span class="record-time">[SYSTEM]</span><span class="record-msg"> No actions recorded yet.</span></div>' : actionLog.map(entry => `<div class="record-entry"><span class="record-time">[${entry.time}]</span><span class="record-msg"> ${entry.message}</span></div>`).join('');
}
function handleConsoleInput(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('dev-console-input');
        const command = input.value.trim();
        if (command) { logDev(`> ${command}`); processCommand(command); input.value = ''; }
    }
}
function processCommand(command) {
    if (command === 'show[record]') {
        document.getElementById('nav-btn-record').style.display = 'flex';
        logDev("Command successful: 'Record' tab is now visible.");
    } else { logDev("Unknown command."); }
}

// --- EXPORT FEATURE ---
function exportRecord() {
    if(!isLoggedIn) { alert("Please sign in to export records."); return; }
    if(actionLog.length === 0) { alert("No records to export."); return; }
    
    let content = "METRO CALCULATOR - ACTION RECORD
";
    content += "User: Cheng Man Chun
";
    content += "Date: " + new Date().toLocaleString() + "
";
    content += "--------------------------------

";
    
    actionLog.forEach(entry => { content += `[${entry.time}] ${entry.message}
`; });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calculator_record.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    logAction("Exported record to file.");
}

// --- DATA PERSISTENCE (COOKIES/LOCALSTORAGE) ---
function saveData() {
    const data = {
        actionLog: actionLog,
        isLoggedIn: isLoggedIn,
        isPaidUser: isPaidUser,
        profileImage: document.getElementById('custom-avatar').src,
        glowBorder: document.documentElement.style.getPropertyValue('--border-glow'),
        glowSurface: document.documentElement.style.getPropertyValue('--surface-glow'),
        userVariables: userVariables,
        nonMetro: document.getElementById('non-metro-toggle').checked
    };
    localStorage.setItem('metroCalcData', JSON.stringify(data));
}

function loadData() {
    const json = localStorage.getItem('metroCalcData');
    if(!json) return;
    try {
        const data = JSON.parse(json);
        if(data.actionLog) { actionLog = data.actionLog; updateRecordDisplay(); }
        if(data.isLoggedIn) { isLoggedIn = true; document.getElementById('login-box').style.display='none'; document.getElementById('profile-box').style.display='block'; }
        if(data.isPaidUser) isPaidUser = true;
        if(data.profileImage && data.profileImage.startsWith('data:image')) { document.getElementById('default-avatar').style.display = 'none'; const img = document.getElementById('custom-avatar'); img.src = data.profileImage; img.style.display = 'block'; }
        if(data.glowBorder) document.documentElement.style.setProperty('--border-glow', data.glowBorder);
        if(data.glowSurface) document.documentElement.style.setProperty('--surface-glow', data.glowSurface);
        if(data.userVariables) userVariables = data.userVariables;
        if(data.nonMetro) {
            document.getElementById('non-metro-toggle').checked = true;
            toggleNonMetro();
        }
    } catch(e) { console.error("Load error", e); }
}

// --- PROFILE IMAGE ---
function triggerProfileUpload() { document.getElementById('profile-upload').click(); }

function updateProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('default-avatar').style.display = 'none';
            const img = document.getElementById('custom-avatar');
            img.src = e.target.result;
            img.style.display = 'block';
            logAction("Profile badge updated.");
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// --- SMART EQUATION PARSER ---
function preprocessMath(str) {
    str = str.replace(/\s+/g, '');
    str = str.replace(/÷/g, '/'); // Support Divide Symbol
    str = str.replace(/(\d)([a-z\(])/g, '$1*$2');
    str = str.replace(/(\))([\da-z\(])/g, '$1*$2');
    str = str.replace(/([a-z])(\()/g, '$1*$2');
    str = str.replace(/\^/g, '**');
    return str;
}

function getCoefficientsQuadratic(eqStr) {
    if(!eqStr.includes('=')) throw new Error("Missing '='");
    let parts = eqStr.split('=');
    if(parts.length > 2) throw new Error("Too many '='");
    
    let lhs = preprocessMath(parts[0]);
    let rhs = preprocessMath(parts[1]);
    let expr = `(${lhs}) - (${rhs})`;

    function evalAt(xVal) {
        let e = expr.replace(/\b[x]\b/g, `(${xVal})`);
        try { return eval(e); } catch(err) { throw new Error("Invalid Syntax"); }
    }

    let c = evalAt(0);
    let f1 = evalAt(1);
    let f_1 = evalAt(-1);

    let a = (f1 + f_1 - 2*c) / 2;
    let b = (f1 - f_1) / 2;

    const clean = (n) => Math.abs(n) < 1e-9 ? 0 : parseFloat(n.toFixed(8));
    return { x2: clean(a), x: clean(b), c: clean(c) };
}

function getCoefficientsLinear(eqStr) {
    if(!eqStr.includes('=')) throw new Error("Missing '='");
    let parts = eqStr.split('=');
    let lhs = preprocessMath(parts[0]);
    let rhs = preprocessMath(parts[1]);
    let expr = `(${lhs}) - (${rhs})`;

    function evalAt(x, y, z) {
        let e = expr.replace(/\bx\b/g, `(${x})`).replace(/\by\b/g, `(${y})`).replace(/\bz\b/g, `(${z})`);
        try { return eval(e); } catch(err) { throw new Error("Invalid Syntax"); }
    }

    let d = evalAt(0,0,0);
    let a = evalAt(1,0,0) - d;
    let b = evalAt(0,1,0) - d;
    let c = evalAt(0,0,1) - d;

    const clean = (n) => Math.abs(n) < 1e-9 ? 0 : parseFloat(n.toFixed(8));
    return { x: clean(a), y: clean(b), z: clean(c), c: clean(d) };
}

function solveQuadraticManual() {
    const resDiv = document.getElementById('res-quadratic');
    resDiv.classList.remove('error');
    logDev("Solving Quadratic...");
    try {
        const input = document.getElementById('q-input').value;
        if(!input.trim()) throw new Error("Empty Input");
        
        const coeffs = getCoefficientsQuadratic(input);
        const A = coeffs.x2, B = coeffs.x, C = coeffs.c;

        if (A === 0) {
            if (B === 0) resDiv.innerText = (C === 0) ? "True for all x" : "No Solution";
            else resDiv.innerText = `Linear: x = ${parseFloat((-C/B).toFixed(4))}`;
            return;
        }

        const d = B*B - 4*A*C;
        if (d > 0) {
            const x1 = (-B + Math.sqrt(d)) / (2*A);
            const x2 = (-B - Math.sqrt(d)) / (2*A);
            resDiv.innerText = `x₁ = ${parseFloat(x1.toFixed(4))}, x₂ = ${parseFloat(x2.toFixed(4))}`;
        } else if (d === 0) {
            const x = -B / (2*A);
            resDiv.innerText = `x = ${parseFloat(x.toFixed(4))}`;
        } else {
            resDiv.innerText = "No Real Solutions";
        }
        logDev("Quadratic Solved");
    } catch (e) {
        resDiv.classList.add('error');
        resDiv.innerText = e.message;
        logDev(`Error: ${e.message}`);
    }
}

function solveSystemManual() {
    const resDiv = document.getElementById('res-system');
    resDiv.classList.remove('error');
    logDev("Solving System...");
    try {
        const i1 = document.getElementById('s-input1').value;
        const i2 = document.getElementById('s-input2').value;
        const i3 = document.getElementById('s-input3').value;

        if(!i1.trim() || !i2.trim()) throw new Error("Enter at least 2 equations");

        const eq1 = getCoefficientsLinear(i1);
        const eq2 = getCoefficientsLinear(i2);
        const hasEq3 = i3.trim().length > 0;

        if (!hasEq3) {
            const a1 = eq1.x, b1 = eq1.y, c1 = -eq1.c;
            const a2 = eq2.x, b2 = eq2.y, c2 = -eq2.c;
            const det = a1*b2 - a2*b1;
            if (Math.abs(det) < 1e-9) resDiv.innerText = "No unique solution";
            else {
                const x = (c1*b2 - c2*b1) / det;
                const y = (a1*c2 - a2*c1) / det;
                resDiv.innerText = `x = ${parseFloat(x.toFixed(4))}, y = ${parseFloat(y.toFixed(4))}`;
            }
        } else {
            const eq3 = getCoefficientsLinear(i3);
            const a1=eq1.x, b1=eq1.y, c1=eq1.z, d1=-eq1.c;
            const a2=eq2.x, b2=eq2.y, c2=eq2.z, d2=-eq2.c;
            const a3=eq3.x, b3=eq3.y, c3=eq3.z, d3=-eq3.c;

            const D = a1*(b2*c3 - b3*c2) - b1*(a2*c3 - a3*c2) + c1*(a2*b3 - a3*b2);
            if (Math.abs(D) < 1e-9) resDiv.innerText = "No unique solution";
            else {
                const Dx = d1*(b2*c3 - b3*c2) - b1*(d2*c3 - d3*c2) + c1*(d2*b3 - d3*b2);
                const Dy = a1*(d2*c3 - d3*c2) - d1*(a2*c3 - a3*c2) + c1*(a2*d3 - a3*d2);
                const Dz = a1*(b2*d3 - b3*d2) - b1*(a2*d3 - a3*d2) + d1*(a2*b3 - a3*b2);
                resDiv.innerText = `x=${parseFloat((Dx/D).toFixed(4))}, y=${parseFloat((Dy/D).toFixed(4))}, z=${parseFloat((Dz/D).toFixed(4))}`;
            }
        }
    } catch (e) {
        resDiv.classList.add('error');
        resDiv.innerText = e.message;
        logDev(`Error: ${e.message}`);
    }
}

window.addEventListener('mousemove', e => {
    if(document.body.classList.contains('no-effects')) return;
    document.querySelectorAll('.reveal-btn, .memory-item').forEach(b => {
        const r=b.getBoundingClientRect(); b.style.setProperty('--x',(e.clientX-r.left)+'px'); b.style.setProperty('--y',(e.clientY-r.top)+'px');
    });
});

// --- VARIABLE SELECTION LOGIC ---
function setupEqualButtons() {
    const btns = [document.getElementById('btn-equal-basic'), document.getElementById('btn-equal-sci')];
    btns.forEach(btn => {
        if(!btn) return;
        
        let startY = 0;
        let startTime = 0;
        let longPressTimer = null;
        let isActionTriggered = false;

        const handleStart = (y) => {
            startY = y;
            startTime = Date.now();
            isActionTriggered = false;
            longPressTimer = setTimeout(() => {
                openVarModal('set'); // Long Press -> Set Algebra
                isActionTriggered = true;
                if(navigator.vibrate) navigator.vibrate(50);
            }, 600);
        };

        const handleMove = (y) => {
            if (isActionTriggered) return;
            if ((y - startY) > 40) { // Swipe Down -> Call Algebra
                clearTimeout(longPressTimer);
                openVarModal('insert');
                isActionTriggered = true;
            }
        };

        const handleEnd = () => {
            clearTimeout(longPressTimer);
            if (!isActionTriggered) {
                if (Date.now() - startTime < 600) { // Regular Click
                    calculate();
                }
            }
        };

        btn.addEventListener('mousedown', (e) => handleStart(e.clientY));
        btn.addEventListener('mousemove', (e) => { if(e.buttons === 1) handleMove(e.clientY); });
        btn.addEventListener('mouseup', handleEnd);
        btn.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
        
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); handleStart(e.touches[0].clientY); });
        btn.addEventListener('touchmove', (e) => { e.preventDefault(); handleMove(e.touches[0].clientY); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); handleEnd(); });
    });
}
function toggleBitKeypad() {
    const keypad = document.getElementById('bit-keypad');
    keypad.style.display = keypad.style.display === 'none' ? 'grid' : 'none';
}
