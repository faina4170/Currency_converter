from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import requests

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///exchange_rates.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class ExchangeRate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    base_currency = db.Column(db.String(3), nullable=False)
    target_currency = db.Column(db.String(3), nullable=False)
    rate = db.Column(db.Float, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)


with app.app_context():
    db.create_all()

API_URL = "https://api.exchangerate-api.com/v4/latest/USD"


def fetch_exchange_rates():
    try:
        # 1. Запрос к API
        response = requests.get(API_URL)
        data = response.json()  # Данные в формате JSON

        # 2. Очистка старых данных
        ExchangeRate.query.delete()

        # 3. Извлечение базовой валюты (USD) и курсов
        base_currency = data['base']  # Например, 'USD'
        rates = data['rates']         # Словарь вида {'EUR': 0.92, 'GBP': 0.79, ...}

        # 4. Сохранение каждого курса в БД
        for currency, rate in rates.items():
            new_rate = ExchangeRate(
                base_currency=base_currency,
                target_currency=currency,
                rate=rate
            )
            db.session.add(new_rate)  # Добавление записи в сессию

        # 5. Фиксация изменений в БД
        db.session.commit()
        return True

    except Exception as e:
        print(f"Error fetching rates: {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/update_rates', methods=['POST'])
def update_rates():
    success = fetch_exchange_rates()
    if success:
        last_update = ExchangeRate.query.order_by(ExchangeRate.last_updated.desc()).first().last_updated
        return jsonify({
            'status': 'success',
            'message': 'Exchange rates updated successfully',
            'last_updated': last_update.isoformat()
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'Failed to update exchange rates'
        }), 500


@app.route('/api/last_update', methods=['GET'])
def get_last_update():
    last_rate = ExchangeRate.query.order_by(ExchangeRate.last_updated.desc()).first()
    if last_rate:
        return jsonify({
            'status': 'success',
            'last_updated': last_rate.last_updated.isoformat()
        })
    else:
        return jsonify({
            'status': 'error',
            'message': 'No rates available'
        }), 404


@app.route('/api/convert', methods=['POST'])
def convert_currency():
    data = request.get_json()
    from_currency = data.get('from_currency', '').upper()
    to_currency = data.get('to_currency', '').upper()
    amount = float(data.get('amount', 0))

    if not from_currency or not to_currency or amount <= 0:
        return jsonify({
            'status': 'error',
            'message': 'Invalid input data'
        }), 400

    if from_currency == 'USD':
        to_rate = ExchangeRate.query.filter_by(
            base_currency='USD',
            target_currency=to_currency
        ).first()

        if not to_rate:
            return jsonify({
                'status': 'error',
                'message': f'No rate available for {to_currency}'
            }), 404

        result = amount * to_rate.rate
    else:
        from_rate = ExchangeRate.query.filter_by(
            base_currency='USD',
            target_currency=from_currency
        ).first()

        if not from_rate:
            return jsonify({
                'status': 'error',
                'message': f'No rate available for {from_currency}'
            }), 404

        if to_currency == 'USD':
            result = amount / from_rate.rate
        else:
            to_rate = ExchangeRate.query.filter_by(
                base_currency='USD',
                target_currency=to_currency
            ).first()

            if not to_rate:
                return jsonify({
                    'status': 'error',
                    'message': f'No rate available for {to_currency}'
                }), 404

            result = amount * (to_rate.rate / from_rate.rate)

    return jsonify({
        'status': 'success',
        'from_currency': from_currency,
        'to_currency': to_currency,
        'amount': amount,
        'result': round(result, 4),
        'rate': round(result / amount, 6) if amount != 0 else 0
    })


if __name__ == '__main__':
    app.run(debug=True)