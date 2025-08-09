'use client';

import { useState } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoryMaster, Category, SubCategory } from '@/lib/categoryMaster';

interface CategoryManagerProps {
  categories?: Category[];
  onSave?: (categories: Category[]) => void;
}

export default function CategoryManager({ categories = categoryMaster, onSave }: CategoryManagerProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', subCategories: [{ name: '', itc: '' }] });

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    const category: Category = {
      name: newCategory.name.trim(),
      subCategories: newCategory.subCategories.filter(sub => sub.name.trim())
    };

    setLocalCategories(prev => [...prev, category]);
    setNewCategory({ name: '', subCategories: [{ name: '', itc: '' }] });
    toast.success('Category added successfully');
  };

  const handleEditCategory = (name: string) => {
    setEditingId(name);
  };

  const handleSaveCategory = (oldName: string, updatedCategory: Partial<Category>) => {
    setLocalCategories(prev => 
      prev.map(cat => 
        cat.name === oldName 
          ? { ...cat, ...updatedCategory }
          : cat
      )
    );
    setEditingId(null);
    toast.success('Category updated successfully');
  };

  const handleDeleteCategory = (name: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setLocalCategories(prev => prev.filter(cat => cat.name !== name));
      toast.success('Category deleted successfully');
    }
  };

  const handleAddSubCategory = (categoryName: string) => {
    setLocalCategories(prev => 
      prev.map(cat => 
        cat.name === categoryName 
          ? { ...cat, subCategories: [...cat.subCategories, { name: '', itc: '' }] }
          : cat
      )
    );
  };

  const handleUpdateSubCategory = (categoryName: string, index: number, field: 'name' | 'itc', value: string) => {
    setLocalCategories(prev => 
      prev.map(cat => 
        cat.name === categoryName 
          ? {
              ...cat,
              subCategories: cat.subCategories.map((sub, i) => 
                i === index ? { ...sub, [field]: value } : sub
              )
            }
          : cat
      )
    );
  };

  const handleRemoveSubCategory = (categoryName: string, index: number) => {
    setLocalCategories(prev => 
      prev.map(cat => 
        cat.name === categoryName 
          ? {
              ...cat,
              subCategories: cat.subCategories.filter((_, i) => i !== index)
            }
          : cat
      )
    );
  };

  const handleSaveAll = () => {
    if (onSave) {
      onSave(localCategories);
    }
    toast.success('All changes saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Add New Category */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name
            </label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter category name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sub Categories
            </label>
            <div className="space-y-2">
              {newCategory.subCategories.map((sub, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => {
                      const updated = [...newCategory.subCategories];
                      updated[index] = { ...updated[index], name: e.target.value };
                      setNewCategory(prev => ({ ...prev, subCategories: updated }));
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter sub-category name"
                  />
                  <input
                    type="text"
                    value={sub.itc}
                    onChange={(e) => {
                      const updated = [...newCategory.subCategories];
                      updated[index] = { ...updated[index], itc: e.target.value };
                      setNewCategory(prev => ({ ...prev, subCategories: updated }));
                    }}
                    className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="ITC notes (optional)"
                  />
                  {newCategory.subCategories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = newCategory.subCategories.filter((_, i) => i !== index);
                        setNewCategory(prev => ({ ...prev, subCategories: updated }));
                      }}
                      className="px-3 py-3 text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewCategory(prev => ({ 
                  ...prev, 
                  subCategories: [...prev.subCategories, { name: '', itc: '' }] 
                }))}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Sub Category
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleAddCategory}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Existing Categories */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Existing Categories</h3>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save All Changes
          </button>
        </div>
        
        <div className="space-y-4">
          {localCategories.map((category) => (
            <div key={category.name} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                {editingId === category.name ? (
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => handleSaveCategory(category.name, { name: e.target.value })}
                    className="text-lg font-medium text-gray-900 border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <h4 className="text-lg font-medium text-gray-900">{category.name}</h4>
                )}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditCategory(category.name)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(category.name)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub Categories
                </label>
                <div className="space-y-2">
                  {category.subCategories.map((sub, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={sub.name}
                        onChange={(e) => handleUpdateSubCategory(category.name, index, 'name', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Sub-category name"
                      />
                      <input
                        type="text"
                        value={sub.itc || ''}
                        onChange={(e) => handleUpdateSubCategory(category.name, index, 'itc', e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ITC notes (optional)"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubCategory(category.name, index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddSubCategory(category.name)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Sub Category
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
