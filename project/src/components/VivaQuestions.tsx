import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MessageSquare, Check, X, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VivaQuestion, Experiment } from '../types';

const VivaQuestions: React.FC = () => {
  const { userProfile } = useAuth();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [vivaQuestions, setVivaQuestions] = useState<VivaQuestion[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<VivaQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0
  });

  useEffect(() => {
    fetchExperiments();
  }, [userProfile]);

  useEffect(() => {
    if (selectedExperiment) {
      fetchVivaQuestions();
    }
  }, [selectedExperiment]);

  const fetchExperiments = async () => {
    if (!userProfile) return;

    try {
      const q = query(
        collection(db, 'experiments'),
        where('facultyId', '==', userProfile.uid)
      );
      const querySnapshot = await getDocs(q);
      const experimentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Experiment[];

      setExperiments(experimentsData);
      if (experimentsData.length > 0 && !selectedExperiment) {
        setSelectedExperiment(experimentsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching experiments:', error);
    }
  };

  const fetchVivaQuestions = async () => {
    if (!selectedExperiment) return;

    try {
      const q = query(
        collection(db, 'vivaQuestions'),
        where('experimentId', '==', selectedExperiment),
        where('facultyId', '==', userProfile!.uid)
      );
      const querySnapshot = await getDocs(q);
      const questionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VivaQuestion[];

      setVivaQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching viva questions:', error);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExperiment) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'vivaQuestions'), {
        experimentId: selectedExperiment,
        question: formData.question,
        options: formData.options,
        correctAnswer: formData.correctAnswer,
        facultyId: userProfile!.uid
      });

      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      });
      setShowAddModal(false);
      fetchVivaQuestions();
      alert('Viva question added successfully!');
    } catch (error: any) {
      console.error('Error adding viva question:', error);
      alert(`Error adding viva question: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'vivaQuestions', editingQuestion.id), {
        question: formData.question,
        options: formData.options,
        correctAnswer: formData.correctAnswer
      });

      setEditingQuestion(null);
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      });
      fetchVivaQuestions();
      alert('Viva question updated successfully!');
    } catch (error: any) {
      console.error('Error updating viva question:', error);
      alert(`Error updating viva question: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this viva question?')) return;

    try {
      await deleteDoc(doc(db, 'vivaQuestions', questionId));
      fetchVivaQuestions();
      alert('Viva question deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting viva question:', error);
      alert(`Error deleting viva question: ${error.message}`);
    }
  };

  const openEditModal = (question: VivaQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingQuestion(null);
    setFormData({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const selectedExperimentData = experiments.find(exp => exp.id === selectedExperiment);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Viva Questions Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedExperiment}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Experiment Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-4 mb-4">
          <BookOpen className="h-6 w-6 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Select Experiment</h2>
        </div>
        
        {experiments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {experiments.map((experiment) => (
              <button
                key={experiment.id}
                onClick={() => setSelectedExperiment(experiment.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedExperiment === experiment.id
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-25'
                }`}
              >
                <h3 className="font-medium text-gray-900 mb-2">{experiment.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{experiment.description}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-purple-600">
                    {vivaQuestions.filter(q => q.experimentId === experiment.id).length} Questions
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No experiments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please add experiments first before creating viva questions.
            </p>
          </div>
        )}
      </div>

      {/* Viva Questions List */}
      {selectedExperiment && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Viva Questions for: {selectedExperimentData?.title}
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Time: {vivaQuestions.length} × 60 seconds = {vivaQuestions.length} minutes</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {vivaQuestions.map((question, index) => (
              <div key={question.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        Q{index + 1}
                      </span>
                      <span className="text-sm text-gray-500">1 Mark</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      {question.question}
                    </h3>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => openEditModal(question)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded-lg border-2 ${
                        optionIndex === question.correctAnswer
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          optionIndex === question.correctAnswer ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span className={`${
                          optionIndex === question.correctAnswer ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {option}
                        </span>
                        {optionIndex === question.correctAnswer && (
                          <Check className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {vivaQuestions.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No viva questions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add your first viva question for this experiment.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Question Modal */}
      {(showAddModal || editingQuestion) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingQuestion ? 'Edit Viva Question' : 'Add New Viva Question'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingQuestion ? handleEditQuestion : handleAddQuestion} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter the viva question"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Options
                </label>
                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={formData.correctAnswer === index}
                        onChange={() => setFormData({ ...formData, correctAnswer: index })}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="font-medium text-gray-700 w-8">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <input
                        type="text"
                        required
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select the correct answer by clicking the radio button next to it.
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
                      <span>{editingQuestion ? 'Update' : 'Add'} Question</span>
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

export default VivaQuestions;