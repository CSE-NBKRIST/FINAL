import React, { useState } from 'react';
import { User, Mail, Hash, BookOpen, Key, Save, Award, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const Profile: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      if (currentUser) {
        await updatePassword(currentUser, passwordData.newPassword);
        
        // Update password changed status in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
          passwordChanged: true
        });

        setSuccess('Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordChange(false);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <button
          onClick={() => setShowPasswordChange(!showPasswordChange)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Key className="h-5 w-5" />
          <span>Change Password</span>
        </button>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-lg font-semibold text-gray-900">{userProfile.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-500">Email Address</label>
                <p className="text-lg font-semibold text-gray-900">{userProfile.email}</p>
              </div>
            </div>

            {userProfile.role === 'student' && (
              <>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Hash className="h-5 w-5 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Roll Number</label>
                    <p className="text-lg font-semibold text-gray-900">{userProfile.rollNo}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-gray-500" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Section</label>
                    <p className="text-lg font-semibold text-gray-900">{userProfile.section}</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <Award className="h-5 w-5 text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="text-lg font-semibold text-gray-900 capitalize">{userProfile.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Account Status</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-500">Password Status</label>
                  <p className={`text-lg font-semibold ${
                    userProfile.passwordChanged ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {userProfile.passwordChanged ? 'Changed' : 'Default Password'}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${
                  userProfile.passwordChanged ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {userProfile.passwordChanged ? (
                    <Key className="h-5 w-5 text-green-600" />
                  ) : (
                    <Key className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-500">Account Type</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {userProfile.role === 'faculty' ? 'Faculty Member' : 'Student'}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-100">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {userProfile.role === 'student' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Enrollment Status</label>
                    <p className="text-lg font-semibold text-green-600">Active</p>
                  </div>
                  <div className="p-2 rounded-full bg-green-100">
                    <Award className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Form */}
      {showPasswordChange && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowPasswordChange(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;