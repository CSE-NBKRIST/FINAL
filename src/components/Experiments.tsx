import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, BookOpen, ExternalLink, Upload, Check, X, Clock, FileText, Play, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Experiment, StudentSubmission } from '../types';
import VivaTest from './VivaTest';

const Experiments: React.FC = () => {
  const { userProfile } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [vivaAttempts, setVivaAttempts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState<Experiment | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState<Experiment | null>(null);
  const [showVivaTest, setShowVivaTest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    manualLink: ''
  });
  const [submissionLink, setSubmissionLink] = useState('');

  useEffect(() => {
    fetchExperiments();
    if (userProfile?.role === 'student') {
      fetchSubmissions();
      fetchVivaAttempts();
    }
  }, [userProfile]);

  const fetchExperiments = async () => {
    if (!userProfile) return;

    try {
      let q;
      if (userProfile.role === 'faculty') {
        q = query(
          collection(db, 'experiments'),
          where('facultyId', '==', userProfile.uid)
        );
      } else {
        // For students, fetch experiments from their faculty
        q = query(
          collection(db, 'experiments'),
          where('facultyId', '==', userProfile.facultyId)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const experimentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Experiment[];

      setExperiments(experimentsData);
    } catch (error) {
      console.error('Error fetching experiments:', error);
    }
  };

  const fetchSubmissions = async () => {
    if (!userProfile || userProfile.role !== 'student') return;

    try {
      const q = query(
        collection(db, 'submissions'),
        where('studentId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const submissionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        approvedAt: doc.data().approvedAt?.toDate()
      })) as StudentSubmission[];

      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const fetchVivaAttempts = async () => {
    if (!userProfile || userProfile.role !== 'student') return;

    try {
      const q = query(
        collection(db, 'vivaAttempts'),
        where('studentId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const vivaAttemptsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate() || new Date()
      }));

      setVivaAttempts(vivaAttemptsData);
    } catch (error) {
      console.error('Error fetching viva attempts:', error);
    }
  };

  const handleAddExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, 'experiments'), {
        title: formData.title,
        description: formData.description,
        manualLink: formData.manualLink,
        facultyId: userProfile!.uid,
        createdAt: new Date()
      });

      setFormData({ title: '', description: '', manualLink: '' });
      setShowAddModal(false);
      fetchExperiments();
      alert('Experiment added successfully!');
    } catch (error: any) {
      console.error('Error adding experiment:', error);
      alert(`Error adding experiment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExperiment) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'experiments', editingExperiment.id), {
        title: formData.title,
        description: formData.description,
        manualLink: formData.manualLink
      });

      setEditingExperiment(null);
      setFormData({ title: '', description: '', manualLink: '' });
      fetchExperiments();
      alert('Experiment updated successfully!');
    } catch (error: any) {
      console.error('Error updating experiment:', error);
      alert(`Error updating experiment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExperiment = async (experimentId: string) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;

    try {
      await deleteDoc(doc(db, 'experiments', experimentId));
      fetchExperiments();
      alert('Experiment deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting experiment:', error);
      alert(`Error deleting experiment: ${error.message}`);
    }
  };

  const handleSubmitExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSubmissionModal || !submissionLink.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'submissions'), {
        studentId: userProfile!.uid,
        experimentId: showSubmissionModal.id,
        submissionLink: submissionLink.trim(),
        status: 'pending',
        submittedAt: new Date()
      });

      setSubmissionLink('');
      setShowSubmissionModal(null);
      fetchSubmissions();
      alert('Submission sent successfully! Wait for faculty approval.');
    } catch (error: any) {
      console.error('Error submitting experiment:', error);
      alert(`Error submitting experiment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (experiment: Experiment) => {
    setEditingExperiment(experiment);
    setFormData({
      title: experiment.title,
      description: experiment.description,
      manualLink: experiment.manualLink
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingExperiment(null);
    setShowSubmissionModal(null);
    setFormData({ title: '', description: '', manualLink: '' });
    setSubmissionLink('');
  };

  const getSubmissionStatus = (experimentId: string) => {
    return submissions.find(sub => sub.experimentId === experimentId);
  };

  const hasVivaAttempt = (experimentId: string) => {
    return vivaAttempts.some(attempt => attempt.experimentId === experimentId);
  };

  const openManualLink = (link: string) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVivaComplete = () => {
    setShowVivaTest(null);
    // Refresh data to show updated scores
    fetchSubmissions();
    fetchVivaAttempts();
  };

  if (showVivaTest) {
    return (
      <VivaTest
        experimentId={showVivaTest}
        onComplete={handleVivaComplete}
        onCancel={() => setShowVivaTest(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {userProfile?.role === 'faculty' ? 'Experiments Management' : 'Experiments'}
        </h1>
        {userProfile?.role === 'faculty' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Experiment</span>
          </button>
        )}
      </div>

      {/* Experiments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experiments.map((experiment) => {
          const submission = userProfile?.role === 'student' ? getSubmissionStatus(experiment.id) : null;
          const hasAttemptedViva = userProfile?.role === 'student' ? hasVivaAttempt(experiment.id) : false;
          
          return (
            <div key={experiment.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{experiment.title}</h3>
                      <p className="text-sm text-gray-600">
                        Created {experiment.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {userProfile?.role === 'faculty' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(experiment)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExperiment(experiment.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">{experiment.description}</p>

                <div className="space-y-3">
                  {/* Manual Link */}
                  <button
                    onClick={() => openManualLink(experiment.manualLink)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Manual</span>
                  </button>

                  {/* Student Actions */}
                  {userProfile?.role === 'student' && (
                    <div className="space-y-2">
                      {submission ? (
                        <div className={`p-3 rounded-lg flex items-center justify-between ${
                          submission.status === 'approved' ? 'bg-green-50 border border-green-200' :
                          submission.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                          'bg-yellow-50 border border-yellow-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            {submission.status === 'approved' ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : submission.status === 'rejected' ? (
                              <X className="h-5 w-5 text-red-600" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-600" />
                            )}
                            <span className={`text-sm font-medium ${
                              submission.status === 'approved' ? 'text-green-800' :
                              submission.status === 'rejected' ? 'text-red-800' :
                              'text-yellow-800'
                            }`}>
                              {submission.status === 'approved' ? 'Approved' :
                               submission.status === 'rejected' ? 'Rejected' :
                               'Pending Review'}
                            </span>
                          </div>
                          {submission.status === 'approved' && (
                            hasAttemptedViva ? (
                              <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
                                <CheckCircle className="h-4 w-4" />
                                <span>Viva Completed</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowVivaTest(experiment.id)}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                <Play className="h-4 w-4" />
                                <span>Take Viva</span>
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowSubmissionModal(experiment)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Submit Experiment</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {experiments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No experiments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {userProfile?.role === 'faculty' 
              ? 'Get started by adding your first experiment.'
              : 'No experiments have been added by your faculty yet.'
            }
          </p>
        </div>
      )}

      {/* Add/Edit Experiment Modal */}
      {(showAddModal || editingExperiment) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingExperiment ? 'Edit Experiment' : 'Add New Experiment'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingExperiment ? handleEditExperiment : handleAddExperiment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiment Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter experiment title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter experiment description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manual Google Drive Link
                </label>
                <input
                  type="url"
                  required
                  value={formData.manualLink}
                  onChange={(e) => setFormData({ ...formData, manualLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://drive.google.com/..."
                />
              </div>

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
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingExperiment ? 'Update' : 'Add'} Experiment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Submission Modal */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Submit Experiment: {showSubmissionModal.title}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitExperiment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Drive Link (PDF)
                </label>
                <input
                  type="url"
                  required
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload your experiment execution PDF to Google Drive and share the link here.
                </p>
              </div>

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
                  disabled={loading || !submissionLink.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Submit</span>
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

export default Experiments;