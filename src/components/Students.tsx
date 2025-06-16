import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Filter, UserPlus, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Student } from '../types';

const Students: React.FC = () => {
  const { userProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedSection, setSelectedSection] = useState('all');
  const [sections, setSections] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [studentStats, setStudentStats] = useState<{[key: string]: {submissions: number, vivaAttempts: number}}>({});
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    email: '',
    section: '',
    password: 'cse@nbkr'
  });

  useEffect(() => {
    fetchStudents();
  }, [userProfile]);

  useEffect(() => {
    filterStudents();
  }, [students, selectedSection]);

  useEffect(() => {
    if (students.length > 0) {
      fetchStudentStats();
    }
  }, [students]);

  const fetchStudents = async () => {
    if (!userProfile) return;

    try {
      const q = query(
        collection(db, 'students'),
        where('facultyId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];

      setStudents(studentsData);

      // Extract unique sections
      const uniqueSections = Array.from(
        new Set(studentsData.map(student => student.section).filter(Boolean))
      );
      setSections(uniqueSections);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchStudentStats = async () => {
    try {
      // Fetch all submissions
      const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
      const allSubmissions = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all viva attempts
      const vivaAttemptsSnapshot = await getDocs(collection(db, 'vivaAttempts'));
      const allVivaAttempts = vivaAttemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats for each student
      const stats: {[key: string]: {submissions: number, vivaAttempts: number}} = {};
      
      students.forEach(student => {
        const studentSubmissions = allSubmissions.filter((sub: any) => sub.studentId === student.id);
        const studentVivaAttempts = allVivaAttempts.filter((attempt: any) => attempt.studentId === student.id);
        
        stats[student.id] = {
          submissions: studentSubmissions.length,
          vivaAttempts: studentVivaAttempts.length
        };
      });

      setStudentStats(stats);
    } catch (error) {
      console.error('Error fetching student stats:', error);
    }
  };

  const filterStudents = () => {
    if (selectedSection === 'all') {
      setFilteredStudents(students);
    } else {
      setFilteredStudents(students.filter(student => student.section === selectedSection));
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create authentication account for student
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Add student to Firestore
      const studentData: Omit<Student, 'id'> = {
        name: formData.name,
        rollNo: formData.rollNo,
        email: formData.email,
        section: formData.section,
        facultyId: userProfile!.uid,
        passwordChanged: false,
        experimentsCompleted: [],
        vivaScores: {}
      };

      await addDoc(collection(db, 'students'), studentData);
      
      // Create user profile
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        role: 'student',
        rollNo: formData.rollNo,
        section: formData.section,
        facultyId: userProfile!.uid,
        passwordChanged: false
      });

      setFormData({ name: '', rollNo: '', email: '', section: '', password: 'cse@nbkr' });
      setShowAddModal(false);
      fetchStudents();
      alert('Student added successfully!');
    } catch (error: any) {
      console.error('Error adding student:', error);
      alert(`Error adding student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        name: formData.name,
        rollNo: formData.rollNo,
        email: formData.email,
        section: formData.section
      });

      setEditingStudent(null);
      setFormData({ name: '', rollNo: '', email: '', section: '', password: 'cse@nbkr' });
      fetchStudents();
      alert('Student updated successfully!');
    } catch (error: any) {
      console.error('Error updating student:', error);
      alert(`Error updating student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      await deleteDoc(doc(db, 'students', studentId));
      fetchStudents();
      alert('Student deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting student:', error);
      alert(`Error deleting student: ${error.message}`);
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      rollNo: student.rollNo,
      email: student.email,
      section: student.section,
      password: 'cse@nbkr'
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingStudent(null);
    setFormData({ name: '', rollNo: '', email: '', section: '', password: 'cse@nbkr' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Students Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Student</span>
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter by Section:</span>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>{section}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">
            Showing {filteredStudents.length} of {students.length} students
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => {
                const stats = studentStats[student.id] || { submissions: 0, vivaAttempts: 0 };
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">Roll No: {student.rollNo}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {student.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-gray-600">Submissions:</span>
                          <span className="font-semibold text-blue-600">{stats.submissions}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">Viva Attempts:</span>
                          <span className="font-semibold text-purple-600">{stats.vivaAttempts}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        student.passwordChanged 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {student.passwordChanged ? 'Active' : 'Password Not Changed'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="text-blue-600 hover:text-blue-900 p-2 rounded-full hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedSection === 'all' 
                ? 'Get started by adding your first student.'
                : `No students found in section ${selectedSection}.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Student Modal */}
      {(showAddModal || editingStudent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingStudent ? handleEditStudent : handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter student's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter roll number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter college email address"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be used for student login
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter section (e.g., CSE-A, CSE-B)"
                />
              </div>

              {!editingStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Password
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Default password for student"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Student will be required to change this password on first login
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
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
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingStudent ? 'Update' : 'Add'} Student</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;