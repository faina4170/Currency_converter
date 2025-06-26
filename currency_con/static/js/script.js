// Основные валюты для выпадающих списков
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'RUB'];

// DOM элементы
const elements = {
    updateRatesBtn: document.getElementById('updateRatesBtn'),
    lastUpdate: document.getElementById('lastUpdate'),
    fromCurrency: document.getElementById('fromCurrency'),
    toCurrency: document.getElementById('toCurrency'),
    amount: document.getElementById('amount'),
    swapCurrencies: document.getElementById('swapCurrencies'),
    converterForm: document.getElementById('converterForm'),
    resultBox: document.getElementById('resultBox'),
    fromAmount: document.getElementById('fromAmount'),
    toAmount: document.getElementById('toAmount'),
    exchangeRate: document.getElementById('exchangeRate')
};

// Инициализация приложения
function initApp() {
    populateCurrencySelects();
    loadLastUpdate();
    setupEventListeners();
}

// Заполнение выпадающих списков валют
function populateCurrencySelects() {
    CURRENCIES.forEach(currency => {
        const option1 = document.createElement('option');
        option1.value = currency;
        option1.textContent = currency;
        elements.fromCurrency.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = currency;
        option2.textContent = currency;
        elements.toCurrency.appendChild(option2);
    });

    // Установка значений по умолчанию
    elements.fromCurrency.value = 'USD';
    elements.toCurrency.value = 'EUR';
}

// Загрузка даты последнего обновления
function loadLastUpdate() {
    fetch('/api/last_update')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateLastUpdateDisplay(data.last_updated);
            }
        })
        .catch(error => console.error('Error loading last update:', error));
}

// Обновление отображения даты последнего обновления
function updateLastUpdateDisplay(timestamp) {
    elements.lastUpdate.textContent = `Last update: ${new Date(timestamp).toLocaleString()}`;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обновление курсов валют
    elements.updateRatesBtn.addEventListener('click', updateExchangeRates);

    // Обмен валют местами
    elements.swapCurrencies.addEventListener('click', swapCurrencies);

    // Конвертация валют
    elements.converterForm.addEventListener('submit', convertCurrency);
}

// Обновление курсов валют
function updateExchangeRates() {
    const btn = elements.updateRatesBtn;
    btn.disabled = true;
    btn.innerHTML = '<span class="updating">↻</span> Updating...';

    fetch('/api/update_rates', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            updateLastUpdateDisplay(data.last_updated);
            showAlert('Exchange rates updated successfully!', 'success');
        } else {
            showAlert('Failed to update exchange rates.', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating rates:', error);
        showAlert('An error occurred while updating rates.', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Update Rates';
    });
}

// Обмен валют местами
function swapCurrencies() {
    const temp = elements.fromCurrency.value;
    elements.fromCurrency.value = elements.toCurrency.value;
    elements.toCurrency.value = temp;
}

// Конвертация валют
function convertCurrency(e) {
    e.preventDefault();

    const fromCurrency = elements.fromCurrency.value;
    const toCurrency = elements.toCurrency.value;
    const amount = parseFloat(elements.amount.value);

    if (!fromCurrency || !toCurrency || isNaN(amount) || amount <= 0) {
        showAlert('Please fill all fields with valid values.', 'error');
        return;
    }

    fetch('/api/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            amount: amount
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            displayConversionResult(data, amount, fromCurrency, toCurrency);
        } else {
            showAlert(data.message || 'Conversion failed', 'error');
        }
    })
    .catch(error => {
        console.error('Error converting currency:', error);
        showAlert('An error occurred during conversion.', 'error');
    });
}

// Отображение результата конвертации
function displayConversionResult(data, amount, fromCurrency, toCurrency) {
    elements.fromAmount.textContent = `${amount} ${fromCurrency}`;
    elements.toAmount.textContent = `${data.result} ${toCurrency}`;
    elements.exchangeRate.textContent = `Exchange rate: 1 ${fromCurrency} = ${data.rate} ${toCurrency}`;
    elements.resultBox.style.display = 'block';
}

// Показать уведомление
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} mt-3`;
    alertDiv.textContent = message;

    const cardBody = document.querySelector('.card-body');
    cardBody.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);