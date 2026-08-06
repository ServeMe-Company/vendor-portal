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
  Loader2,
  FolderPlus,
  Tag,
  ChevronUp,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { MenuItem, CategoryItem } from '../types';

interface CatalogProps {
  products: MenuItem[];
  setProducts: React.Dispatch<React.SetStateAction<MenuItem[]>>;
}

// Helper function to auto-crop/resize uploaded image into a clean 1:1 square canvas
const cropImageToSquare = (dataUrl: string, targetSize = 500): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Calculate center crop square dimensions
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export default function Catalog({ products, setProducts }: CatalogProps) {
  // Local UI State
  const [selectedStatusTab, setSelectedStatusTab] = useState<'All' | 'Active' | 'In-Active'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'applied'>('idle');
  
  // Dynamic Category Management State (with Display Order)
  const [categoryList, setCategoryList] = useState<CategoryItem[]>([
    { name: 'Pizza', displayOrder: 1 },
    { name: 'Ramen', displayOrder: 2 },
    { name: 'Curry', displayOrder: 3 },
    { name: 'Appetizers', displayOrder: 4 },
    { name: 'Beverages', displayOrder: 5 },
    { name: 'Food', displayOrder: 6 },
    { name: 'Drinks', displayOrder: 7 },
    { name: 'Desserts', displayOrder: 8 }
  ]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState<number | ''>(9);
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatOrder, setEditingCatOrder] = useState<number | ''>(1);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Sorted Categories for dropdowns & display
  const sortedCategories = [...categoryList].sort((a, b) => a.displayOrder - b.displayOrder);

  // Category Actions
  const handleAddCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categoryList.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Category '${trimmed}' already exists.`);
      return;
    }
    const orderVal = newCatOrder === '' ? categoryList.length + 1 : Number(newCatOrder);
    setCategoryList(prev => [...prev, { name: trimmed, displayOrder: orderVal }].sort((a, b) => a.displayOrder - b.displayOrder));
    setNewCatName('');
    setNewCatOrder(categoryList.length + 2);
  };

  const handleStartEditCategory = (index: number, cat: CategoryItem) => {
    setEditingCatIndex(index);
    setEditingCatName(cat.name);
    setEditingCatOrder(cat.displayOrder);
  };

  const handleSaveEditCategory = (index: number) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) return;
    const oldName = categoryList[index].name;
    const newOrder = editingCatOrder === '' ? index + 1 : Number(editingCatOrder);

    setCategoryList(prev => prev.map((c, i) => i === index ? { name: trimmed, displayOrder: newOrder } : c).sort((a, b) => a.displayOrder - b.displayOrder));
    
    if (oldName !== trimmed) {
      setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: trimmed } : p));
      if (formCategory === oldName) setFormCategory(trimmed);
    }
    
    setEditingCatIndex(null);
    setEditingCatName('');
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryList.length) return;
    
    const newList = [...categoryList];
    const tempOrder = newList[index].displayOrder;
    newList[index].displayOrder = newList[targetIndex].displayOrder;
    newList[targetIndex].displayOrder = tempOrder;
    
    newList.sort((a, b) => a.displayOrder - b.displayOrder);
    setCategoryList(newList);
  };

  const handleDeleteCategory = (catName: string) => {
    if (categoryList.length <= 1) {
      alert('You must maintain at least one category.');
      return;
    }
    const count = products.filter(p => p.category === catName).length;
    if (count > 0) {
      alert(`Cannot delete category '${catName}' because it currently contains ${count} product(s). Please reassign or delete the products first.`);
      return;
    }
    if (confirm(`Are you sure you want to delete category '${catName}'?`)) {
      setCategoryList(prev => prev.filter(c => c.name !== catName));
      if (formCategory === catName) {
        const nextCat = categoryList.find(c => c.name !== catName)?.name || 'Pizza';
        setFormCategory(nextCat);
      }
    }
  };

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Pizza');
  const [formFoodType, setFormFoodType] = useState<'Veg' | 'Non-Veg'>('Veg');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formStatus, setFormStatus] = useState<'Available' | 'Out of Stock'>('Available');
  const [formPreparationTime, setFormPreparationTime] = useState('15-20 min');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number | ''>(1);
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formPopular, setFormPopular] = useState(false);
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
    setFormCategory(item.category || 'Pizza');
    setFormFoodType(item.foodType || 'Veg');
    setFormPrice(item.price);
    setFormStock(item.stock);
    setFormStatus(item.status || 'Available');
    setFormPreparationTime(item.preparationTime || '15-20 min');
    setFormDisplayOrder(item.displayOrder || 1);
    setFormDescription(item.description || '');
    setFormImage(item.image || '');
    setFormPopular(Boolean(item.popular));
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

  // Required Fields Validator
  const validateProductForm = (): boolean => {
    if (
      !formName || !formName.trim() ||
      !formFoodType ||
      !formCategory || !formCategory.trim() ||
      formPrice === '' || Number(formPrice) < 0 || isNaN(Number(formPrice)) ||
      formStock === '' || Number(formStock) < 0 || isNaN(Number(formStock)) ||
      !formStatus
    ) {
      setFormError('Please complete all required fields.');
      alert('Please complete all required fields.');
      return false;
    }
    setFormError(null);
    return true;
  };

  // Add Product Submit
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProductForm()) return;

    // Default image if empty
    const imgUrl = formImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const nowIso = new Date().toISOString();
    const newItem: MenuItem = {
      id: `prod-${Date.now()}`,
      name: formName.trim(),
      category: formCategory.trim(),
      foodType: formFoodType,
      isVeg: formFoodType === 'Veg',
      price: Number(formPrice),
      stock: formStock === '' ? 0 : Number(formStock),
      status: formStatus,
      preparationTime: formPreparationTime,
      displayOrder: formDisplayOrder === '' ? 1 : Number(formDisplayOrder),
      description: formDescription,
      image: imgUrl,
      popular: formPopular,
      featured: formPopular,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setProducts(prev => [newItem, ...prev]);
    resetForm();
    setIsAddModalOpen(false);
  };

  // Edit Product Submit
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !validateProductForm()) return;

    const nowIso = new Date().toISOString();
    setProducts(prev => prev.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...item,
          name: formName.trim(),
          category: formCategory.trim(),
          foodType: formFoodType,
          isVeg: formFoodType === 'Veg',
          price: Number(formPrice),
          stock: formStock === '' ? 0 : Number(formStock),
          status: formStatus,
          preparationTime: formPreparationTime,
          displayOrder: formDisplayOrder === '' ? 1 : Number(formDisplayOrder),
          description: formDescription,
          image: formImage || item.image,
          popular: formPopular,
          featured: formPopular,
          createdAt: item.createdAt || nowIso,
          updatedAt: nowIso
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
    setFormCategory('Pizza');
    setFormFoodType('Veg');
    setFormPrice('');
    setFormStock('');
    setFormStatus('Available');
    setFormPreparationTime('15-20 min');
    setFormDisplayOrder(1);
    setFormDescription('');
    setFormImage('');
    setFormPopular(false);
    setFileName('No file chosen');
    setFormError(null);
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
            onClick={() => setIsCategoryModalOpen(true)}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            Manage Categories
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
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-row"
          >
            {/* Left timeline step column */}
            <div className="w-16 bg-slate-50/50 border-r border-slate-100 flex flex-col items-center pt-8 relative shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-600 border-[5px] border-blue-100 flex items-center justify-center z-10 shadow-sm" />
              <div className="absolute top-14 bottom-0 w-[2px] bg-slate-100" />
            </div>

            {/* Right main form area */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
              <div className="space-y-5">
                
                {/* Header */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">1 General</span>
                    <h3 className="text-lg font-bold text-slate-800">Add New Product</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormError(null)}
                      className="text-red-400 hover:text-red-700 p-0.5 rounded cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Product Name * & Food Type * */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Product Name"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Food Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setFormFoodType('Veg')}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          formFoodType === 'Veg'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormFoodType('Non-Veg')}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          formFoodType === 'Non-Veg'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-300 inline-block" />
                        Non-Veg
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category * & Selling Price (₹) * */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Manage
                      </button>
                    </div>
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer"
                    >
                      {sortedCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Selling Price"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="0"
                      required
                    />
                  </div>
                </div>

                {/* Available Quantity * & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Available Quantity <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Available Quantity"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'Available' | 'Out of Stock')}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="Out of Stock">Unavailable</option>
                    </select>
                  </div>
                </div>

                {/* Preparation Time, Display Order & Product Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Preparation Time
                    </label>
                    <input 
                      type="text" 
                      value={formPreparationTime}
                      onChange={(e) => setFormPreparationTime(e.target.value)}
                      placeholder="e.g. 15-20 min"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Display Order
                    </label>
                    <input 
                      type="number" 
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="1"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Product Description
                    </label>
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Product Description (Optional)"
                      rows={1}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Featured Product Checkbox */}
                <div className="flex items-center gap-2 bg-amber-50/60 border border-amber-200/70 rounded-lg px-3 py-2">
                  <input 
                    type="checkbox" 
                    id="add-popular"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <label htmlFor="add-popular" className="text-xs font-bold text-amber-900 cursor-pointer flex items-center gap-1.5 select-none">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    Feature on QR Menu (Showcase on dashboard & digital menu)
                  </label>
                </div>

                {/* Product Image Row */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Product Image
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 border border-blue-100 shrink-0">
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
                            reader.onloadend = async () => {
                              const rawData = reader.result as string;
                              const croppedData = await cropImageToSquare(rawData, 500);
                              setFormImage(croppedData);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {formImage ? (
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl p-1.5 px-3 shadow-2xs">
                        <img 
                          src={formImage} 
                          alt="Preview" 
                          onClick={() => setPreviewModalImage(formImage)}
                          className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs cursor-pointer hover:opacity-85 transition-opacity"
                          title="Click to view full preview"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80';
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 max-w-[130px] truncate">{fileName}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewModalImage(formImage)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer border-l border-slate-200 pl-2 flex items-center gap-1 shrink-0"
                            title="Click to preview enlarged image"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            Preview
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormImage('');
                            setFileName('No file chosen');
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer ml-1 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">{fileName}</span>
                    )}
                  </div>
                  <div className="mt-2">
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
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
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
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-row"
          >
            {/* Left timeline step column */}
            <div className="w-16 bg-slate-50/50 border-r border-slate-100 flex flex-col items-center pt-8 relative shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-600 border-[5px] border-blue-100 flex items-center justify-center z-10 shadow-sm" />
              <div className="absolute top-14 bottom-0 w-[2px] bg-slate-100" />
            </div>

            {/* Right main form area */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
              <div className="space-y-5">
                
                {/* Header */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-blue-600 tracking-wider uppercase">1 General (Edit Mode)</span>
                    <h3 className="text-lg font-bold text-slate-800">Edit Product</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => { setIsEditModalOpen(false); setEditingItem(null); }}
                    className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                </div>

                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormError(null)}
                      className="text-red-400 hover:text-red-700 p-0.5 rounded cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Product Name * & Food Type * */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Product Name"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Food Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setFormFoodType('Veg')}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          formFoodType === 'Veg'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block" />
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormFoodType('Non-Veg')}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          formFoodType === 'Non-Veg'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-300 inline-block" />
                        Non-Veg
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category * & Selling Price (₹) * */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Manage
                      </button>
                    </div>
                    <select 
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer"
                    >
                      {sortedCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Selling Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Selling Price"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="0"
                      required
                    />
                  </div>
                </div>

                {/* Available Quantity * & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Available Quantity <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Available Quantity"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as 'Available' | 'Out of Stock')}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="Out of Stock">Unavailable</option>
                    </select>
                  </div>
                </div>

                {/* Preparation Time, Display Order & Product Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Preparation Time
                    </label>
                    <input 
                      type="text" 
                      value={formPreparationTime}
                      onChange={(e) => setFormPreparationTime(e.target.value)}
                      placeholder="e.g. 15-20 min"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Display Order
                    </label>
                    <input 
                      type="number" 
                      value={formDisplayOrder}
                      onChange={(e) => setFormDisplayOrder(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="1"
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Product Description
                    </label>
                    <textarea 
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Product Description (Optional)"
                      rows={1}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 resize-none"
                    />
                  </div>
                </div>

                {/* Featured Product Checkbox */}
                <div className="flex items-center gap-2 bg-amber-50/60 border border-amber-200/70 rounded-lg px-3 py-2">
                  <input 
                    type="checkbox" 
                    id="edit-popular"
                    checked={formPopular}
                    onChange={(e) => setFormPopular(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <label htmlFor="edit-popular" className="text-xs font-bold text-amber-900 cursor-pointer flex items-center gap-1.5 select-none">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    Feature on QR Menu (Showcase on dashboard & digital menu)
                  </label>
                </div>

                {/* Product Image Row */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Product Image
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5 border border-blue-100 shrink-0">
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
                            reader.onloadend = async () => {
                              const rawData = reader.result as string;
                              const croppedData = await cropImageToSquare(rawData, 500);
                              setFormImage(croppedData);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {formImage ? (
                      <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/90 rounded-xl p-1.5 px-3 shadow-2xs">
                        <img 
                          src={formImage} 
                          alt="Preview" 
                          onClick={() => setPreviewModalImage(formImage)}
                          className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0 shadow-2xs cursor-pointer hover:opacity-85 transition-opacity"
                          title="Click to view full preview"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=120&q=80';
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-700 max-w-[130px] truncate">{fileName}</span>
                          <button
                            type="button"
                            onClick={() => setPreviewModalImage(formImage)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer border-l border-slate-200 pl-2 flex items-center gap-1 shrink-0"
                            title="Click to preview enlarged image"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            Preview
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormImage('');
                            setFileName('No file chosen');
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer ml-1 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">{fileName}</span>
                    )}
                  </div>
                  <div className="mt-2">
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
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
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
      {/* Manage Categories Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fade-in select-none">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-200 shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Manage Categories</h3>
                  <p className="text-xs text-slate-500">Add new categories, edit names, or remove unused ones.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setIsCategoryModalOpen(false); setEditingCatIndex(null); }}
                className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            {/* Add New Category Form */}
            <div className="p-6 border-b border-slate-100 bg-white">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input 
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name (e.g., Rolls, Snacks)"
                  className="flex-1 px-3.5 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
                />
                <input 
                  type="number"
                  value={newCatOrder}
                  onChange={(e) => setNewCatOrder(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Order #"
                  title="Display Order"
                  min="1"
                  className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-center font-bold text-slate-800"
                />
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Category
                </button>
              </form>
            </div>

            {/* Existing Categories List */}
            <div className="p-6 max-h-[350px] overflow-y-auto space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Existing Categories ({categoryList.length}) — Ordered for QR Menu
              </span>

              {sortedCategories.map((cat, idx) => {
                const productCount = products.filter(p => p.category === cat.name).length;
                const isEditingThis = editingCatIndex === idx;

                return (
                  <div 
                    key={cat.name + idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-white transition-all shadow-2xs"
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
                          #{cat.displayOrder}
                        </span>
                        <input 
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                        />
                        <input 
                          type="number"
                          value={editingCatOrder}
                          onChange={(e) => setEditingCatOrder(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-16 px-2 py-1.5 border border-blue-400 rounded-lg text-sm bg-white font-bold text-slate-900 focus:outline-none text-center"
                          min="1"
                        />
                        <button 
                          type="button"
                          onClick={() => handleSaveEditCategory(idx)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Save Changes"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setEditingCatIndex(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs">
                            #{cat.displayOrder}
                          </span>
                          <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                          <span className="text-xs text-slate-400 font-medium">({productCount} items)</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCategory(idx, 'down')}
                            disabled={idx === sortedCategories.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(idx, cat)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer ml-1"
                            title="Edit Category"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                type="button"
                onClick={() => { setIsCategoryModalOpen(false); setEditingCatIndex(null); }}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Enlarged Image Preview Lightbox Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalImage(null)}
        >
          <div 
            className="bg-white rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-3 relative border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Product Image Preview
              </h3>
              <button 
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 aspect-square shadow-inner">
              <img 
                src={previewModalImage} 
                alt="Enlarged Product Preview" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
                }}
              />
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-400 font-medium">Auto-cropped to 1:1 Square</span>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
