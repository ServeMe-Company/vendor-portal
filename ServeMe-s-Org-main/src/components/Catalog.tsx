import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  X,
  PlusCircle,
  TrendingUp,
  Image as ImageIcon,
  Check,
  Loader2
} from 'lucide-react';
import { MenuItem } from '../types';

interface CatalogProps {
  products: MenuItem[];
  setProducts: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

export default function Catalog({ products, setProducts }: CatalogProps) {
  // Local UI State
  const [selectedStatusTab, setSelectedStatusTab] = useState<'All' | 'Active' | 'In-Active'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'applied'>('idle');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Pizza');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formPopular, setFormPopular] = useState(false);
  const [formStatus, setFormStatus] = useState<'Available' | 'Out of Stock'>('Available');
  const [fileName, setFileName] = useState('No file chosen');

  // Categories list derived from products + seed standards
  const categories = ['All', 'Pizza', 'Appetizers', 'Beverages'];

  // Filter products based on selected tab and search query
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesStatus = true;
    if (selectedStatusTab === 'Active') {
      matchesStatus = product.status === 'Available';
    } else if (selectedStatusTab === 'In-Active') {
      matchesStatus = product.status === 'Out of Stock';
    }

    return matchesSearch && matchesStatus;
  });

  // Toggle item availability
  const toggleAvailability = (itemId: string) => {
    setProducts(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextStatus = item.status === 'Available' ? 'Out of Stock' : 'Available';
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  // Toggle popular/featured status
  const togglePopular = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setProducts(prev => prev.map(item => 
      item.id === itemId ? { ...item, popular: !item.popular } : item
    ));
  };

  // Open Edit Modal and fill form
  const openEditModal = (item: MenuItem, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice(item.price);
    setFormStock(item.stock);
    setFormDescription(item.description || '');
    setFormImage(item.image);
    setFormPopular(item.popular);
    setFormStatus(item.status);
    setFileName(item.image ? 'Image already configured' : 'No file chosen');
    setIsEditModalOpen(true);
  };

  // Delete product
  const handleDeleteProduct = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this product from your menu catalog?')) {
      setProducts(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // Add Product Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || Number(formPrice) <= 0) return;

    // Default image if empty
    const imgUrl = formImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const newItem: MenuItem = {
      id: `prod-${Date.now()}`,
      name: formName,
      category: formCategory,
      price: Number(formPrice),
      stock: formStock === '' ? 0 : Number(formStock),
      description: formDescription,
      image: imgUrl,
      status: formStatus,
      popular: formPopular
    };

    setProducts(prev => [newItem, ...prev]);
    resetForm();
    setIsAddModalOpen(false);
  };

  // Edit Product Submit
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formName || Number(formPrice) <= 0) return;

    setProducts(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: formName,
          category: formCategory,
          price: Number(formPrice),
          stock: formStock === '' ? 0 : Number(formStock),
          description: formDescription,
          image: formImage || item.image,
          status: formStatus,
          popular: formPopular
        };
      }
      return item;
    }));

    resetForm();
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleApply = () => {
    setApplyStatus('applying');
    setTimeout(() => {
      setApplyStatus('applied');
      setTimeout(() => {
        setApplyStatus('idle');
      }, 3500);
    }, 800);
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('Ramen');
    setFormPrice('');
    setFormStock('');
    setFormDescription('');
    setFormImage('');
    setFormPopular(false);
    setFormStatus('Available');
    setFileName('No file chosen');
  };

  return (
    <div className="pt-20 pb-24 md:pb-8 max-w-7xl mx-auto px-4 md:px-8 select-none relative">
      
      {/* Toast Notification for successfully applied active items */}
      {applyStatus === 'applied' && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-fade-in font-semibold max-w-md w-full sm:w-auto">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 animate-bounce" />
          <span className="text-sm">
            Menu successfully applied! {products.filter(p => p.status === 'Available').length} active items are live.
          </span>
        </div>
      )}

      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight font-headline-md">Product Catalog</h2>
          <p className="text-sm text-slate-500 font-medium">
            Manage your restaurant's menu items and their availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleApply}
            disabled={applyStatus === 'applying'}
            className={`px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer shadow-2xs rounded-lg flex items-center gap-2 border min-w-[90px] justify-center ${
              applyStatus === 'applying'
                ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                : applyStatus === 'applied'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50 bg-white'
            }`}
          >
            {applyStatus === 'applying' && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            )}
            {applyStatus === 'applied' && (
              <Check className="w-4 h-4 text-emerald-600" />
            )}
            {applyStatus === 'idle' && 'Apply'}
            {applyStatus === 'applying' && 'Applying...'}
            {applyStatus === 'applied' && 'Applied ✓'}
          </button>
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Status Filtering Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-xl mb-6 shadow-2xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-100">
          <button
            onClick={() => setSelectedStatusTab('All')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              selectedStatusTab === 'All'
                ? 'bg-white text-slate-800 border border-slate-200/80 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatusTab('Active')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              selectedStatusTab === 'Active'
                ? 'bg-white text-slate-800 border border-slate-200/80 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setSelectedStatusTab('In-Active')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              selectedStatusTab === 'In-Active'
                ? 'bg-white text-slate-800 border border-slate-200/80 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            In-Active
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700"
          />
        </div>
      </div>

      {/* Tabular View of Products */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-left py-4 px-6 uppercase">IMAGE</th>
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-left py-4 px-6 uppercase">PRODUCT ID</th>
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-left py-4 px-6 uppercase">NAME</th>
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-left py-4 px-6 uppercase">PRICE</th>
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-left py-4 px-6 uppercase">UPDATE DATE</th>
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-left py-4 px-6 uppercase">STATUS</th>
                <th className="text-[11px] font-bold text-slate-400 tracking-wider text-center py-4 px-6 uppercase">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                  {/* IMAGE column */}
                  <td className="py-4 px-6">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-12 h-12 object-cover rounded-lg border border-slate-100 shadow-2xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-50 border border-slate-200/60 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-semibold text-center select-none shadow-2xs">
                        No image
                      </div>
                    )}
                  </td>

                  {/* PRODUCT ID column */}
                  <td className="py-4 px-6 font-bold text-slate-800 text-sm">
                    #{idx + 1}
                  </td>

                  {/* NAME column */}
                  <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                    {item.name}
                  </td>

                  {/* PRICE column */}
                  <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                    ₹{item.price.toFixed(2)}
                  </td>

                  {/* UPDATE DATE column */}
                  <td className="py-4 px-6 text-slate-500 font-medium text-sm">
                    2026-07-15
                  </td>

                  {/* STATUS column */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAvailability(item.id)}
                        className={`w-11 h-6 rounded-full relative transition-colors duration-200 flex items-center cursor-pointer ${
                          item.status === 'Available' ? 'bg-[#f97316]' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 bg-white rounded-full absolute transition-transform duration-200 shadow-xs ${
                            item.status === 'Available' ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">
                        {item.status === 'Available' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                  {/* ACTIONS column */}
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={(e) => openEditModal(item, e)}
                        className="text-[#f97316] hover:text-[#ea580c] transition-colors p-1 rounded-lg hover:bg-orange-50 cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteProduct(item.id, e)}
                        className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-400 mt-1">Try matching another keyword or adjust the status filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <form 
            onSubmit={handleAddProductSubmit}
            className="bg-white rounded-xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-row"
          >
            {/* Left timeline step column */}
            <div className="w-16 bg-slate-50/50 border-r border-slate-100 flex flex-col items-center pt-8 relative shrink-0">
              {/* Step circle */}
              <div className="w-6 h-6 rounded-full bg-blue-600 border-[5px] border-blue-100 flex items-center justify-center z-10 shadow-sm" />
              {/* Step vertical line extending down */}
              <div className="absolute top-14 bottom-0 w-[2px] bg-slate-100" />
            </div>

            {/* Right main form area */}
            <div className="flex-1 p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
              <div className="space-y-6">
                
                {/* Heading 1 General */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-600 tracking-wide">1 General</span>
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                {/* Field 1: Product Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Product Name"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                    required
                  />
                </div>

                {/* Field 2: Status */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Available' | 'Out of Stock')}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5%201.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto' }}
                  >
                    <option value="Available">Active</option>
                    <option value="Out of Stock">In-Active</option>
                  </select>
                </div>

                {/* Stacking Group: Price, Category, Stock Quantity, Description */}
                <div className="flex flex-col -space-y-[1px]">
                  {/* Price input */}
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Price"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-t-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="1"
                      required
                    />
                  </div>
                  {/* Category input */}
                  <div className="relative">
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer appearance-none"
                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5%201.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto' }}
                    >
                      <option value="Pizza">Pizza</option>
                      <option value="Ramen">Ramen</option>
                      <option value="Curry">Curry</option>
                      <option value="Appetizers">Appetizers</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>
                  {/* Stock quantity input */}
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Stock Quantity"
                      className="w-full px-4 py-2.5 border border-slate-200 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="0"
                    />
                  </div>
                  {/* Description input */}
                  <div className="relative">
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Product Description (Optional)"
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-b-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Popular checkbox */}
                <div className="flex items-center gap-2 px-1">
                  <input 
                    type="checkbox" 
                    id="add-popular"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <label htmlFor="add-popular" className="text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1 select-none">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Feature this product on the main dashboard
                  </label>
                </div>

                {/* Product Image Row */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Product Image
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm border border-blue-100">
                      Choose File
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setFileName(file.name);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-sm text-slate-500 max-w-[200px] truncate">{fileName}</span>
                  </div>
                  <div className="mt-2.5">
                    <input 
                      type="url"
                      value={formImage.startsWith('data:') ? '' : formImage}
                      onChange={(e) => {
                        setFormImage(e.target.value);
                        setFileName(e.target.value ? 'Image URL defined' : 'No file chosen');
                      }}
                      placeholder="Or paste an image URL"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer text-slate-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Save Product
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <form 
            onSubmit={handleEditProductSubmit}
            className="bg-white rounded-xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-row"
          >
            {/* Left timeline step column */}
            <div className="w-16 bg-slate-50/50 border-r border-slate-100 flex flex-col items-center pt-8 relative shrink-0">
              {/* Step circle */}
              <div className="w-6 h-6 rounded-full bg-blue-600 border-[5px] border-blue-100 flex items-center justify-center z-10 shadow-sm" />
              {/* Step vertical line extending down */}
              <div className="absolute top-14 bottom-0 w-[2px] bg-slate-100" />
            </div>

            {/* Right main form area */}
            <div className="flex-1 p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
              <div className="space-y-6">
                
                {/* Heading 1 General */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-600 tracking-wide">1 General (Edit Mode)</span>
                  <button 
                    type="button"
                    onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                {/* Field 1: Product Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Product Name"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                    required
                  />
                </div>

                {/* Field 2: Status */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'Available' | 'Out of Stock')}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5%201.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto' }}
                  >
                    <option value="Available">Active</option>
                    <option value="Out of Stock">In-Active</option>
                  </select>
                </div>

                {/* Stacking Group: Price, Category, Stock Quantity, Description */}
                <div className="flex flex-col -space-y-[1px]">
                  {/* Price input */}
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Price"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-t-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="1"
                      required
                    />
                  </div>
                  {/* Category input */}
                  <div className="relative">
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer appearance-none"
                      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5%201.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px top 50%', backgroundSize: '10px auto' }}
                    >
                      <option value="Pizza">Pizza</option>
                      <option value="Ramen">Ramen</option>
                      <option value="Curry">Curry</option>
                      <option value="Appetizers">Appetizers</option>
                      <option value="Beverages">Beverages</option>
                    </select>
                  </div>
                  {/* Stock quantity input */}
                  <div className="relative">
                    <input 
                      type="number" 
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Stock Quantity"
                      className="w-full px-4 py-2.5 border border-slate-200 text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="0"
                    />
                  </div>
                  {/* Description input */}
                  <div className="relative">
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Product Description (Optional)"
                      rows={2}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-b-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Popular checkbox */}
                <div className="flex items-center gap-2 px-1">
                  <input 
                    type="checkbox" 
                    id="edit-popular"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <label htmlFor="edit-popular" className="text-xs font-semibold text-slate-600 cursor-pointer flex items-center gap-1 select-none">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    Feature this product on the main dashboard
                  </label>
                </div>

                {/* Product Image Row */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Product Image
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm border border-blue-100">
                      Choose File
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setFileName(file.name);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setFormImage(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-sm text-slate-500 max-w-[200px] truncate">{fileName}</span>
                  </div>
                  <div className="mt-2.5">
                    <input 
                      type="url"
                      value={formImage.startsWith('data:') ? '' : formImage}
                      onChange={(e) => {
                        setFormImage(e.target.value);
                        setFileName(e.target.value ? 'Image URL defined' : 'No file chosen');
                      }}
                      placeholder="Or paste an image URL"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-700"
                    />
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                  className="px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 cursor-pointer text-slate-500 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Save Product
                </button>
              </div>

            </div>
          </form>
        </div>
      )}
    </div>
  );
}
