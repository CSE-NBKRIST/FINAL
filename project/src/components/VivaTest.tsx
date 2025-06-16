import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Check, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VivaQuestion, VivaAttempt, Experiment } from '../types';

interface VivaTestProps {
  experimentId: string;
  onComplete: () => void;
  onCancel: () => void;
}

const VivaTest: React.FC<VivaTestProps> = ({ experimentId, onComplete, onCancel }) => {
  const { userProfile } = useAuth();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [questions, setQuestions] = useState<VivaQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    fetchExperimentAndQuestions();
  }, [experimentId]);

  useEffect(() => {
    if (hasStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [hasStarted, timeLeft]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (hasStarted && !document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 3000);
          } else if (newCount >= 2) {
            handleAutoSubmit();
          }
          return newCount;
        });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasStarted) {
        // Prevent common shortcuts that could be used to cheat
        if (
          e.key === 'F12' ||
          (e.ctrlKey && (e.key === 'I' || e.key === 'J' || e.key === 'U')) ||
          (e.ctrlKey && e.shiftKey && e.key === 'I')
        ) {
          e.preventDefault();
          setTabSwitchCount(prev => prev + 1);
        }
      }
    };

    if (hasStarted) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted]);

  const fetchExperimentAndQuestions = async () => {
    try {
      // Fetch experiment details
      const experimentsQuery = query(
        collection(db, 'experiments'),
        where('id', '==', experimentId)
      );
      const experimentsSnapshot = await getDocs(experimentsQuery);
      if (!experimentsSnapshot.empty) {
        const experimentData = {
          id: experimentsSnapshot.docs[0].id,
          ...experimentsSnapshot.docs[0].data(),
          createdAt: experimentsSnapshot.docs[0].data().createdAt?.toDate() || new Date()
        } as Experiment;
        setExperiment(experimentData);
      }

      // Fetch viva questions
      const questionsQuery = query(
        collection(db, 'vivaQuestions'),
        where('experimentId', '==', experimentId)
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionsData = questionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VivaQuestion[];

      setQuestions(questionsData);
      setAnswers(new Array(questionsData.length).fill(-1));
      setTimeLeft(questionsData.length * 60); // 60 seconds per question
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleStartTest = () => {
    setHasStarted(true);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmitTest = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Calculate score
      let score = 0;
      answers.forEach((answer, index) => {
        if (answer === questions[index].correctAnswer) {
          score++;
        }
      });

      // Save attempt to Firestore
      await addDoc(collection(db, 'vivaAttempts'), {
        studentId: userProfile!.uid,
        experimentId: experimentId,
        score: score,
        totalQuestions: questions.length,
        completedAt: new Date(),
        answers: answers
      });

      alert(`Test completed! Your score: ${score}/${questions.length}`);
      onComplete();
    } catch (error: any) {
      console.error('Error submitting test:', error);
      alert(`Error submitting test: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    if (!isSubmitting) {
      alert('Test auto-submitted due to time limit or tab switching violations.');
      handleSubmitTest();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!hasStarted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-100 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Viva Test: {experiment?.title}
            </h2>
            <p className="text-gray-600">
              You are about to start the viva test for this experiment.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Important Instructions:</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Total Questions: {questions.length}</li>
                  <li>• Time Limit: {questions.length} minutes ({questions.length} × 60 seconds)</li>
                  <li>• Each correct answer carries 1 mark</li>
                  <li>• Do not switch tabs or windows during the test</li>
                  <li>• After 1st tab switch, you will get a warning</li>
                  <li>• After 2nd tab switch, the test will be auto-submitted</li>
                  <li>• Do not use browser developer tools</li>
                  <li>• Once started, you cannot pause the test</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartTest}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Clock className="h-5 w-5" />
              <span>Start Test</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-red-600 text-white p-4 text-center font-semibold animate-pulse">
          <AlertTriangle className="inline h-5 w-5 mr-2" />
          WARNING: Tab switching detected! One more violation will auto-submit the test.
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Viva Test: {experiment?.title}
            </h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span>Tab Switches: {tabSwitchCount}/2</span>
            </div>
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              timeLeft <= 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 bg-gray-50 p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  Question {currentQuestionIndex + 1}
                </span>
                <span className="text-sm text-gray-500">1 Mark</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {currentQuestion?.question}
              </h2>
            </div>

            <div className="space-y-3 mb-8">
              {currentQuestion?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    answers[currentQuestionIndex] === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-25'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      answers[currentQuestionIndex] === index
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {answers[currentQuestionIndex] === index && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className="font-medium text-gray-700">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-gray-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{answers.filter(a => a !== -1).length}/{questions.length} answered</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex space-x-2">
                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitTest}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Submit Test</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VivaTest;