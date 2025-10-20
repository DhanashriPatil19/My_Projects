import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
CORS(app)

# Secret key for JWT
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")

# PostgreSQL connection setup
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("PGHOST"),
            database=os.getenv("PGDATABASE"),
            user=os.getenv("PGUSER"),
            password=os.getenv("PGPASSWORD"),
            port=os.getenv("PGPORT")
        )
        return conn
    except Exception as e:
        print("❌ Database connection failed:", e)
        return None

# Token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.split()[1] if len(token.split()) > 1 else token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# Admin check decorator
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/')
def home():
    return jsonify({"message": "AgroShop API - PostgreSQL Backend Running"})

# ==================== USER ROUTES ====================

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({'error': 'Missing required fields'}), 400

    hashed_pw = generate_password_hash(password)

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        # Check if user already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already registered'}), 400
        
        cur.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (name, email, hashed_pw, 'customer')
        )
        conn.commit()
        return jsonify({'message': 'User registered successfully'}), 201
    except Exception as e:
        print("Registration error:", e)
        conn.rollback()
        return jsonify({'error': 'User registration failed'}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT id, name, email, password, role FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if user and check_password_hash(user['password'], password):
            token = jwt.encode({
                'user_id': user['id'],
                'email': user['email'],
                'role': user['role'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }, app.config['SECRET_KEY'], algorithm='HS256')

            return jsonify({
                'token': token,
                'name': user['name'],
                'email': user['email'],
                'role': user['role']
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print("Login error:", e)
        return jsonify({'error': 'Login failed'}), 500
    finally:
        cur.close()
        conn.close()

# ==================== PRODUCT ROUTES ====================

@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT id, name, price, category, description, stock, image_url FROM products ORDER BY id DESC")
        products = cur.fetchall()
        return jsonify(products), 200
    except Exception as e:
        print("Fetch products error:", e)
        return jsonify({'error': 'Failed to fetch products'}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/products', methods=['POST'])
@token_required
@admin_required
def add_product(current_user):
    data = request.get_json()
    
    required_fields = ['name', 'category', 'price']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO products (name, category, description, price, stock, image_url) 
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (
                data['name'],
                data['category'],
                data.get('description', ''),
                data['price'],
                data.get('stock', 0),
                data.get('image_url', '')
            )
        )
        product_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({'message': 'Product added successfully', 'id': product_id}), 201
    except Exception as e:
        print("Add product error:", e)
        conn.rollback()
        return jsonify({'error': 'Failed to add product'}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/products/<int:id>', methods=['PUT'])
@token_required
@admin_required
def update_product(current_user, id):
    data = request.get_json()

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        cur.execute(
            """UPDATE products 
               SET name=%s, category=%s, description=%s, price=%s, stock=%s, image_url=%s 
               WHERE id=%s""",
            (
                data['name'],
                data['category'],
                data.get('description', ''),
                data['price'],
                data.get('stock', 0),
                data.get('image_url', ''),
                id
            )
        )
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify({'message': 'Product updated successfully'}), 200
    except Exception as e:
        print("Update product error:", e)
        conn.rollback()
        return jsonify({'error': 'Failed to update product'}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/products/<int:id>', methods=['DELETE'])
@token_required
@admin_required
def delete_product(current_user, id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM products WHERE id = %s", (id,))
        conn.commit()
        if cur.rowcount == 0:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify({'message': 'Product deleted successfully'}), 200
    except Exception as e:
        print("Delete product error:", e)
        conn.rollback()
        return jsonify({'error': 'Failed to delete product'}), 500
    finally:
        cur.close()
        conn.close()

# ==================== ORDER ROUTES ====================

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json()

    if not data.get('items') or not data.get('total_amount'):
        return jsonify({'error': 'Invalid order data'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        # Create order
        cur.execute(
            "INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s) RETURNING id",
            (current_user['user_id'], data['total_amount'], 'pending')
        )
        order_id = cur.fetchone()[0]

        # Add order items and update stock
        for item in data['items']:
            cur.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (%s, %s, %s, %s)",
                (order_id, item['product_id'], item['quantity'], item['price'])
            )
            cur.execute(
                "UPDATE products SET stock = stock - %s WHERE id = %s",
                (item['quantity'], item['product_id'])
            )

        conn.commit()
        return jsonify({'message': 'Order placed successfully', 'order_id': order_id}), 201
    except Exception as e:
        print("Create order error:", e)
        conn.rollback()
        return jsonify({'error': 'Failed to create order'}), 500
    finally:
        cur.close()
        conn.close()

@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        if current_user['role'] == 'admin':
            cur.execute("SELECT * FROM orders ORDER BY created_at DESC")
        else:
            cur.execute(
                "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC",
                (current_user['user_id'],)
            )
        orders = cur.fetchall()
        return jsonify(orders), 200
    except Exception as e:
        print("Fetch orders error:", e)
        return jsonify({'error': 'Failed to fetch orders'}), 500
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)




# from flask import Flask, request, jsonify
# from flask_cors import CORS
# import mysql.connector
# from mysql.connector import Error
# import hashlib
# import jwt
# import datetime
# from functools import wraps
# from dotenv import load_dotenv
# import os

# # Load environment variables from .env file
# load_dotenv()

# app = Flask(__name__)
# CORS(app)

# # Use environment variable for secret key
# app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# # Database configuration using environment variables
# DB_CONFIG = {
#     'host': os.getenv('DB_HOST'),
#     'user': os.getenv('DB_USER'),
#     'password': os.getenv('DB_PASSWORD'),
#     'database': os.getenv('DB_NAME')
# }

# def get_db_connection():
#     try:
#         conn = mysql.connector.connect(**DB_CONFIG)
#         return conn
#     except Error as e:
#         print(f"Error: {e}")
#         return None

# def hash_password(password):
#     return hashlib.sha256(password.encode()).hexdigest()

# def token_required(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         token = request.headers.get('Authorization')
#         if not token:
#             return jsonify({'message': 'Token is missing'}), 401
#         try:
#             token = token.split()[1] if len(token.split()) > 1 else token
#             data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
#             current_user = data
#         except:
#             return jsonify({'message': 'Token is invalid'}), 401
#         return f(current_user, *args, **kwargs)
#     return decorated

# def admin_required(f):
#     @wraps(f)
#     def decorated(current_user, *args, **kwargs):
#         if current_user.get('role') != 'admin':
#             return jsonify({'message': 'Admin access required'}), 403
#         return f(current_user, *args, **kwargs)
#     return decorated

# # Authentication Routes
# @app.route('/api/register', methods=['POST'])
# def register():
#     data = request.json
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor()
#     try:
#         hashed_password = hash_password(data['password'])
#         cursor.execute(
#             "INSERT INTO users (username, email, password, role) VALUES (%s, %s, %s, %s)",
#             (data['username'], data['email'], hashed_password, 'customer')
#         )
#         conn.commit()
#         return jsonify({'message': 'User registered successfully'}), 201
#     except Error as e:
#         return jsonify({'message': f'Registration failed: {str(e)}'}), 400
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/login', methods=['POST'])
# def login():
#     data = request.json
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor(dictionary=True)
#     try:
#         hashed_password = hash_password(data['password'])
#         cursor.execute(
#             "SELECT * FROM users WHERE email = %s AND password = %s",
#             (data['email'], hashed_password)
#         )
#         user = cursor.fetchone()
        
#         if user:
#             token = jwt.encode({
#                 'user_id': user['id'],
#                 'email': user['email'],
#                 'role': user['role'],
#                 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
#             }, app.config['SECRET_KEY'], algorithm="HS256")
            
#             return jsonify({
#                 'token': token,
#                 'user': {
#                     'id': user['id'],
#                     'username': user['username'],
#                     'email': user['email'],
#                     'role': user['role']
#                 }
#             }), 200
#         return jsonify({'message': 'Invalid credentials'}), 401
#     finally:
#         cursor.close()
#         conn.close()

# # Product Routes (Admin)
# @app.route('/api/products', methods=['GET'])
# def get_products():
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor(dictionary=True)
#     try:
#         cursor.execute("SELECT * FROM products WHERE stock > 0")
#         products = cursor.fetchall()
#         return jsonify(products), 200
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/products', methods=['POST'])
# @token_required
# @admin_required
# def add_product(current_user):
#     data = request.json
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor()
#     try:
#         cursor.execute(
#             "INSERT INTO products (name, category, description, price, stock, image_url) VALUES (%s, %s, %s, %s, %s, %s)",
#             (data['name'], data['category'], data['description'], data['price'], data['stock'], data.get('image_url', ''))
#         )
#         conn.commit()
#         return jsonify({'message': 'Product added successfully', 'id': cursor.lastrowid}), 201
#     except Error as e:
#         return jsonify({'message': f'Failed to add product: {str(e)}'}), 400
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/products/<int:id>', methods=['PUT'])
# @token_required
# @admin_required
# def update_product(current_user, id):
#     data = request.json
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor()
#     try:
#         cursor.execute(
#             "UPDATE products SET name=%s, category=%s, description=%s, price=%s, stock=%s, image_url=%s WHERE id=%s",
#             (data['name'], data['category'], data['description'], data['price'], data['stock'], data.get('image_url', ''), id)
#         )
#         conn.commit()
#         return jsonify({'message': 'Product updated successfully'}), 200
#     except Error as e:
#         return jsonify({'message': f'Failed to update product: {str(e)}'}), 400
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/products/<int:id>', methods=['DELETE'])
# @token_required
# @admin_required
# def delete_product(current_user, id):
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor()
#     try:
#         cursor.execute("DELETE FROM products WHERE id = %s", (id,))
#         conn.commit()
#         return jsonify({'message': 'Product deleted successfully'}), 200
#     finally:
#         cursor.close()
#         conn.close()

# # Order Routes (Customer)
# @app.route('/api/orders', methods=['POST'])
# @token_required
# def create_order(current_user):
#     data = request.json
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor()
#     try:
#         cursor.execute(
#             "INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s)",
#             (current_user['user_id'], data['total_amount'], 'pending')
#         )
#         order_id = cursor.lastrowid
        
#         for item in data['items']:
#             cursor.execute(
#                 "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (%s, %s, %s, %s)",
#                 (order_id, item['product_id'], item['quantity'], item['price'])
#             )
#             cursor.execute(
#                 "UPDATE products SET stock = stock - %s WHERE id = %s",
#                 (item['quantity'], item['product_id'])
#             )
        
#         conn.commit()
#         return jsonify({'message': 'Order placed successfully', 'order_id': order_id}), 201
#     except Error as e:
#         conn.rollback()
#         return jsonify({'message': f'Failed to create order: {str(e)}'}), 400
#     finally:
#         cursor.close()
#         conn.close()

# @app.route('/api/orders', methods=['GET'])
# @token_required
# def get_orders(current_user):
#     conn = get_db_connection()
#     if not conn:
#         return jsonify({'message': 'Database connection failed'}), 500
    
#     cursor = conn.cursor(dictionary=True)
#     try:
#         if current_user['role'] == 'admin':
#             cursor.execute("SELECT * FROM orders ORDER BY created_at DESC")
#         else:
#             cursor.execute("SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC", (current_user['user_id'],))
#         orders = cursor.fetchall()
#         return jsonify(orders), 200
#     finally:
#         cursor.close()
#         conn.close()

# if __name__ == '__main__':
#     app.run(debug=True, port=5000)