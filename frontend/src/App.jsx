import React, { useState, useEffect } from 'react';
import { ShoppingCart, Edit2, Trash2, LogOut, User, Search, Menu, Package, Plus, Minus, X } from 'lucide-react';

// const API_URL = 'http://localhost:5000/api';
const API_URL = 'https://agro-shop-backend.onrender.com/api';

export default function AgroShopApp() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeView, setActiveView] = useState('products');
  const [showLogin, setShowLogin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCartSidebar, setShowCartSidebar] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [productForm, setProductForm] = useState({
    id: null,
    name: '',
    category: '',
    description: '',
    price: '',
    stock: '',
    image_url: ''
  });

  const categories = ['All', 'Seeds', 'Fertilizers', 'Equipment', 'Pesticides', 'Tools'];

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  useEffect(() => {
    let filtered = products;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        setShowLogin(true);
        setFormData({ username: '', email: '', password: '' });
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Registration failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setCart([]);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setShowCartSidebar(true);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId, quantity) => {
    if (quantity === 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const handleCheckout = async () => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderData = {
      total_amount: total,
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))
    };

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        alert('Order placed successfully! 🎉');
        setCart([]);
        setShowCartSidebar(false);
        fetchProducts();
      }
    } catch (error) {
      alert('Order failed');
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const method = productForm.id ? 'PUT' : 'POST';
    const url = productForm.id ? `${API_URL}/products/${productForm.id}` : `${API_URL}/products`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productForm)
      });

      if (response.ok) {
        alert(productForm.id ? 'Product updated successfully! ✓' : 'Product added successfully! ✓');
        setProductForm({ id: null, name: '', category: '', description: '', price: '', stock: '', image_url: '' });
        fetchProducts();
        setActiveView('products');
      }
    } catch (error) {
      alert('Operation failed');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Product deleted successfully!');
        fetchProducts();
      }
    } catch (error) {
      alert('Delete failed');
    }
  };

  const editProduct = (product) => {
    setProductForm(product);
    setActiveView('manage');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full flex">
          <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-green-600 to-green-700 p-12 text-white">
            <h1 className="text-4xl font-bold mb-4">🌾 AgroShop</h1>
            <p className="text-lg mb-8">Your trusted partner for quality agricultural products</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded">✓</div>
                <span>Premium Quality Seeds</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded">✓</div>
                <span>Organic Fertilizers</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded">✓</div>
                <span>Modern Equipment</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-2 rounded">✓</div>
                <span>Fast Delivery</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 p-8">
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${showLogin ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}
              >
                Login
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${!showLogin ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600'}`}
              >
                Register
              </button>
            </div>

            <div>
              {!showLogin && (
                <input
                  type="text"
                  placeholder="Username"
                  className="w-full p-4 border-2 border-gray-200 rounded-lg mb-4 focus:border-green-500 focus:outline-none"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                className="w-full p-4 border-2 border-gray-200 rounded-lg mb-4 focus:border-green-500 focus:outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-4 border-2 border-gray-200 rounded-lg mb-6 focus:border-green-500 focus:outline-none"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button 
                onClick={showLogin ? handleLogin : handleRegister}
                className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg"
              >
                {showLogin ? 'Login' : 'Create Account'}
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 text-center font-medium">Demo Credentials</p>
              <p className="text-xs text-gray-500 text-center mt-1">
                Admin: admin@agroshop.com / admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <User size={16} />
                {user?.username}
              </span>
              {user?.role === 'admin' && (
                <span className="bg-yellow-400 text-green-900 px-2 py-1 rounded text-xs font-semibold">
                  ADMIN
                </span>
              )}
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 hover:text-green-200 transition"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-green-700">🌾 Shree Ganesh Agro</h1>
            </div>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for agricultural products..."
                  className="w-full px-4 py-3 pl-12 border-2 border-green-500 rounded-lg focus:outline-none focus:border-green-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {user?.role === 'customer' && (
              <button
                onClick={() => setShowCartSidebar(!showCartSidebar)}
                className="relative flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                <ShoppingCart size={20} />
                <span className="font-semibold">Cart</span>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="border-t">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto py-2">
              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveView('products')}
                    className={`px-6 py-2 rounded-lg whitespace-nowrap transition ${activeView === 'products' ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
                  >
                    All Products
                  </button>
                  <button
                    onClick={() => setActiveView('manage')}
                    className={`px-6 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 transition ${activeView === 'manage' ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
                  >
                    <Plus size={16} />
                    Add Product
                  </button>
                </>
              )}
              {user?.role === 'customer' && categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-lg whitespace-nowrap transition ${selectedCategory === cat ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeView === 'products' && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedCategory === 'All' ? 'All Products' : selectedCategory}
              </h2>
              <p className="text-gray-600">{filteredProducts.length} products found</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition group">
                  <div className="relative overflow-hidden">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-56 object-cover group-hover:scale-110 transition duration-300" 
                    />
                    {product.stock < 10 && product.stock > 0 && (
                      <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                        Only {product.stock} left
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                    <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-bold text-green-700">₹{product.price}</span>
                      </div>
                    </div>

                    {user?.role === 'customer' && (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className={`w-full py-2 rounded-lg font-semibold transition ${
                          product.stock === 0 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    )}

                    {user?.role === 'admin' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => editProduct(product)}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-16">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-xl text-gray-500">No products found</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'manage' && user?.role === 'admin' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">
                {productForm.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Name</label>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter product description"
                    rows="3"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Stock</label>
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={handleProductSubmit}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                  >
                    {productForm.id ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    onClick={() => {
                      setProductForm({ id: null, name: '', category: '', description: '', price: '', stock: '', image_url: '' });
                      setActiveView('products');
                    }}
                    className="px-8 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Cart Sidebar */}
      {showCartSidebar && user?.role === 'customer' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCartSidebar(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full">
              <div className="bg-green-600 text-white p-4 flex justify-between items-center">
                <h3 className="text-xl font-bold">My Cart ({cartItemsCount} items)</h3>
                <button onClick={() => setShowCartSidebar(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white border rounded-lg p-4">
                        <div className="flex gap-4">
                          <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                            <p className="text-green-600 font-bold">₹{item.price}</p>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="font-semibold">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                              >
                                <Plus size={16} />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="ml-auto text-red-600 text-sm hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-600">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition text-lg"
                  >
                    Place Order
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}