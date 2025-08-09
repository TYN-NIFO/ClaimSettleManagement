'use client';

import { useEffect, useState } from 'react';
import { useGetProfileQuery, useUpdateProfileMutation, useUploadAvatarMutation } from '@/lib/api';
import Image from 'next/image';

export default function SettingsPage() {
  const { data, isLoading } = useGetProfileQuery(undefined);
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: isUploading }] = useUploadAvatarMutation();

  const user = data?.user;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (user) {
      // Split existing name into first/last as a starting point
      const parts = (user.firstName && user.lastName)
        ? [user.firstName, user.lastName]
        : (user.name || '').trim().split(' ');
      setFirstName(user.firstName || parts[0] || '');
      setLastName(user.lastName || (parts.length > 1 ? parts.slice(1).join(' ') : ''));
      setCompanyName(user.companyName || '');
      setCompanyUrl(user.companyUrl || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleAvatarChange = async (file: File) => {
    try {
      const resp = await uploadAvatar(file).unwrap();
      if (resp?.avatarUrl) {
        setAvatarUrl(resp.avatarUrl);
        // persist avatar url on profile as well
        await updateProfile({ avatarUrl: resp.avatarUrl }).unwrap();
      }
    } catch (e) {
      console.error('Avatar upload failed', e);
      alert('Avatar upload failed. Please sign in again if the problem persists.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ firstName, lastName, companyName, companyUrl }).unwrap();
      alert('Profile updated');
    } catch (e) {
      console.error('Update failed', e);
      alert('Update failed. Please sign in again if the problem persists.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-1 text-sm text-gray-600">Complete your profile details</p>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Basic (from registration) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                  value={user?.email || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-md bg-gray-50"
                  value={user?.name || ''}
                  disabled
                />
              </div>
            </div>

            {/* Onboarding fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-md"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-md"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company name</label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-md"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company URL</label>
                <input
                  className="w-full p-3 border border-gray-300 rounded-md"
                  placeholder="https://example.com"
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 border">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                  )}
                </div>
                <label className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await handleAvatarChange(f);
                    }}
                  />
                  {isUploading ? 'Uploading...' : 'Upload Avatar'}
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || isUpdating}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


