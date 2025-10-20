import React, { useState, useEffect } from 'react';
import { ShoppingCart, Edit2, Trash2, LogOut, User, Search, Plus, Minus, X, Package, TrendingUp, Star, Heart } from 'lucide-react';

const API_URL = 'https://agro-shop-y0t2.onrender.com/api';
// For local development, use: const API_URL = 'http://localhost:5000/api';

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
      
      // Backend returns products - map to include default values for missing fields
      const productsWithDefaults = data.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description || 'No description available',
        stock: p.stock || 0,
        image_url: p.image_url || 'https://via.placeholder.com/400x300?text=No+Image'
      }));
      
      setProducts(productsWithDefaults);
      setFilteredProducts(productsWithDefaults);
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
        // Backend returns: { token, name, email, role }
        const userObj = {
          username: data.name,
          email: data.email,
          role: data.role || 'customer'
        };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userObj));
        setToken(data.token);
        setUser(userObj);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.username,
          email: formData.email, 
          password: formData.password 
        })
      });
      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! Please login.');
        setShowLogin(true);
        setFormData({ username: '', email: '', password: '' });
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
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
        alert('🎉 Order placed successfully!');
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
        alert(productForm.id ? '✓ Product updated successfully!' : '✓ Product added successfully!');
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full flex">
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-12 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
            </div>
            
            <div className="relative z-10">
              <div className="text-6xl mb-4">🌾</div>
              <h1 className="text-5xl font-bold text-white mb-4">AgroShop</h1>
              <p className="text-xl text-green-100 mb-8">Premium Agricultural Products Marketplace</p>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-4 bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <Package className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Premium Quality</p>
                  <p className="text-green-100 text-sm">Certified products only</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <TrendingUp className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Best Prices</p>
                  <p className="text-green-100 text-sm">Competitive market rates</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <Star className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Trusted by 10,000+ Farmers</p>
                  <p className="text-green-100 text-sm">4.8★ Rating</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 p-10">
            <div className="flex gap-2 mb-8 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setShowLogin(true)}
                className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${showLogin ? 'bg-white text-green-600 shadow-md' : 'text-gray-500'}`}
              >
                Login
              </button>
              <button
                onClick={() => setShowLogin(false)}
                className={`flex-1 py-3 rounded-lg font-bold transition-all duration-300 ${!showLogin ? 'bg-white text-green-600 shadow-md' : 'text-gray-500'}`}
              >
                Register
              </button>
            </div>

            <div className="space-y-5">
              {!showLogin && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              
              <button 
                onClick={showLogin ? handleLogin : handleRegister}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {showLogin ? 'Login to AgroShop' : 'Create Account'}
              </button>
            </div>
            
            <div className="mt-8 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-100">
              <p className="text-sm font-bold text-gray-700 text-center mb-2">Demo Account</p>
              <p className="text-xs text-gray-600 text-center">
                <span className="font-semibold">Admin:</span> admin@agroshop.com / admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white py-2 px-4 text-center text-sm font-medium">
        🎉 Special Offer: Get 20% off on all seeds | Free delivery on orders above ₹2000
      </div>

      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="text-4xl">🌾</div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">AgroShop</h1>
                <p className="text-xs text-gray-500">Premium Quality</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for seeds, fertilizers, equipment..."
                  className="w-full px-12 py-3.5 border-2 border-gray-200 rounded-full focus:outline-none focus:border-green-500 transition shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <User size={18} className="text-green-600" />
                  {user?.username}
                </div>
                {user?.role === 'admin' && (
                  <span className="inline-block bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    ADMIN
                  </span>
                )}
              </div>

              {user?.role === 'customer' && (
                <button
                  onClick={() => setShowCartSidebar(!showCartSidebar)}
                  className="relative flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-full hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold"
                >
                  <ShoppingCart size={20} />
                  <span className="hidden md:inline">Cart</span>
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              )}

              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-full transition font-semibold"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              {user?.role === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveView('products')}
                    className={`px-6 py-2.5 rounded-full whitespace-nowrap font-semibold transition-all duration-300 ${
                      activeView === 'products' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                    }`}
                  >
                    All Products
                  </button>
                  <button
                    onClick={() => setActiveView('manage')}
                    className={`px-6 py-2.5 rounded-full whitespace-nowrap flex items-center gap-2 font-semibold transition-all duration-300 ${
                      activeView === 'manage' 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                    }`}
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
                  className={`px-6 py-2.5 rounded-full whitespace-nowrap font-semibold transition-all duration-300 ${
                    selectedCategory === cat 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                      : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeView === 'products' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedCategory === 'All' ? 'All Products' : selectedCategory}
              </h2>
              <p className="text-gray-600 flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {filteredProducts.length} products available
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group transform hover:-translate-y-1">
                  <div className="relative overflow-hidden h-56 bg-gradient-to-br from-gray-100 to-gray-200">
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                    {product.stock < 10 && product.stock > 0 && (
                      <span className="absolute top-3 right-3 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                        Only {product.stock} left!
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-3 right-3 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-lg">
                        Out of Stock
                      </span>
                    )}
                    <div className="absolute top-3 left-3 bg-white bg-opacity-90 backdrop-blur-sm text-green-700 text-xs px-3 py-1.5 rounded-full font-bold">
                      {product.category}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 mb-2 text-lg line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 h-10">{product.description}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          ₹{product.price}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-gray-700">4.5</span>
                      </div>
                    </div>

                    {user?.role === 'customer' && (
                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock === 0}
                        className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                          product.stock === 0 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                        }`}
                      >
                        {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    )}

                    {user?.role === 'admin' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => editProduct(product)}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                  <Package size={64} className="text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-400 mb-2">No products found</p>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'manage' && user?.role === 'admin' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Package className="text-green-600" size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    {productForm.id ? 'Edit Product' : 'Add New Product'}
                  </h2>
                  <p className="text-gray-500">Fill in the product details below</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Organic Wheat Seeds"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                  <select
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition appearance-none bg-white"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="">Select a category</option>
                    {categories.filter(c => c !== 'All').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description *</label>
                  <textarea
                    placeholder="Describe your product..."
                    rows="4"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition resize-none"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="299.99"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Stock Quantity *</label>
                    <input
                      type="number"
                      placeholder="100"
                      className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Image URL *</label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={handleProductSubmit}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {productForm.id ? 'Update Product' : 'Add Product'}
                  </button>
                  <button
                    onClick={() => {
                      setProductForm({ id: null, name: '', category: '', description: '', price: '', stock: '', image_url: '' });
                      setActiveView('products');
                    }}
                    className="px-8 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-300 transition-all duration-300"
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
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setShowCartSidebar(false)}
          ></div>
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out">
            <div className="flex flex-col h-full">
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-bold">Shopping Cart</h3>
                    <p className="text-green-100 text-sm mt-1">{cartItemsCount} items in cart</p>
                  </div>
                  <button 
                    onClick={() => setShowCartSidebar(false)}
                    className="bg-white bg-opacity-20 p-2 rounded-full hover:bg-opacity-30 transition"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                      <ShoppingCart size={64} className="text-gray-400" />
                    </div>
                    <p className="text-xl font-bold text-gray-400 mb-2">Your cart is empty</p>
                    <p className="text-gray-500 mb-6">Add some products to get started!</p>
                    <button
                      onClick={() => setShowCartSidebar(false)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-full font-semibold hover:from-green-700 hover:to-emerald-700 transition"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition-all duration-300">
                        <div className="flex gap-4">
                          <div className="relative">
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-24 h-24 object-cover rounded-xl" 
                            />
                            <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                              {item.quantity}
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1 line-clamp-2">{item.name}</h4>
                            <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold text-green-600">₹{item.price}</span>
                              <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                                <button
                                  onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                  className="bg-white p-1.5 rounded-full hover:bg-gray-200 transition shadow-sm"
                                >
                                  <Minus size={14} className="text-gray-700" />
                                </button>
                                <span className="font-bold text-gray-900 px-3">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                  className="bg-white p-1.5 rounded-full hover:bg-gray-200 transition shadow-sm"
                                >
                                  <Plus size={14} className="text-gray-700" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t">
                              <span className="text-sm text-gray-600">Subtotal:</span>
                              <span className="text-lg font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="mt-2 text-red-600 text-sm font-semibold hover:text-red-700 transition flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {cart.length > 0 && (
                <div className="border-t bg-white p-6 shadow-2xl">
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({cartItemsCount} items)</span>
                      <span className="font-semibold">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Charges</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">Total Amount</span>
                      <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        ₹{cartTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl text-lg transform hover:-translate-y-0.5"
                  >
                    Place Order • ₹{cartTotal.toFixed(2)}
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    🔒 Secure checkout • 100% Safe payment
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🌾</span>
                <span className="text-2xl font-bold">AgroShop</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your trusted partner for premium agricultural products and farming solutions.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white cursor-pointer transition">About Us</li>
                <li className="hover:text-white cursor-pointer transition">Products</li>
                <li className="hover:text-white cursor-pointer transition">Contact</li>
                <li className="hover:text-white cursor-pointer transition">Blog</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Categories</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="hover:text-white cursor-pointer transition">Seeds</li>
                <li className="hover:text-white cursor-pointer transition">Fertilizers</li>
                <li className="hover:text-white cursor-pointer transition">Equipment</li>
                <li className="hover:text-white cursor-pointer transition">Tools</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4">Contact Us</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>📧 support@agroshop.com</li>
                <li>📞 +91 98765 43210</li>
                <li>📍 Mumbai, Maharashtra</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>© 2025 AgroShop. All rights reserved. | Made with 💚 for farmers</p>
          </div>
        </div>
      </footer>
    </div>
  );
}