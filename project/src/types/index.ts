export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'faculty' | 'student';
  rollNo?: string;
  section?: string;
  facultyId?: string;
  passwordChanged?: boolean;
}

export interface Student {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  section: string;
  facultyId: string;
  passwordChanged: boolean;
  experimentsCompleted: string[];
  vivaScores: { [experimentId: string]: number };
}

export interface Experiment {
  id: string;
  title: string;
  description: string;
  manualLink: string;
  facultyId: string;
  createdAt: Date;
}

export interface VivaQuestion {
  id: string;
  experimentId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  facultyId: string;
}

export interface StudentSubmission {
  id: string;
  studentId: string;
  experimentId: string;
  submissionLink: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  approvedAt?: Date;
}

export interface VivaAttempt {
  id: string;
  studentId: string;
  experimentId: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
  answers: number[];
}