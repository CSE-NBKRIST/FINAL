import React, { useState, useEffect } from 'react';
import { Check, X, ExternalLink, Eye, FileText, Calendar, User, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentSubmission, Student, Experiment } from '../types';

const Submissions: React.FC = () => {
  const { userProfile } = useAuth();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    if (!userProfile) return;

    try {
      // Fetch all students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentsData = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentsData);

      // Fetch experiments created by this faculty
      const experimentsQuery = query(
        collection(db, 'experiments'),
        where('facultyId', '==', userProfile.uid)
      );
      const experimentsSnapshot = await getDocs(experimentsQuery);
      const experimentsData = experimentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Experiment[];
      setExperiments(experimentsData);

      const experimentIds = experimentsData.map(exp => exp.id);

      // Fetch all submissions
      const submissionsSnapshot = await getDocs(
        query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'))
      );
      const submissionsData = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate() || new Date(),
        approvedAt: doc.data().approvedAt?.toDate()
      })) as StudentSubmission[];

      // Filter submissions to only include those for this faculty's experiments
      const facultySubmissions = submissionsData.filter(sub =>
        experimentIds.includes(sub.experimentId)
      );

      setSubmissions(facultySubmissions);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSubmissionAction = async (submissionId: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        status: action === 'approve' ? 'approved' : 'rejected',
        approvedAt: action === 'approve' ? new Date() : null
      });

      fetchData();
      alert(`Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (error: any) {
      console.error(`Error ${action}ing submission:`, error);
      alert(`Error ${action}ing submission: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  const getStudentRollNo = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.rollNo : 'Unknown';
  };

  const getExperimentTitle = (experimentId: string) => {
    const experiment = experiments.find(e => e.id === experimentId);
    return experiment ? experiment.title : 'Unknown Experiment';
  };

  const openSubmissionLink = (link: string) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (filter === 'all') return true;
    return submission.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Student Submissions</h1>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Submissions</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Total Submissions" count={submissions.length} icon={<FileText className="h-6 w-6 text-blue-600" />} bg="bg-blue-100" />
        <StatsCard title="Pending Review" count={submissions.filter(s => s.status === 'pending').length} icon={<Clock className="h-6 w-6 text-yellow-600" />} bg="bg-yellow-100" />
        <StatsCard title="Approved" count={submissions.filter(s => s.status === 'approved').length} icon={<Check className="h-6 w-6 text-green-600" />} bg="bg-green-100" />
        <StatsCard title="Rejected" count={submissions.filter(s => s.status === 'rejected').length} icon={<X className="h-6 w-6 text-red-600" />} bg="bg-red-100" />
      </div>

      {/* Submission List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="divide-y divide-gray-200">
          {filteredSubmissions.map((submission) => (
            <div key={submission.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">
                        {getStudentName(submission.studentId)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      Roll No: {getStudentRollNo(submission.studentId)}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {getExperimentTitle(submission.experimentId)}
                  </h3>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Submitted: {submission.submittedAt.toLocaleDateString()}</span>
                    </div>
                    {submission.approvedAt && (
                      <div className="flex items-center space-x-1">
                        <Check className="h-4 w-4" />
                        <span>Approved: {submission.approvedAt.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
                      {getStatusIcon(submission.status)}
                      <span className="capitalize">{submission.status}</span>
                    </span>
                    <button
                      onClick={() => openSubmissionLink(submission.submissionLink)}
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Submission</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {submission.status === 'pending' && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleSubmissionAction(submission.id, 'approve')}
                      disabled={loading}
                      className="inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="h-4 w-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleSubmissionAction(submission.id, 'reject')}
                      disabled={loading}
                      className="inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all'
                ? 'No student submissions have been received yet.'
                : `No ${filter} submissions found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable StatsCard Component
const StatsCard = ({ title, count, icon, bg }: { title: string; count: number; icon: React.ReactNode; bg: string }) => (
  <div className="bg-white rounded-xl shadow-sm border p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{count}</p>
      </div>
      <div className={`p-3 rounded-full ${bg}`}>{icon}</div>
    </div>
  </div>
);

export default Submissions;
