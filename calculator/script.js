document.addEventListener('DOMContentLoaded', () => {
    let expression = '';
    let lastResult = '';
    let isShowingResult = false;
    let history = JSON.parse(localStorage.getItem('calc_history_separate')) || [];

    const displayExpr = document.getElementById('display-expr');
    const displayInput = document.getElementById('display-input');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const calcKeys = document.querySelectorAll('.calc-key');


    updateDisplay();
    renderHistory();

    calcKeys.forEach(key => {
        key.addEventListener('click', () => {
            const keyValue = key.getAttribute('data-key');
            const keyAction = key.getAttribute('data-action');
            handleInput(keyValue, keyAction);
            triggerButtonFeedback(key);
        });
    });

    window.addEventListener('keydown', (e) => {
        let key = e.key;
        let action = '';

        if (/[0-9]/.test(key)) {
            action = 'digit';
        } else if (key === '.') {
            action = 'decimal';
        } else if (['+', '-', '*', '/'].includes(key)) {
            action = 'operator';
        } else if (key === '%') {
            action = 'operator';
        } else if (key === 'Enter' || key === '=') {
            key = 'Enter';
            action = 'equals';
            e.preventDefault();
        } else if (key === 'Backspace') {
            action = 'delete';
        } else if (key === 'Escape') {
            action = 'clear';
        } else if (key.toLowerCase() === 'c') {
            key = 'Escape';
            action = 'clear';
        }

        if (action) {
            handleInput(key, action);

            let uiKey = document.querySelector(`.calc-key[data-key="${key}"]`);
            if (uiKey) {
                triggerButtonFeedback(uiKey);
            }
        }
    });

    clearHistoryBtn.addEventListener('click', () => {
        history = [];
        localStorage.setItem('calc_history_separate', JSON.stringify(history));
        renderHistory();
    });


    function handleInput(value, action) {
        if (isShowingResult && ['digit', 'decimal'].includes(action)) {
            expression = '';
            isShowingResult = false;
        } else if (isShowingResult && action === 'operator') {
            expression = lastResult;
            isShowingResult = false;
        }

        switch (action) {
            case 'digit':
                appendDigit(value);
                break;
            case 'decimal':
                appendDecimal();
                break;
            case 'operator':
                appendOperator(value);
                break;
            case 'negate':
                negateExpression();
                break;
            case 'delete':
                deleteLastChar();
                break;
            case 'clear':
                clearAll();
                break;
            case 'equals':
                calculateResult();
                break;
        }

        updateDisplay();
    }

    function appendDigit(digit) {
        if (expression === '0' && digit === '0') return;
        if (expression === '0') {
            expression = digit;
        } else {
            expression += digit;
        }
    }

    function appendDecimal() {
        const tokens = expression.split(/[\+\-\*\/]/);
        const lastToken = tokens[tokens.length - 1];
        if (!lastToken.includes('.')) {
            if (lastToken === '') {
                expression += '0.';
            } else {
                expression += '.';
            }
        }
    }

    function appendOperator(op) {
        if (expression === '') {
            if (op === '-') {
                expression = '-';
            }
            return;
        }

        const lastChar = expression.slice(-1);
        if (['+', '-', '*', '/'].includes(lastChar)) {
            expression = expression.slice(0, -1) + op;
        } else {
            expression += op;
        }
    }

    function negateExpression() {
        if (expression === '' || expression === '0') {
            expression = '-';
            return;
        }

        const match = expression.match(/(-?[0-9.]+)$/);
        if (match) {
            const num = match[0];
            const index = expression.lastIndexOf(num);
            if (num.startsWith('-')) {
                expression = expression.slice(0, index) + num.slice(1);
            } else {
                expression = expression.slice(0, index) + '-' + num;
            }
        } else {
            expression += '-';
        }
    }

    function deleteLastChar() {
        if (expression.length > 0) {
            expression = expression.slice(0, -1);
        }
        if (expression === '') {
            expression = '0';
        }
    }

    function clearAll() {
        expression = '0';
        isShowingResult = false;
    }

    function calculateResult() {
        if (expression === '' || expression === '0') return;

        try {
            let jsExpr = expression
                .replace(/÷/g, '/')
                .replace(/×/g, '*')
                .replace(/%/g, '*0.01'); // Treat percentage as scaling factor

            const evalFunc = new Function(`return ${jsExpr}`);
            const result = evalFunc();

            if (result === undefined || isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid Expression');
            }

            const formattedResult = formatResult(result);

            saveHistoryItem(expression, formattedResult);

            displayExpr.textContent = expression + ' =';
            displayInput.textContent = formattedResult;

            lastResult = formattedResult;
            expression = formattedResult;
            isShowingResult = true;
        } catch (error) {
            displayExpr.textContent = expression;
            displayInput.textContent = 'Error';
            expression = '0';
            isShowingResult = true;
        }
    }

    function formatResult(val) {
        const precisionLimit = 12;
        let strVal = val.toString();

        if (strVal.includes('.') && strVal.length > precisionLimit) {
            const decimalPlaces = precisionLimit - strVal.split('.')[0].length;
            if (decimalPlaces > 0) {
                return Number(val.toFixed(Math.min(10, decimalPlaces))).toString();
            }
        }

        if (Math.abs(val) > 1e12 || (Math.abs(val) < 1e-6 && val !== 0)) {
            return val.toExponential(6);
        }

        return strVal;
    }

    function updateDisplay() {
        if (!isShowingResult) {
            displayExpr.textContent = expression === '0' ? '' : expression;
            displayInput.textContent = expression === '' ? '0' : expression;
        }
        adjustDisplayFontSize();
    }

    function adjustDisplayFontSize() {
        const length = displayInput.textContent.length;
        if (length > 14) {
            displayInput.style.fontSize = '1.6rem';
        } else if (length > 8) {
            displayInput.style.fontSize = '2.2rem';
        } else {
            displayInput.style.fontSize = '2.8rem';
        }
    }


    function triggerButtonFeedback(element) {
        element.classList.add('btn-active');
        element.classList.add('key-press-highlight');
        setTimeout(() => {
            element.classList.remove('btn-active');
            element.classList.remove('key-press-highlight');
        }, 120);
    }

    function saveHistoryItem(expr, res) {
        if (history.length > 0 && history[0].expr === expr && history[0].result === res) {
            return;
        }
        history.unshift({ expr, result: res });
        if (history.length > 20) {
            history.pop();
        }
        localStorage.setItem('calc_history_separate', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (history.length === 0) {
            historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach((item) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-item-expr">${item.expr}</div>
                <div class="history-item-result">${item.result}</div>
            `;

            historyItem.addEventListener('click', () => {
                expression = item.result;
                displayExpr.textContent = item.expr + ' =';
                displayInput.textContent = item.result;
                isShowingResult = true;
                adjustDisplayFontSize();
            });

            historyList.appendChild(historyItem);
        });
    }
});
