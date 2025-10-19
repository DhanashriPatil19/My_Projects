from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import hashlib
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Dhanu@1701',
    'database': 'agro_shop'
}

def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        print(f"Error: {e}")
        return None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.split()[1] if len(token.split()) > 1 else token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != 'admin':
            return jsonify({'message': 'Admin access required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# Authentication Routes
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor()
    try:
        hashed_password = hash_password(data['password'])
        cursor.execute(
            "INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, %s)",
            (data['username'], data['email'], hashed_password, 'customer')
        )
        conn.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except Error as e:
        return jsonify({'message': f'Registration failed: {str(e)}'}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        hashed_password = hash_password(data['password'])
        cursor.execute(
            "SELECT * FROM users WHERE email = %s AND password = %s",
            (data['email'], hashed_password)
        )
        user = cursor.fetchone()
        
        if user:
            token = jwt.encode({
                'user_id': user['id'],
                'email': user['email'],
                'role': user['role'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm="HS256")
            
            return jsonify({
                'token': token,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email'],
                    'role': user['role']
                }
            }), 200
        return jsonify({'message': 'Invalid credentials'}), 401
    finally:
        cursor.close()
        conn.close()

# Product Routes (Admin)
@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM products WHERE stock > 0")
        products = cursor.fetchall()
        return jsonify(products), 200
    finally:
        cursor.close()
        conn.close()

@app.route('/api/products', methods=['POST'])
@token_required
@admin_required
def add_product(current_user):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO products (name, category, description, price, stock, image_url) VALUES (%s, %s, %s, %s, %s, %s)",
            (data['name'], data['category'], data['description'], data['price'], data['stock'], data.get('image_url', ''))
        )
        conn.commit()
        return jsonify({'message': 'Product added successfully', 'id': cursor.lastrowid}), 201
    except Error as e:
        return jsonify({'message': f'Failed to add product: {str(e)}'}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/products/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_product(current_user, id):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE products SET name=%s, category=%s, description=%s, price=%s, stock=%s, image_url=%s WHERE id=%s",
            (data['name'], data['category'], data['description'], data['price'], data['stock'], data.get('image_url', ''), id)
        )
        conn.commit()
        return jsonify({'message': 'Product updated successfully'}), 200
    except Error as e:
        return jsonify({'message': f'Failed to update product: {str(e)}'}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/products/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_product(current_user, id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM products WHERE id = %s", (id,))
        conn.commit()
        return jsonify({'message': 'Product deleted successfully'}), 200
    finally:
        cursor.close()
        conn.close()

# Order Routes (Customer)
@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s)",
            (current_user['user_id'], data['total_amount'], 'pending')
        )
        order_id = cursor.lastrowid
        
        for item in data['items']:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (%s, %s, %s, %s)",
                (order_id, item['product_id'], item['quantity'], item['price'])
            )
            cursor.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (item['quantity'], item['product_id'])
            )
        
        conn.commit()
        return jsonify({'message': 'Order placed successfully', 'order_id': order_id}), 201
    except Error as e:
        conn.rollback()
        return jsonify({'message': f'Failed to create order: {str(e)}'}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor(dictionary=True)
    try:
        if current_user['role'] == 'admin':
            cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
        else:
            cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC", (current_user['user_id'],))
        orders = cursor.fetchall()
        return jsonify(orders), 200
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)